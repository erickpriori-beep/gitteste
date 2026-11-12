const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleApi, checkDatabaseConnection } = require('./api');

const PORT = Number(process.env.PORT || 80);
const ROOT = __dirname;
const MAX_BODY_SIZE = 16 * 1024;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function enviarJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.setEncoding('utf8');
    req.on('data', parte => {
      corpo += parte;
      if (Buffer.byteLength(corpo) > MAX_BODY_SIZE) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(corpo));
    req.on('error', reject);
  });
}

function compararSeguramente(valorInformado, valorEsperado) {
  const informado = Buffer.from(valorInformado);
  const esperado = Buffer.from(valorEsperado);
  return informado.length === esperado.length &&
    crypto.timingSafeEqual(informado, esperado);
}

async function validarAcessoAdministrativo(req, res) {
  let dados;
  try {
    dados = JSON.parse(await lerCorpo(req));
  } catch (erro) {
    enviarJson(res, erro.message === 'payload_too_large' ? 413 : 400, {
      ok: false,
      message: 'Requisição inválida.'
    });
    return;
  }

  const perfil = dados?.perfil;
  const senha = typeof dados?.senha === 'string' ? dados.senha : '';
  const senhaConfigurada = perfil === 'diretor'
    ? process.env.DIRETOR_LOGIN_SECRET
    : perfil === 'programador'
      ? process.env.PROGRAMADOR_LOGIN_SECRET
      : null;

  if (!senhaConfigurada) {
    enviarJson(res, 503, {
      ok: false,
      message: 'A senha administrativa ainda não foi configurada.'
    });
    return;
  }

  if (!senha || !compararSeguramente(senha, senhaConfigurada)) {
    enviarJson(res, 401, {
      ok: false,
      message: 'Senha secreta inválida.'
    });
    return;
  }

  enviarJson(res, 200, { ok: true });
}

function servirArquivo(req, res, pathname) {
  const arquivoSolicitado = pathname === '/' ? 'index.html' : pathname.slice(1);
  const arquivo = path.resolve(ROOT, arquivoSolicitado);
  if (arquivo !== ROOT && !arquivo.startsWith(`${ROOT}${path.sep}`)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  fs.stat(arquivo, (erro, info) => {
    if (erro || !info.isFile()) {
      res.writeHead(404);
      res.end('Não encontrado');
      return;
    }

    const tipo = mimeTypes[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': tipo,
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(arquivo).pipe(res);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/role-access') {
    await validarAcessoAdministrativo(req, res);
    return;
  }

  if (await handleApi(req, res, url)) return;

  if (req.method === 'GET' || req.method === 'HEAD') {
    servirArquivo(req, res, decodeURIComponent(url.pathname));
    return;
  }

  enviarJson(res, 405, { ok: false, message: 'Método não permitido.' });
});

async function iniciarServidor() {
  await checkDatabaseConnection();
  servidor.listen(PORT, '0.0.0.0', () => {
    console.log(`educa+ com API e banco compartilhado disponível na porta ${PORT}`);
  });
}

iniciarServidor().catch(erro => {
  console.error('Não foi possível iniciar o servidor com o banco de dados.');
  console.error(erro.message);
  process.exitCode = 1;
});