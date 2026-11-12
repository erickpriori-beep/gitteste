const crypto = require('crypto');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('A conexão do banco de dados não está configurada.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SESSION_COOKIE = 'educa_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_ROLES = new Set(['aluno', 'professor', 'diretor', 'programador']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function apiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > limit) {
        reject(apiError(413, 'payload_too_large', 'A solicitação é muito grande.'));
        req.resume();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(apiError(400, 'invalid_json', 'O conteúdo da solicitação é inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeIdentifier(body) {
  const role = body.role;
  const method = role === 'aluno' ? 'email' : body.loginMethod;
  const raw = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  if (!raw || raw.length > 254) {
    throw apiError(400, 'invalid_identifier', 'Informe um e-mail ou usuário válido.');
  }

  if (method === 'email') {
    const email = raw.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw apiError(400, 'invalid_email', 'Digite um e-mail válido.');
    }
    return { method, identifier: email, email, username: null };
  }

  if (method === 'username' && role !== 'aluno') {
    const username = raw.toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      throw apiError(400, 'invalid_username', 'O usuário deve ter 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
    }
    return { method, identifier: username, email: null, username };
  }

  throw apiError(400, 'invalid_login_method', 'Escolha e-mail ou usuário para entrar.');
}

function getAdminSecret(role) {
  if (role === 'diretor') return process.env.DIRETOR_LOGIN_SECRET || '';
  if (role === 'programador') return process.env.PROGRAMADOR_LOGIN_SECRET || '';
  return '';
}

function equalSecret(informed, expected) {
  if (!informed || !expected) return false;
  const left = Buffer.from(informed);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length > 0 &&
    expected.length === actual.length &&
    crypto.timingSafeEqual(actual, expected);
}

function getCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function sessionCookie(token, req, clear = false) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = forwardedProto === 'https' || Boolean(req.socket.encrypted);
  return [
    `${SESSION_COOKIE}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    ...(secure ? ['Secure'] : []),
    clear ? 'Max-Age=0' : `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`
  ].join('; ');
}

async function getSessionAccount(req) {
  const token = getCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await pool.query(
    `SELECT a.id, a.email, a.username, a.role, a.active, a.created_at
     FROM app_sessions s
     JOIN app_accounts a ON a.id = s.account_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.active = TRUE`,
    [tokenHash]
  );
  if (!result.rowCount) return null;
  return result.rows[0];
}

function publicAccount(account) {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    identifier: account.email || account.username,
    role: account.role,
    active: account.active,
    createdAt: account.created_at
  };
}

async function createSession(accountId, req, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query(
    `INSERT INTO app_sessions (token_hash, account_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [tokenHash, accountId]
  );
  res.setHeader('Set-Cookie', sessionCookie(token, req));
}

async function findAccount(identity, role) {
  const column = identity.method === 'email' ? 'email' : 'username';
  const result = await pool.query(
    `SELECT id, email, username, role, password_hash, active, created_at
     FROM app_accounts WHERE ${column} = $1`,
    [identity.identifier]
  );
  if (!result.rowCount) return null;
  const account = result.rows[0];
  if (account.role !== role) {
    throw apiError(401, 'role_mismatch', 'Este acesso está vinculado a outro perfil.');
  }
  return account;
}

async function createAccount(client, identity, role, passwordHash) {
  const result = await client.query(
    `INSERT INTO app_accounts (email, username, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, username, role, active, created_at`,
    [identity.email, identity.username, role, passwordHash]
  );
  return result.rows[0];
}

async function handleRegister(req, res) {
  const body = await readJson(req);
  const role = body.role;
  if (!VALID_ROLES.has(role)) {
    throw apiError(400, 'invalid_role', 'Perfil de conta inválido.');
  }
  const identity = normalizeIdentifier(body);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 256) {
    throw apiError(400, 'invalid_password', 'Informe uma senha válida.');
  }

  let passwordHash = null;
  if (role === 'diretor' || role === 'programador') {
    if (!getAdminSecret(role)) {
      throw apiError(503, 'admin_not_configured', 'A senha administrativa ainda não foi configurada.');
    }
    if (!equalSecret(password, getAdminSecret(role))) {
      throw apiError(401, 'invalid_admin_secret', 'Senha secreta inválida.');
    }
  } else {
    const minimumLength = body.legacyImport === true ? 1 : 8;
    if (password.length < minimumLength) {
      throw apiError(400, 'weak_password', 'Use uma senha com pelo menos 8 caracteres.');
    }
    passwordHash = hashPassword(password);
  }

  const joinCode = typeof body.joinCode === 'string'
    ? body.joinCode.trim().toUpperCase()
    : '';
  if (joinCode && role !== 'aluno') {
    throw apiError(400, 'invalid_join_code', 'Somente alunos podem entrar usando código de turma.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let classId = null;
    if (joinCode) {
      const classroom = await client.query(
        'SELECT id FROM classrooms WHERE join_code = $1',
        [joinCode]
      );
      if (!classroom.rowCount) {
        throw apiError(404, 'class_not_found', 'Código de turma não encontrado.');
      }
      classId = classroom.rows[0].id;
    }

    const account = await createAccount(client, identity, role, passwordHash);
    if (classId) {
      await client.query(
        `INSERT INTO classroom_memberships (classroom_id, student_id)
         VALUES ($1, $2)`,
        [classId, account.id]
      );
    }
    await client.query('COMMIT');
    await createSession(account.id, req, res);
    sendJson(res, 201, { ok: true, account: publicAccount(account) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function handleLogin(req, res) {
  const body = await readJson(req);
  const role = body.role;
  if (!VALID_ROLES.has(role)) {
    throw apiError(400, 'invalid_role', 'Perfil de conta inválido.');
  }
  const identity = normalizeIdentifier(body);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) throw apiError(400, 'invalid_password', 'Informe sua senha.');

  const isAdmin = role === 'diretor' || role === 'programador';
  let account;
  if (isAdmin) {
    const secret = getAdminSecret(role);
    if (!secret) {
      throw apiError(503, 'admin_not_configured', 'A senha administrativa ainda não foi configurada.');
    }
    if (!equalSecret(password, secret)) {
      throw apiError(401, 'invalid_credentials', 'Usuário ou senha incorretos.');
    }
    account = await findAccount(identity, role);
    if (!account) {
      const client = await pool.connect();
      try {
        account = await createAccount(client, identity, role, null);
      } catch (error) {
        if (error.code === '23505') {
          throw apiError(409, 'identifier_in_use', 'Este e-mail ou usuário já está cadastrado.');
        }
        throw error;
      } finally {
        client.release();
      }
    }
  } else {
    account = await findAccount(identity, role);
    if (!account) {
      throw apiError(404, 'account_not_found', 'Conta não encontrada.');
    }
    if (!account.active || !verifyPassword(password, account.password_hash)) {
      throw apiError(401, 'invalid_credentials', 'Usuário ou senha incorretos.');
    }
  }

  if (!account.active) throw apiError(403, 'account_inactive', 'Esta conta está desativada.');
  await createSession(account.id, req, res);
  sendJson(res, 200, { ok: true, account: publicAccount(account) });
}

async function handleLogout(req, res) {
  const token = getCookies(req)[SESSION_COOKIE];
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [tokenHash]);
  }
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', req, true) });
}

async function handleAccounts(req, res, account) {
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/accounts') {
    if (!['programador', 'diretor', 'professor'].includes(account.role)) {
      throw apiError(403, 'forbidden', 'Sem permissão para consultar contas.');
    }
    let filter = '';
    const params = [];
    if (account.role === 'professor') {
      filter = `WHERE a.role = 'aluno' AND EXISTS (
        SELECT 1 FROM classroom_memberships cm
        JOIN classrooms owned ON owned.id = cm.classroom_id
        WHERE cm.student_id = a.id AND owned.teacher_id = $1
      )`;
      params.push(account.id);
    }
    const result = await pool.query(
      `SELECT a.id, a.email, a.username, a.role, a.active, a.created_at,
              COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.id IS NOT NULL), '{}') AS classes
       FROM app_accounts a
       LEFT JOIN classroom_memberships cm ON cm.student_id = a.id
       LEFT JOIN classrooms c ON c.id = cm.classroom_id
       ${filter}
       GROUP BY a.id
       ORDER BY a.role, COALESCE(a.email, a.username)`,
      params
    );
    sendJson(res, 200, { ok: true, accounts: result.rows.map(publicAccountWithClasses) });
    return true;
  }

  const match = req.url.match(/^\/api\/accounts\/([0-9a-f-]+)$/i);
  if (!match) return false;
  const accountId = match[1];
  if (!UUID_PATTERN.test(accountId)) throw apiError(400, 'invalid_account_id', 'Conta inválida.');

  if (req.method === 'PATCH') {
    if (account.role !== 'programador') {
      throw apiError(403, 'forbidden', 'Somente o Programador pode administrar contas.');
    }
    if (accountId === account.id) {
      throw apiError(400, 'self_update', 'Não é possível alterar o próprio perfil de administrador.');
    }
    const body = await readJson(req);
    const existingResult = await pool.query(
      'SELECT id, email, username, role, active FROM app_accounts WHERE id = $1',
      [accountId]
    );
    if (!existingResult.rowCount) throw apiError(404, 'account_not_found', 'Conta não encontrada.');
    const existing = existingResult.rows[0];
    const role = body.role === undefined ? existing.role : body.role;
    const email = body.email === undefined ? existing.email : normalizeOptionalEmail(body.email);
    const username = body.username === undefined ? existing.username : normalizeOptionalUsername(body.username);
    if (body.active !== undefined && typeof body.active !== 'boolean') {
      throw apiError(400, 'invalid_active_state', 'O estado da conta precisa ser ativo ou suspenso.');
    }
    const active = body.active === undefined ? existing.active : body.active;
    if (!VALID_ROLES.has(role)) throw apiError(400, 'invalid_role', 'Perfil inválido.');
    if (['diretor', 'programador'].includes(role) && role !== existing.role) {
      throw apiError(403, 'admin_role_requires_secret', 'Perfis administrativos precisam ser criados usando a senha secreta correspondente.');
    }
    if (role === 'aluno' && !email) {
      throw apiError(400, 'student_email_required', 'Alunos precisam de um e-mail cadastrado.');
    }
    if (!email && !username) throw apiError(400, 'identifier_required', 'A conta precisa manter um e-mail ou usuário.');
    if (existing.role === 'programador' && (role !== 'programador' || !active)) {
      const count = await pool.query(
        `SELECT COUNT(*)::int AS total FROM app_accounts
         WHERE role = 'programador' AND active = TRUE AND id <> $1`,
        [accountId]
      );
      if (count.rows[0].total === 0) {
        throw apiError(400, 'last_programmer', 'A plataforma precisa manter pelo menos um Programador ativo.');
      }
    }

    const updated = await pool.query(
      `UPDATE app_accounts
       SET email = $1, username = $2, role = $3, active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, username, role, active, created_at`,
      [email, username, role, active, accountId]
    );
    if (!active || role !== existing.role) {
      await pool.query('DELETE FROM app_sessions WHERE account_id = $1', [accountId]);
    }
    sendJson(res, 200, { ok: true, account: publicAccount(updated.rows[0]) });
    return true;
  }

  if (req.method === 'DELETE') {
    if (account.role !== 'programador') {
      throw apiError(403, 'forbidden', 'Somente o Programador pode excluir contas.');
    }
    if (accountId === account.id) {
      throw apiError(400, 'self_delete', 'Não é possível excluir a conta administrativa em uso.');
    }
    const target = await pool.query(
      'SELECT id, role FROM app_accounts WHERE id = $1',
      [accountId]
    );
    if (!target.rowCount) throw apiError(404, 'account_not_found', 'Conta não encontrada.');
    if (target.rows[0].role === 'programador') {
      const count = await pool.query(
        `SELECT COUNT(*)::int AS total FROM app_accounts
         WHERE role = 'programador' AND active = TRUE AND id <> $1`,
        [accountId]
      );
      if (count.rows[0].total === 0) {
        throw apiError(400, 'last_programmer', 'A plataforma precisa manter pelo menos um Programador ativo.');
      }
    }
    await pool.query('DELETE FROM app_accounts WHERE id = $1', [accountId]);
    sendJson(res, 200, { ok: true, deletedAccountId: accountId });
    return true;
  }

  return false;
}

function publicAccountWithClasses(account) {
  return {
    ...publicAccount(account),
    classes: account.classes || []
  };
}

function normalizeOptionalEmail(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw apiError(400, 'invalid_email', 'E-mail inválido.');
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw apiError(400, 'invalid_email', 'Digite um e-mail válido.');
  return email;
}

function normalizeOptionalUsername(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw apiError(400, 'invalid_username', 'Usuário inválido.');
  const username = value.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) throw apiError(400, 'invalid_username', 'Usuário inválido.');
  return username;
}

async function handleClasses(req, res, account, url) {
  if (req.method === 'GET' && url.pathname === '/api/classes') {
    const params = [account.id, account.role !== 'aluno', account.role !== 'aluno'];
    let filter;
    if (account.role === 'professor') {
      filter = 'WHERE c.teacher_id = $1';
    } else if (account.role === 'aluno') {
      filter = `WHERE EXISTS (
        SELECT 1 FROM classroom_memberships mine
        WHERE mine.classroom_id = c.id AND mine.student_id = $1
      )`;
    } else if (['diretor', 'programador'].includes(account.role)) {
      filter = '';
    } else {
      throw apiError(403, 'forbidden', 'Sem permissão para consultar turmas.');
    }

    const result = await pool.query(
      `SELECT c.id, c.name, c.created_by, c.teacher_id, c.created_at,
              CASE WHEN $3::boolean THEN c.join_code ELSE NULL END AS join_code,
              COALESCE(t.email, t.username) AS teacher_identifier,
              COUNT(DISTINCT m.student_id)::int AS member_count,
              CASE WHEN $2::boolean
                THEN COALESCE(
                  jsonb_agg(DISTINCT jsonb_build_object(
                    'id', s.id, 'email', s.email, 'username', s.username,
                    'identifier', COALESCE(s.email, s.username)
                  )) FILTER (WHERE s.id IS NOT NULL),
                  '[]'::jsonb
                )
                ELSE '[]'::jsonb
              END AS members
       FROM classrooms c
       LEFT JOIN app_accounts t ON t.id = c.teacher_id
       LEFT JOIN classroom_memberships m ON m.classroom_id = c.id
       LEFT JOIN app_accounts s ON s.id = m.student_id
       ${filter}
       GROUP BY c.id, t.email, t.username
       ORDER BY c.name`,
      params
    );
    sendJson(res, 200, { ok: true, classes: result.rows });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/classes') {
    if (!['professor', 'diretor', 'programador'].includes(account.role)) {
      throw apiError(403, 'forbidden', 'Somente a equipe pode criar turmas.');
    }
    const body = await readJson(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      throw apiError(400, 'invalid_class_name', 'O nome da turma deve ter de 2 a 80 caracteres.');
    }
    let teacherId = account.role === 'professor' ? account.id : null;
    if (account.role !== 'professor' && body.teacherId) {
      if (!UUID_PATTERN.test(String(body.teacherId))) {
        throw apiError(400, 'invalid_teacher', 'Professor não encontrado.');
      }
      const teacher = await pool.query(
        `SELECT id FROM app_accounts WHERE id = $1 AND role = 'professor' AND active = TRUE`,
        [body.teacherId]
      );
      if (!teacher.rowCount) throw apiError(400, 'invalid_teacher', 'Professor não encontrado.');
      teacherId = teacher.rows[0].id;
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      try {
        const created = await pool.query(
          `INSERT INTO classrooms (name, join_code, created_by, teacher_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, join_code, created_by, teacher_id, created_at`,
          [name, code, account.id, teacherId]
        );
        sendJson(res, 201, { ok: true, classroom: created.rows[0] });
        return true;
      } catch (error) {
        if (error.code !== '23505') throw error;
      }
    }
    throw apiError(500, 'class_code_generation_failed', 'Não foi possível gerar o código da turma.');
  }

  if (req.method === 'POST' && url.pathname === '/api/classes/join') {
    if (account.role !== 'aluno') throw apiError(403, 'student_only', 'Somente alunos podem entrar em uma turma.');
    const body = await readJson(req);
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!/^[A-F0-9]{10}$/.test(code)) throw apiError(400, 'invalid_join_code', 'Digite um código de turma válido.');
    const classroom = await pool.query('SELECT id FROM classrooms WHERE join_code = $1', [code]);
    if (!classroom.rowCount) throw apiError(404, 'class_not_found', 'Código de turma não encontrado.');
    await pool.query(
      `INSERT INTO classroom_memberships (classroom_id, student_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [classroom.rows[0].id, account.id]
    );
    sendJson(res, 200, { ok: true, classroomId: classroom.rows[0].id });
    return true;
  }

  const transferMatch = url.pathname.match(/^\/api\/classes\/([0-9a-f-]+)\/transfer$/i);
  if (req.method === 'POST' && transferMatch) {
    if (!['professor', 'diretor', 'programador'].includes(account.role)) {
      throw apiError(403, 'forbidden', 'Sem permissão para transferir alunos.');
    }
    const sourceId = transferMatch[1];
    if (!UUID_PATTERN.test(sourceId)) throw apiError(400, 'invalid_class_id', 'Turma inválida.');
    const body = await readJson(req);
    const targetId = body.targetClassId;
    const studentId = body.studentId;
    if (!UUID_PATTERN.test(String(targetId || '')) || !UUID_PATTERN.test(String(studentId || ''))) {
      throw apiError(400, 'invalid_transfer', 'Selecione o aluno e a turma de destino.');
    }
    if (targetId === sourceId) {
      throw apiError(400, 'same_class', 'Escolha uma turma diferente da atual.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const classes = await client.query(
        'SELECT id, teacher_id FROM classrooms WHERE id = $1 OR id = $2 FOR UPDATE',
        [sourceId, targetId]
      );
      const source = classes.rows.find(item => item.id === sourceId);
      const target = classes.rows.find(item => item.id === targetId);
      if (!source || !target) throw apiError(404, 'class_not_found', 'Turma não encontrada.');
      if (account.role === 'professor' &&
          (source.teacher_id !== account.id || target.teacher_id !== account.id)) {
        throw apiError(403, 'forbidden', 'Você só pode transferir alunos entre suas próprias turmas.');
      }
      const student = await client.query(
        `SELECT id FROM app_accounts WHERE id = $1 AND role = 'aluno' AND active = TRUE`,
        [studentId]
      );
      if (!student.rowCount) throw apiError(404, 'student_not_found', 'Aluno não encontrado.');
      const membership = await client.query(
        `SELECT 1 FROM classroom_memberships WHERE classroom_id = $1 AND student_id = $2`,
        [sourceId, studentId]
      );
      if (!membership.rowCount) throw apiError(404, 'membership_not_found', 'O aluno não está nesta turma.');
      await client.query(
        `INSERT INTO classroom_memberships (classroom_id, student_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [targetId, studentId]
      );
      await client.query(
        'DELETE FROM classroom_memberships WHERE classroom_id = $1 AND student_id = $2',
        [sourceId, studentId]
      );
      await client.query('COMMIT');
      sendJson(res, 200, { ok: true });
      return true;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  const classMatch = url.pathname.match(/^\/api\/classes\/([0-9a-f-]+)$/i);
  if (!classMatch) return false;
  const classId = classMatch[1];
  if (!UUID_PATTERN.test(classId)) throw apiError(400, 'invalid_class_id', 'Turma inválida.');
  if (req.method !== 'PATCH' && req.method !== 'DELETE') return false;

  const found = await pool.query(
    'SELECT id, teacher_id FROM classrooms WHERE id = $1',
    [classId]
  );
  if (!found.rowCount) throw apiError(404, 'class_not_found', 'Turma não encontrada.');
  const classroom = found.rows[0];
  const isAdmin = ['diretor', 'programador'].includes(account.role);
  if (!isAdmin && !(account.role === 'professor' && classroom.teacher_id === account.id)) {
    throw apiError(403, 'forbidden', 'Você não administra esta turma.');
  }

  if (req.method === 'DELETE') {
    await pool.query('DELETE FROM classrooms WHERE id = $1', [classId]);
    sendJson(res, 200, { ok: true, deletedClassId: classId });
    return true;
  }

  const body = await readJson(req);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 80) {
    throw apiError(400, 'invalid_class_name', 'O nome da turma deve ter de 2 a 80 caracteres.');
  }
  let teacherId = classroom.teacher_id;
  if (isAdmin && Object.hasOwn(body, 'teacherId')) {
    teacherId = body.teacherId || null;
    if (teacherId) {
      if (!UUID_PATTERN.test(String(teacherId))) {
        throw apiError(400, 'invalid_teacher', 'Professor não encontrado.');
      }
      const teacher = await pool.query(
        `SELECT id FROM app_accounts WHERE id = $1 AND role = 'professor' AND active = TRUE`,
        [teacherId]
      );
      if (!teacher.rowCount) throw apiError(400, 'invalid_teacher', 'Professor não encontrado.');
    }
  }
  const updated = await pool.query(
    `UPDATE classrooms
     SET name = $1, teacher_id = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, join_code, created_by, teacher_id, created_at`,
    [name, teacherId, classId]
  );
  sendJson(res, 200, { ok: true, classroom: updated.rows[0] });
  return true;
}

function validarPontuacaoQuestoes(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8) {
    throw apiError(400, 'invalid_questions', 'Informe de 1 a 8 questões com seus valores.');
  }
  let possibleCents = 0;
  let earnedCents = 0;
  const questionScores = input.map((item, index) => {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const possible = Number(item?.possible);
    const earned = Number(item?.earned);
    if (!title || title.length > 180 ||
        !Number.isFinite(possible) || possible <= 0 ||
        !Number.isFinite(earned) || earned < 0 || earned > possible ||
        Math.abs(possible * 100 - Math.round(possible * 100)) > 1e-8 ||
        Math.abs(earned * 100 - Math.round(earned * 100)) > 1e-8) {
      throw apiError(400, 'invalid_question_score', `Confira o enunciado e os pontos da questão ${index + 1}.`);
    }
    possibleCents += Math.round(possible * 100);
    earnedCents += Math.round(earned * 100);
    return { title, possible, earned };
  });
  return {
    questionScores,
    possiblePoints: possibleCents / 100,
    earnedPoints: earnedCents / 100
  };
}

async function handleGrades(req, res, account, url) {
  if (req.method === 'GET' && url.pathname === '/api/grades') {
    let filter = '';
    const params = [];
    if (account.role === 'professor') {
      filter = 'WHERE c.teacher_id = $1';
      params.push(account.id);
    } else if (account.role === 'aluno') {
      filter = 'WHERE g.student_id = $1';
      params.push(account.id);
    } else if (!['diretor', 'programador'].includes(account.role)) {
      throw apiError(403, 'forbidden', 'Sem permissão para consultar notas.');
    }
    const result = await pool.query(
      `SELECT g.id, g.classroom_id, g.student_id, g.teacher_id,
              g.activity_title, g.possible_points, g.earned_points,
              g.question_scores, g.created_at, g.updated_at,
              c.name AS class_name,
              COALESCE(s.email, s.username) AS student_identifier,
              COALESCE(t.email, t.username) AS teacher_identifier
       FROM activity_grades g
       JOIN classrooms c ON c.id = g.classroom_id
       JOIN app_accounts s ON s.id = g.student_id
       LEFT JOIN app_accounts t ON t.id = g.teacher_id
       ${filter}
       ORDER BY g.updated_at DESC`,
      params
    );
    sendJson(res, 200, { ok: true, grades: result.rows });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/grades') {
    if (!['professor', 'diretor', 'programador'].includes(account.role)) {
      throw apiError(403, 'forbidden', 'Somente a equipe pode atribuir notas.');
    }
    const body = await readJson(req);
    const classroomId = String(body.classroomId || '');
    const studentId = String(body.studentId || '');
    const title = typeof body.activityTitle === 'string' ? body.activityTitle.trim() : '';
    if (!UUID_PATTERN.test(classroomId) || !UUID_PATTERN.test(studentId)) {
      throw apiError(400, 'invalid_grade_target', 'Selecione a turma e o aluno.');
    }
    if (title.length < 2 || title.length > 120) {
      throw apiError(400, 'invalid_activity_title', 'O nome da atividade deve ter de 2 a 120 caracteres.');
    }
    const scores = validarPontuacaoQuestoes(body.questionScores);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const classroom = await client.query(
        'SELECT id, teacher_id FROM classrooms WHERE id = $1 FOR UPDATE',
        [classroomId]
      );
      if (!classroom.rowCount) throw apiError(404, 'class_not_found', 'Turma não encontrada.');
      if (account.role === 'professor' && classroom.rows[0].teacher_id !== account.id) {
        throw apiError(403, 'forbidden', 'Você só pode atribuir notas nas suas turmas.');
      }
      const membership = await client.query(
        `SELECT 1 FROM classroom_memberships cm
         JOIN app_accounts a ON a.id = cm.student_id
         WHERE cm.classroom_id = $1 AND cm.student_id = $2
           AND a.role = 'aluno' AND a.active = TRUE`,
        [classroomId, studentId]
      );
      if (!membership.rowCount) {
        throw apiError(400, 'student_not_in_class', 'O aluno precisa estar matriculado nesta turma.');
      }
      const saved = await client.query(
        `INSERT INTO activity_grades (
           classroom_id, student_id, teacher_id, activity_title,
           possible_points, earned_points, question_scores
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (classroom_id, student_id, activity_title)
         DO UPDATE SET
           teacher_id = EXCLUDED.teacher_id,
           possible_points = EXCLUDED.possible_points,
           earned_points = EXCLUDED.earned_points,
           question_scores = EXCLUDED.question_scores,
           updated_at = NOW()
         RETURNING id, classroom_id, student_id, activity_title,
                   possible_points, earned_points, question_scores, updated_at`,
        [
          classroomId,
          studentId,
          account.id,
          title,
          scores.possiblePoints,
          scores.earnedPoints,
          JSON.stringify(scores.questionScores)
        ]
      );
      await client.query('COMMIT');
      sendJson(res, 200, { ok: true, grade: saved.rows[0] });
      return true;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  return false;
}

function checkSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
    return originHost === requestHost;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  if (!url.pathname.startsWith('/api/')) return false;
  if (!['GET', 'POST', 'PATCH', 'DELETE', 'HEAD'].includes(req.method)) {
    sendJson(res, 405, { ok: false, message: 'Método não permitido.' });
    return true;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !checkSameOrigin(req)) {
    sendJson(res, 403, { ok: false, code: 'origin_mismatch', message: 'Origem da solicitação inválida.' });
    return true;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      await pool.query('SELECT 1');
      sendJson(res, 200, { ok: true });
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      await handleRegister(req, res);
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      await handleLogin(req, res);
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      await handleLogout(req, res);
      return true;
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const account = await getSessionAccount(req);
      if (!account) {
        sendJson(res, 200, { ok: true, account: null });
        return true;
      }
      sendJson(res, 200, { ok: true, account: publicAccount(account) });
      return true;
    }

    const account = await getSessionAccount(req);
    if (!account) {
      sendJson(res, 401, { ok: false, code: 'not_authenticated', message: 'Entre na sua conta para continuar.' });
      return true;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      await pool.query(
        'DELETE FROM app_sessions WHERE account_id = $1 AND expires_at <= NOW()',
        [account.id]
      );
    }

    if (await handleAccounts(req, res, account)) return true;
    if (await handleClasses(req, res, account, url)) return true;
    if (await handleGrades(req, res, account, url)) return true;
    sendJson(res, 404, { ok: false, code: 'not_found', message: 'Rota da API não encontrada.' });
    return true;
  } catch (error) {
    if (error.code === '23505') {
      sendJson(res, 409, { ok: false, code: 'identifier_in_use', message: 'Este e-mail ou usuário já está cadastrado.' });
      return true;
    }
    if (error.status) {
      sendJson(res, error.status, { ok: false, code: error.code, message: error.message });
      return true;
    }
    console.error('Falha na API educa+: ', error.message);
    sendJson(res, 500, { ok: false, code: 'internal_error', message: 'Não foi possível concluir a solicitação.' });
    return true;
  }
}

async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

module.exports = { handleApi, checkDatabaseConnection };
