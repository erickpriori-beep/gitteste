let modoLogin = true;
let perfilSelecionado = 'aluno'; // 'aluno', 'professor', 'diretor' ou 'programador'
let usuarioLogado = null;
let intervaloAgenda = null;

let questaoAtual = null;
let filaQuestoes = [];
let indiceAtual = 0;
let acertos = 0;
let materiaAtual = '';
let nivelAtual = '';
let jaAcertou = false;

// Estado da aba atual de atividades do aluno
let abaAtivaAluno = 'recentes';

// Simulação de Banco de Dados local para atividades criadas por professores
let bancoAtividadesCustomizadas = [];
// Armazena temporariamente as questões que o professor está montando no formulário (Máx 8)
let questoesFormularioProfessor = [];

const nomesPerfis = {
  aluno: 'Aluno',
  professor: 'Professor',
  diretor: 'Diretor',
  programador: 'Programador'
};

function perfilEmTexto(perfil) {
  return nomesPerfis[perfil] || nomesPerfis.aluno;
}

function lerAtividadesSalvas() {
  try {
    const atividades = JSON.parse(localStorage.getItem('educa-atividades') || '[]');
    return Array.isArray(atividades) ? atividades : [];
  } catch (erro) {
    console.warn('Não foi possível ler as atividades salvas.', erro);
    return [];
  }
}

function obterAlunosDisponiveis() {
  let usuarios = lerUsuariosSalvos();
  if (usuarios.length === 0) {
    try {
      const listaLegada = JSON.parse(localStorage.getItem('educa-lista-alunos') || '[]');
      usuarios = Array.isArray(listaLegada)
        ? listaLegada.map(email => ({ email, perfil: 'aluno' }))
        : [];
    } catch (erro) {
      usuarios = [];
    }
  }

  return usuarios
    .filter(usuario => usuario.perfil === 'aluno' && usuario.email)
    .map(usuario => usuario.email.toLowerCase())
    .filter((email, index, lista) => lista.indexOf(email) === index)
    .sort((a, b) => a.localeCompare(b));
}

function atividadeFoiLiberada(atividade) {
  if (!atividade.publicadaEm) return true;
  const dataLancamento = new Date(atividade.publicadaEm).getTime();
  return Number.isFinite(dataLancamento) && dataLancamento <= Date.now();
}

function atividadeDisponivelParaAluno(atividade, email = usuarioLogado) {
  if (!atividadeFoiLiberada(atividade)) return false;
  if (!Array.isArray(atividade.alunosSelecionados)) return true;
  return Boolean(email) && atividade.alunosSelecionados.includes(email.toLowerCase());
}

function formatarDataAgenda(data) {
  const dataFormatada = new Date(data);
  if (Number.isNaN(dataFormatada.getTime())) return 'Data inválida';
  return dataFormatada.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function valorPadraoDataLancamento() {
  const data = new Date(Date.now() + 60 * 60 * 1000);
  const doisDigitos = valor => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[caractere]));
}

// ── SISTEMA DE TEMAS ─────────────────────────────────────────────────
function setTema(tema) {
  if (!['escuro', 'claro', 'cinza'].includes(tema)) tema = 'escuro';
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('educa-tema', tema);

  document.querySelectorAll('.tema-btn').forEach(btn => btn.classList.remove('ativo'));
  const btnAtivo = document.getElementById('btn-' + tema);
  if (btnAtivo) btnAtivo.classList.add('ativo');
}

function carregarTema() {
  const temaSalvo = localStorage.getItem('educa-tema') || 'escuro';
  setTema(temaSalvo);
}
carregarTema();

// ── BANCO DE QUESTÕES NATIVAS (INALTERADO) ───────────────────────────
const banco = {
  matematica: {
    iniciante: [
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>2x + 10 = 20</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 5, tolerancia: 1 },
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>4x − 4 = 8</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 3, tolerancia: 0.5 },
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>x ÷ 2 + 3 = 7</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 8, tolerancia: 1 },
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>5x + 2 = 17</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 3, tolerancia: 0.5 },
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>3x − 9 = 6</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 5, tolerancia: 1 },
      { conteudo: `<b>📐 Equações do 1º Grau</b><br><br>Resolva: <b>2x + 7 = 19</b><br><br><i>Qual é o valor de x?</i>`, tipo: "numero", resposta: 6, tolerancia: 1 },
    ],
    intermediario: [
      { conteudo: `<b>📐 Equações do 2º Grau</b><br><br>Resolva: <b>x² − 5x + 6 = 0</b><br><br><i>Qual é a SOMA das duas raízes?</i>`, tipo: "numero", resposta: 5, tolerancia: 0.5 },
      { conteudo: `<b>📐 Equações do 2º Grau</b><br><br>Resolva: <b>x² − 7x + 10 = 0</b><br><br><i>Qual é a SOMA das duas raízes?</i>`, tipo: "numero", resposta: 7, tolerancia: 0.5 },
      { conteudo: `<b>📐 Equações do 2º Grau</b><br><br>Resolva: <b>x² − x − 6 = 0</b><br><br><i>Qual é o PRODUTO das duas raízes?</i>`, tipo: "numero", resposta: -6, tolerancia: 1 },
      { conteudo: `<b>📐 Progressão Aritmética</b><br><br>PA com a₁ = 2 e razão r = 3.<br><br><i>Qual o valor do 10º termo (a₁₀)?</i>`, tipo: "numero", resposta: 29, tolerancia: 1 },
      { conteudo: `<b>📐 Progressão Aritmética</b><br><br>PA com a₁ = 5 e razão r = 2.<br><br><i>Qual é a SOMA dos 5 primeiros termos?</i>`, tipo: "numero", resposta: 45, tolerancia: 2 },
      { conteudo: `<b>📐 Equações do 2º Grau</b><br><br>Resolva: <b>x² − 4 = 0</b><br><br><i>Qual o valor POSITIVO de x?</i>`, tipo: "numero", resposta: 2, tolerancia: 0.3 },
    ],
    avancado: [
      { conteudo: `<b>📐 Progressão Aritmética</b><br><br>PA com a₁ = 3 e razão r = 4.<br><br><i>Qual o valor do 10º termo (a₁₀)?</i>`, tipo: "numero", resposta: 39, tolerancia: 1 },
      { conteudo: `<b>📐 Progressão Geométrica</b><br><br>PG com a₁ = 2 e razão q = 2.<br><br><i>Qual o valor do 6º termo (a₆)?</i>`, tipo: "numero", resposta: 64, tolerancia: 2 },
      { conteudo: `<b>📐 Logaritmo</b><br><br>Calcule: <b>log₂(32)</b><br>(base 2 do 32)<br><br><i>Qual é o resultado?</i>`, tipo: "numero", resposta: 5, tolerancia: 0.3 },
      { conteudo: `<b>📐 Combinatória</b><br><br>Calcule: <b>C(5,2)</b><br>C(n,k) = n! / (k! · (n−k)!)<br><br><i>Qual é o resultado?</i>`, tipo: "numero", resposta: 10, tolerancia: 0.3 },
      { conteudo: `<b>📐 Trigonometria</b><br><br>Em um triângulo retângulo, o cateto oposto mede <b>3</b> e a hipotenusa <b>5</b>.<br><br><i>Qual o comprimento do cateto adjacente?</i>`, tipo: "numero", resposta: 4, tolerancia: 0.3 },
      { conteudo: `<b>📐 Progressão Geométrica</b><br><br>PG com a₁ = 3 e razão q = 3.<br><br><i>Qual a SOMA dos 4 primeiros termos?</i>`, tipo: "numero", resposta: 120, tolerancia: 3 },
    ]
  },
  fisica: {
    iniciante: [
      { conteudo: `<b>⚡ Segunda Lei de Newton</b><br><br>Fórmula: <b>F = m · a</b><br><br>Massa = <b>10 kg</b>, Aceleração = <b>3 m/s²</b><br><br><i>Qual a força resultante em Newtons (N)?</i>`, tipo: "numero", resposta: 30, tolerancia: 2 },
      { conteudo: `<b>⚡ Segunda Lei de Newton</b><br><br>Fórmula: <b>F = m · a</b><br><br>Força = <b>50 N</b>, Massa = <b>5 kg</b><br><br><i>Qual a aceleração em m/s²?</i>`, tipo: "numero", resposta: 10, tolerancia: 1 },
      { conteudo: `<b>⚡ Velocidade Média</b><br><br>Fórmula: <b>v = Δs / Δt</b><br><br>Distância = <b>150 m</b>, Tempo = <b>30 s</b><br><br><i>Qual a velocidade média em m/s?</i>`, tipo: "numero", resposta: 5, tolerancia: 0.5 },
      { conteudo: `<b>⚡ Peso de um corpo</b><br><br>Use <b>P = m · g</b>, considerando g = 10 m/s².<br><br>Massa = <b>6 kg</b><br><br><i>Qual é o peso em Newtons?</i>`, tipo: "numero", resposta: 60, tolerancia: 2 },
    ],
    intermediario: [
      { conteudo: `<b>⚡ Movimento Uniformemente Variado</b><br><br>Um carro parte do repouso com aceleração de <b>4 m/s²</b> durante <b>5 s</b>.<br><br><i>Qual será sua velocidade final em m/s?</i>`, tipo: "numero", resposta: 20, tolerancia: 1 },
      { conteudo: `<b>⚡ Energia Cinética</b><br><br>Use <b>Eₖ = m · v² / 2</b>.<br><br>Massa = <b>2 kg</b> e velocidade = <b>6 m/s</b>.<br><br><i>Qual é a energia cinética em joules?</i>`, tipo: "numero", resposta: 36, tolerancia: 1 },
      { conteudo: `<b>⚡ Lei de Ohm</b><br><br>Use <b>U = R · i</b>.<br><br>Resistência = <b>10 Ω</b> e corrente = <b>2 A</b>.<br><br><i>Qual é a tensão em volts?</i>`, tipo: "numero", resposta: 20, tolerancia: 1 },
    ],
    avancado: [
      { conteudo: `<b>⚡ Trabalho de uma força</b><br><br>Uma força constante de <b>50 N</b> desloca um objeto por <b>8 m</b> na mesma direção.<br><br><i>Qual é o trabalho realizado em joules?</i>`, tipo: "numero", resposta: 400, tolerancia: 5 },
      { conteudo: `<b>⚡ Potência média</b><br><br>Uma máquina realiza <b>1.200 J</b> de trabalho em <b>20 s</b>.<br><br><i>Qual é a potência média em watts?</i>`, tipo: "numero", resposta: 60, tolerancia: 2 },
      { conteudo: `<b>⚡ Quantidade de movimento</b><br><br>Use <b>Q = m · v</b>.<br><br>Massa = <b>4 kg</b> e velocidade = <b>15 m/s</b>.<br><br><i>Qual é a quantidade de movimento?</i>`, tipo: "numero", resposta: 60, tolerancia: 2 },
    ]
  },
  quimica: {
    iniciante: [
      { conteudo: `<b>🧪 Estados físicos</b><br><br><i>Qual é o estado físico da água quando está em forma de gelo?</i>`, tipo: "palavra", resposta: "sólido", sinonimos: ["solido"] },
      { conteudo: `<b>🧪 Tabela periódica</b><br><br><i>Qual é o símbolo químico do oxigênio?</i>`, tipo: "palavra", resposta: "O" },
      { conteudo: `<b>🧪 Substâncias</b><br><br><i>Qual é a fórmula química da água?</i>`, tipo: "palavra", resposta: "H2O", sinonimos: ["h₂o", "h20"] },
    ],
    intermediario: [
      { conteudo: `<b>🧪 pH</b><br><br>Uma solução com pH menor que 7 é classificada como o quê?<br><br><i>Responda com uma palavra.</i>`, tipo: "palavra", resposta: "ácida", sinonimos: ["acida", "ácido", "acido"] },
      { conteudo: `<b>🧪 Balanceamento</b><br><br>Na reação <b>2H₂ + O₂ → 2H₂O</b>, qual é o coeficiente do O₂?<br><br><i>Digite o número.</i>`, tipo: "numero", resposta: 1, tolerancia: 0 },
      { conteudo: `<b>🧪 Ligações químicas</b><br><br><i>Como se chama a ligação formada pela transferência de elétrons entre átomos?</i>`, tipo: "palavra", resposta: "iônica", sinonimos: ["ionica", "iónica", "ionica"] },
    ],
    avancado: [
      { conteudo: `<b>🧪 Estequiometria</b><br><br>Quantos mols existem em <b>36 g de H₂O</b>? Considere massa molar de 18 g/mol.<br><br><i>Digite o resultado.</i>`, tipo: "numero", resposta: 2, tolerancia: 0.1 },
      { conteudo: `<b>🧪 Oxirredução</b><br><br><i>Como se chama a espécie química que recebe elétrons em uma reação?</i>`, tipo: "palavra", resposta: "agente oxidante", sinonimos: ["oxidante"] },
      { conteudo: `<b>🧪 Termoquímica</b><br><br>Uma reação que libera calor para o ambiente é classificada como quê?<br><br><i>Responda com uma palavra.</i>`, tipo: "palavra", resposta: "exotérmica", sinonimos: ["exotermica"] },
    ]
  },
  historia: {
    iniciante: [
      { conteudo: `<b>📜 Brasil Colonial</b><br><br><i>Qual país colonizou o Brasil?</i>`, tipo: "palavra", resposta: "Portugal", sinonimos: ["portugueses", "portugues"] },
      { conteudo: `<b>📜 Antiguidade</b><br><br><i>Qual povo construiu as pirâmides de Gizé?</i>`, tipo: "palavra", resposta: "egípcios", sinonimos: ["egipcios", "egito"] },
      { conteudo: `<b>📜 Independência</b><br><br>Em que ano o Brasil declarou sua independência?<br><br><i>Digite o ano.</i>`, tipo: "numero", resposta: 1822, tolerancia: 0 },
    ],
    intermediario: [
      { conteudo: `<b>📜 Revolução Francesa</b><br><br><i>Em que ano começou a Revolução Francesa?</i>`, tipo: "numero", resposta: 1789, tolerancia: 0 },
      { conteudo: `<b>📜 Brasil Império</b><br><br><i>Qual foi o nome do primeiro imperador do Brasil?</i>`, tipo: "palavra", resposta: "Dom Pedro I", sinonimos: ["d pedro i", "pedro i"] },
      { conteudo: `<b>📜 Guerra Fria</b><br><br><i>Quais eram as duas principais potências da Guerra Fria?</i><br><br>Responda com os nomes separados por “e”.`, tipo: "palavra", resposta: "Estados Unidos e União Soviética", sinonimos: ["eua e uniao sovietica", "estados unidos e urss", "eua e urss"] },
    ],
    avancado: [
      { conteudo: `<b>📜 Primeira Guerra Mundial</b><br><br><i>Em que ano terminou a Primeira Guerra Mundial?</i>`, tipo: "numero", resposta: 1918, tolerancia: 0 },
      { conteudo: `<b>📜 República Velha</b><br><br><i>Como ficou conhecida a política de alternância de poder entre São Paulo e Minas Gerais?</i>`, tipo: "palavra", resposta: "política do café com leite", sinonimos: ["politica do cafe com leite", "cafe com leite"] },
      { conteudo: `<b>📜 Ditadura Militar</b><br><br><i>Em que ano foi promulgada a Constituição brasileira atualmente vigente?</i>`, tipo: "numero", resposta: 1988, tolerancia: 0 },
    ]
  },
  biologia: {
    iniciante: [
      { conteudo: `<b>🌿 Citologia</b><br><br><i>Qual é a unidade básica dos seres vivos?</i>`, tipo: "palavra", resposta: "célula", sinonimos: ["celula"] },
      { conteudo: `<b>🌿 Corpo humano</b><br><br><i>Qual órgão é responsável por bombear o sangue?</i>`, tipo: "palavra", resposta: "coração", sinonimos: ["coracao"] },
      { conteudo: `<b>🌿 Fotossíntese</b><br><br><i>Qual gás as plantas absorvem durante a fotossíntese?</i>`, tipo: "palavra", resposta: "gás carbônico", sinonimos: ["gas carbonico", "dióxido de carbono", "dioxido de carbono", "co2"] },
    ],
    intermediario: [
      { conteudo: `<b>🌿 Genética</b><br><br><i>Qual molécula armazena a informação genética dos seres vivos?</i>`, tipo: "palavra", resposta: "DNA", sinonimos: ["adn"] },
      { conteudo: `<b>🌿 Divisão celular</b><br><br><i>Como se chama a divisão celular que origina duas células geneticamente idênticas?</i>`, tipo: "palavra", resposta: "mitose" },
      { conteudo: `<b>🌿 Ecologia</b><br><br><i>Como se chama o conjunto de seres vivos e fatores não vivos de uma região?</i>`, tipo: "palavra", resposta: "ecossistema", sinonimos: ["ecosistema"] },
    ],
    avancado: [
      { conteudo: `<b>🌿 Genética mendeliana</b><br><br>No cruzamento Aa × Aa, qual a probabilidade de nascer um descendente aa?<br><br><i>Responda em porcentagem.</i>`, tipo: "numero", resposta: 25, tolerancia: 1 },
      { conteudo: `<b>🌿 Evolução</b><br><br><i>Qual cientista é associado à teoria da seleção natural?</i>`, tipo: "palavra", resposta: "Charles Darwin", sinonimos: ["darwin"] },
      { conteudo: `<b>🌿 Fisiologia</b><br><br><i>Qual hormônio reduz a concentração de glicose no sangue?</i>`, tipo: "palavra", resposta: "insulina" },
    ]
  }
};

// ── FLUXO DE LOGIN E PERFIL ──────────────────────────────────────────
function selecionarPerfil(perfil) {
  if (!nomesPerfis[perfil]) perfil = 'aluno';
  perfilSelecionado = perfil;
  document.querySelectorAll('.btn-perfil').forEach(btn => btn.classList.remove('ativo'));
  const botaoPerfil = document.getElementById(`perfil-${perfil}`);
  if (botaoPerfil) botaoPerfil.classList.add('ativo');

  if (modoLogin) {
    document.getElementById('subtitulo-auth').innerText = `Faça login como ${perfilEmTexto(perfil)} para continuar`;
  } else {
    document.getElementById('subtitulo-auth').innerText = `Preencha os dados para se registrar como ${perfilEmTexto(perfil)}`;
  }

  const senhaLabel = document.getElementById('senha-label');
  if (senhaLabel) {
    senhaLabel.innerText = ['diretor', 'programador'].includes(perfil)
      ? 'Senha secreta de acesso'
      : 'Senha';
  }
}

function alternarTela(login) {
  modoLogin = login;
  document.getElementById('titulo-auth').innerText = login ? "Bem-vindo de volta" : "Criar sua conta";
  selecionarPerfil(perfilSelecionado);
  document.getElementById('btn-auth').innerText = login ? "Entrar na conta" : "Cadastrar Conta";
  document.getElementById('msg-troca').innerHTML = login
    ? 'Não tem conta? <a onclick="alternarTela(false)">Registre-se grátis</a>'
    : 'Já tem conta? <a onclick="alternarTela(true)">Fazer Login</a>';
}

async function validarAcessoAdministrativo(perfil, senha) {
  try {
    const resposta = await fetch('/api/role-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, senha })
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      alert(dados.message || 'Não foi possível validar a senha secreta.');
      return false;
    }
    return dados.ok === true;
  } catch (erro) {
    alert('O servidor de segurança não está disponível. Tente novamente.');
    return false;
  }
}

async function autenticar() {
  const user = document.getElementById('usuario').value.trim().toLowerCase();
  const pass = document.getElementById('senha').value;
  const perfilAdministrativo = ['diretor', 'programador'].includes(perfilSelecionado);
  if (!user || !pass) { alert("Por favor, preencha todos os campos."); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    alert("Digite um e-mail válido para continuar.");
    return;
  }

  if (!modoLogin) {
    const chaveUsuario = 'user_' + user;
    if (localStorage.getItem(chaveUsuario)) {
      alert("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      return;
    }

    if (perfilAdministrativo && !(await validarAcessoAdministrativo(perfilSelecionado, pass))) {
      return;
    }

    // A senha administrativa nunca é salva no navegador.
    const dadosUsuario = perfilAdministrativo
      ? { email: user, perfil: perfilSelecionado, protegido: true }
      : { email: user, senha: pass, perfil: perfilSelecionado };
    localStorage.setItem(chaveUsuario, JSON.stringify(dadosUsuario));
    registrarUsuario(dadosUsuario);

    // Adiciona ao banco de dados simulado caso seja um aluno
    if (perfilSelecionado === 'aluno') {
      atualizarBancoAlunosLocal(user);
    }

    alert(`Conta de ${perfilEmTexto(perfilSelecionado).toUpperCase()} criada com sucesso! 🎉`);
    alternarTela(true);
  } else {
    const dadosSalvosRaw = localStorage.getItem('user_' + user);
    let dadosSalvos = null;
    if (dadosSalvosRaw) {
      try {
        dadosSalvos = JSON.parse(dadosSalvosRaw);
      } catch (erro) {
        alert("Não foi possível ler esta conta. Faça um novo cadastro.");
        return;
      }
    }

    // Diretor e Programador usam a senha secreta do servidor como credencial.
    // O e-mail é registrado automaticamente no primeiro login válido.
    if (perfilAdministrativo) {
      if (!(await validarAcessoAdministrativo(perfilSelecionado, pass))) return;
      if (dadosSalvos && dadosSalvos.perfil !== perfilSelecionado) {
        alert("Este e-mail já está vinculado a outro perfil.");
        return;
      }
      if (!dadosSalvos) {
        dadosSalvos = { email: user, perfil: perfilSelecionado, protegido: true };
        localStorage.setItem('user_' + user, JSON.stringify(dadosSalvos));
      }
    } else if (!dadosSalvos) {
      alert("E-mail não encontrado. Faça seu cadastro primeiro.");
      return;
    }

    const senhaValida = perfilAdministrativo || dadosSalvos.senha === pass;

    if (senhaValida && dadosSalvos.perfil === perfilSelecionado) {
      usuarioLogado = user;
      registrarUsuario({ email: user, perfil: dadosSalvos.perfil });
      document.getElementById('secao-auth').classList.add('hidden');

      if (perfilSelecionado === 'aluno') {
        entrarMenuAluno();
      } else if (perfilSelecionado === 'professor') {
        entrarMenuProfessor();
      } else if (perfilSelecionado === 'diretor') {
        entrarMenuDiretor();
      } else {
        entrarMenuProgramador();
      }
    } else {
      alert("Senha incorreta ou perfil de acesso inválido.");
    }
  }
}

function fazerLogout() {
  usuarioLogado = null;
  ocultarTodasAsSecoes();
  document.getElementById('secao-auth').classList.remove('hidden');
  document.getElementById('usuario').value = '';
  document.getElementById('senha').value = '';
}

// ── INTERFACES DOS MENUS ─────────────────────────────────────────────
function definirTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.innerText = String(valor);
}

function atualizarEstatisticasMenus() {
  const usuarios = lerUsuariosSalvos();
  const atividades = lerAtividadesSalvas();
  const alunos = usuarios.filter(usuario => usuario.perfil === 'aluno').length;
  const professores = usuarios.filter(usuario => usuario.perfil === 'professor').length;
  const atividadesDoAluno = usuarioLogado
    ? atividades.filter(atividade =>
      atividadeDisponivelParaAluno(atividade) &&
      atividade.statusAlunos?.[usuarioLogado] !== 'concluida'
    )
    : [];
  const atividadesLiberadas = usuarioLogado
    ? atividades.filter(atividade => atividadeDisponivelParaAluno(atividade))
    : [];

  definirTexto('aluno-total-atividades', usuarioLogado
    ? atividadesLiberadas.length
    : 0);
  definirTexto('aluno-pendentes', atividadesDoAluno.length);
  definirTexto('professor-total-alunos', alunos);
  definirTexto('professor-total-atividades', atividades.length);
  definirTexto('diretor-total-alunos', alunos);
  definirTexto('diretor-total-professores', professores);
  definirTexto('diretor-total-atividades', atividades.length);
  definirTexto('programador-total-contas', usuarios.length);
  definirTexto('programador-total-atividades', atividades.length);
}

function entrarMenuAluno() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-aluno').classList.remove('hidden');
  const nome = usuarioLogado.split('@')[0];
  definirTexto('nome-curto-aluno', nome);
  document.getElementById('boas-vindas-aluno').innerText = 'Continue evoluindo no seu ritmo.';
  atualizarEstatisticasMenus();
}

function entrarMenuProfessor() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-professor').classList.remove('hidden');
  document.getElementById('boas-vindas-professor').innerText = `Conta ativa: ${usuarioLogado}`;
  atualizarEstatisticasMenus();
}

function entrarMenuDiretor() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-diretor').classList.remove('hidden');
  document.getElementById('boas-vindas-diretor').innerText = `Conta ativa: ${usuarioLogado}`;
  atualizarEstatisticasMenus();
}

function entrarMenuProgramador() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-programador').classList.remove('hidden');
  document.getElementById('boas-vindas-programador').innerText = `Conta ativa: ${usuarioLogado}`;
  atualizarEstatisticasMenus();
}

function irParaTreino() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-curso').classList.remove('hidden');
}

function voltarParaMenuAluno() {
  entrarMenuAluno();
}

function voltarParaMenuProfessor() {
  entrarMenuProfessor();
}

function voltarParaMenuDiretor() {
  entrarMenuDiretor();
}

function voltarParaMenuProgramador() {
  entrarMenuProgramador();
}

function voltarParaMenuGestao() {
  if (perfilSelecionado === 'diretor') voltarParaMenuDiretor();
  else if (perfilSelecionado === 'programador') voltarParaMenuProgramador();
  else voltarParaMenuProfessor();
}

function ocultarTodasAsSecoes() {
  if (intervaloAgenda) {
    clearInterval(intervaloAgenda);
    intervaloAgenda = null;
  }
  const secoes = [
    'secao-auth', 'secao-menu-aluno', 'secao-curso', 'secao-atividades-aluno',
    'secao-menu-professor', 'secao-menu-diretor', 'secao-menu-programador',
    'secao-painel-diretor', 'secao-painel-programador',
    'secao-gerenciar-alunos', 'secao-agenda-atividades',
    'secao-atribuir-atividade', 'secao-aula'
  ];
  secoes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
}

// ── PAINÉIS ADMINISTRATIVOS E REGISTRO DE CONTAS ─────────────────────
function lerUsuariosSalvos() {
  try {
    const usuarios = JSON.parse(localStorage.getItem('educa-usuarios') || '[]');
    return Array.isArray(usuarios) ? usuarios : [];
  } catch (erro) {
    console.warn('Não foi possível ler os usuários salvos.', erro);
    return [];
  }
}

function registrarUsuario(dadosUsuario) {
  if (!dadosUsuario?.email) return;
  const usuarios = lerUsuariosSalvos();
  const email = dadosUsuario.email.toLowerCase();
  const existente = usuarios.find(usuario => usuario.email === email);
  if (existente) {
    existente.perfil = dadosUsuario.perfil;
  } else {
    usuarios.push({
      email,
      perfil: dadosUsuario.perfil,
      cadastradoEm: new Date().toISOString()
    });
  }
  localStorage.setItem('educa-usuarios', JSON.stringify(usuarios));
}

function irParaPainelDiretor() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-painel-diretor').classList.remove('hidden');

  const usuarios = lerUsuariosSalvos();
  const atividades = lerAtividadesSalvas();
  const alunos = usuarios.filter(usuario => usuario.perfil === 'aluno').length;
  const professores = usuarios.filter(usuario => usuario.perfil === 'professor').length;
  const concluicoes = atividades.reduce((total, atividade) =>
    total + Object.values(atividade.statusAlunos || {}).filter(status => status === 'concluida').length, 0
  );

  document.getElementById('resumo-diretor').innerHTML = `
    <div class="resumo-card"><strong>${alunos}</strong><span>Alunos</span></div>
    <div class="resumo-card"><strong>${professores}</strong><span>Professores</span></div>
    <div class="resumo-card"><strong>${atividades.length}</strong><span>Atividades</span></div>
    <div class="resumo-card"><strong>${concluicoes}</strong><span>Conclusões</span></div>
  `;
  document.getElementById('resumo-atividades-diretor').innerHTML = atividades.length
    ? `<b>Atividades publicadas</b><br><br>${atividades.map(atividade =>
      `📋 ${escapeHtml(atividade.titulo)} <small>— por ${escapeHtml(atividade.criador || 'conta administrativa')}</small>`
    ).join('<br>')}`
    : '<span style="color: var(--text-muted)">Nenhuma atividade foi publicada ainda.</span>';
}

function irParaPainelProgramador() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-painel-programador').classList.remove('hidden');

  const usuarios = lerUsuariosSalvos();
  const atividades = lerAtividadesSalvas();
  document.getElementById('resumo-programador').innerHTML = `
    <div class="resumo-card"><strong>${usuarios.length}</strong><span>Contas</span></div>
    <div class="resumo-card"><strong>${atividades.length}</strong><span>Atividades</span></div>
    <div class="resumo-card"><strong>${localStorage.length}</strong><span>Registros locais</span></div>
    <div class="resumo-card"><strong>OK</strong><span>Status</span></div>
  `;
}

// ── RECURSO DO PROFESSOR/DIRETOR: GERENCIAR USUÁRIOS ────────────────
function irParaGerenciarAlunos() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-gerenciar-alunos').classList.remove('hidden');

  const container = document.getElementById('banco-alunos-lista');
  container.innerHTML = '';

  let usuarios = lerUsuariosSalvos();
  // Compatibilidade com cadastros de aluno criados antes do registro por e-mail.
  if (usuarios.length === 0) {
    let listaAlunos = [];
    try {
      listaAlunos = JSON.parse(localStorage.getItem('educa-lista-alunos') || '[]');
    } catch (erro) {
      listaAlunos = [];
    }
    usuarios = listaAlunos.map(email => ({ email, perfil: 'aluno' }));
  }

  if (usuarios.length === 0) {
    container.innerHTML = '<div class="item-lista" style="color: var(--text-muted)">Nenhuma conta registrada ainda.</div>';
    return;
  }

  usuarios.sort((a, b) => a.email.localeCompare(b.email)).forEach(usuario => {
    const div = document.createElement('div');
    div.className = 'item-lista';
    const icones = { aluno: '🧑‍🎓', professor: '👨‍🏫', diretor: '🏫', programador: '💻' };
    div.innerHTML = `${icones[usuario.perfil] || '👤'} <b>${escapeHtml(usuario.email)}</b>
      <span class="perfil-tag">${perfilEmTexto(usuario.perfil)}</span>`;
    container.appendChild(div);
  });
}

function atualizarBancoAlunosLocal(novoAluno) {
  let listaAlunos;
  try {
    listaAlunos = JSON.parse(localStorage.getItem('educa-lista-alunos') || '[]');
  } catch (erro) {
    listaAlunos = [];
  }
  if (!listaAlunos.includes(novoAluno)) {
    listaAlunos.push(novoAluno);
    localStorage.setItem('educa-lista-alunos', JSON.stringify(listaAlunos));
  }
}

// ── RECURSO DO PROFESSOR 2: CRIAR ATIVIDADE (MÁX 8 QUESTÕES) ─────────
function irParaAtribuirAtividade() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-atribuir-atividade').classList.remove('hidden');
  document.getElementById('titulo-nova-atividade').value = '';
  document.getElementById('data-lancamento-atividade').value = valorPadraoDataLancamento();
  document.getElementById('selecionar-todos-alunos').checked = false;
  renderizarSeletorAlunosAtividade();
  questoesFormularioProfessor = [];
  renderizarFormularioQuestoes();
}

function renderizarSeletorAlunosAtividade() {
  const container = document.getElementById('seletor-alunos-atividade');
  const alunos = obterAlunosDisponiveis();
  if (!alunos.length) {
    container.innerHTML = '<div class="seletor-vazio">Nenhum aluno cadastrado. Cadastre alunos antes de agendar uma atividade.</div>';
    return;
  }

  container.innerHTML = alunos.map((email, index) => `
    <label class="checkbox-opcao aluno-opcao" for="aluno-atividade-${index}">
      <input type="checkbox" id="aluno-atividade-${index}" value="${escapeHtml(email)}" onchange="atualizarEstadoSelecionarTodos()">
      <span>${escapeHtml(email)}</span>
    </label>
  `).join('');
}

function alternarTodosAlunosAtividade(selecionado) {
  document.querySelectorAll('#seletor-alunos-atividade input[type="checkbox"]').forEach(input => {
    input.checked = selecionado;
  });
}

function atualizarEstadoSelecionarTodos() {
  const caixas = [...document.querySelectorAll('#seletor-alunos-atividade input[type="checkbox"]')];
  const todos = caixas.length > 0 && caixas.every(input => input.checked);
  const seletorTodos = document.getElementById('selecionar-todos-alunos');
  if (seletorTodos) seletorTodos.checked = todos;
}

function obterAlunosSelecionadosAtividade() {
  return [...document.querySelectorAll('#seletor-alunos-atividade input[type="checkbox"]:checked')]
    .map(input => input.value.toLowerCase());
}

function adicionarNovaQuestaoForm() {
  if (questoesFormularioProfessor.length >= 8) {
    alert("⚠️ Limite máximo atingido! Uma atividade pode ter no máximo 8 questões.");
    return;
  }

  questoesFormularioProfessor.push({
    enunciado: '',
    a: '', b: '', c: '', d: '',
    correta: 'A'
  });

  renderizarFormularioQuestoes();
}

function renderizarFormularioQuestoes() {
  const container = document.getElementById('container-questoes-criadas');
  container.innerHTML = '';

  questoesFormularioProfessor.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'card-questao-professor';
    card.innerHTML = `
      <h4>Questão ${index + 1}</h4>
      <div class="campo">
        <label>Enunciado da Questão</label>
        <input type="text" placeholder="Ex: Quanto é 5 x 5?" value="${q.enunciado}" onchange="salvarDadosCamposProfessor(${index}, 'enunciado', this.value)">
      </div>
      <div class="grid-alternativas">
        <input type="text" placeholder="Alternativa A" value="${q.a}" onchange="salvarDadosCamposProfessor(${index}, 'a', this.value)">
        <input type="text" placeholder="Alternativa B" value="${q.b}" onchange="salvarDadosCamposProfessor(${index}, 'b', this.value)">
        <input type="text" placeholder="Alternativa C" value="${q.c}" onchange="salvarDadosCamposProfessor(${index}, 'c', this.value)">
        <input type="text" placeholder="Alternativa D" value="${q.d}" onchange="salvarDadosCamposProfessor(${index}, 'd', this.value)">
      </div>
      <div class="campo" style="margin-top: 10px;">
        <label>Alternativa Correta</label>
        <select onchange="salvarDadosCamposProfessor(${index}, 'correta', this.value)">
          <option value="A" ${q.correta === 'A' ? 'selected' : ''}>Alternativa A</option>
          <option value="B" ${q.correta === 'B' ? 'selected' : ''}>Alternativa B</option>
          <option value="C" ${q.correta === 'C' ? 'selected' : ''}>Alternativa C</option>
          <option value="D" ${q.correta === 'D' ? 'selected' : ''}>Alternativa D</option>
        </select>
      </div>
    `;
    container.appendChild(card);
  });

  // Esconde o botão de adicionar se bater 8 questões
  const btnAdd = document.getElementById('btn-add-questao');
  if (questoesFormularioProfessor.length >= 8) {
    btnAdd.style.display = 'none';
  } else {
    btnAdd.style.display = 'block';
  }
}

function salvarDadosCamposProfessor(index, campo, valor) {
  questoesFormularioProfessor[index][campo] = valor;
}

function salvarAtividadeProfessor() {
  const titulo = document.getElementById('titulo-nova-atividade').value.trim();
  const dataLancamentoTexto = document.getElementById('data-lancamento-atividade').value;
  const dataLancamento = new Date(dataLancamentoTexto);
  const alunosSelecionados = obterAlunosSelecionadosAtividade();
  if (!titulo) { alert("Dê um título para a sua atividade."); return; }
  if (!dataLancamentoTexto || Number.isNaN(dataLancamento.getTime())) {
    alert("Defina uma data e hora válidas para o lançamento.");
    return;
  }
  if (alunosSelecionados.length === 0) {
    alert("Selecione pelo menos um aluno para receber a atividade.");
    return;
  }
  if (questoesFormularioProfessor.length === 0) { alert("Adicione pelo menos 1 questão."); return; }
  const formularioIncompleto = questoesFormularioProfessor.some(q =>
    !q.enunciado.trim() || !q.a.trim() || !q.b.trim() || !q.c.trim() || !q.d.trim()
  );
  if (formularioIncompleto) {
    alert("Preencha o enunciado e as quatro alternativas de todas as questões.");
    return;
  }

  // Estrutura a atividade customizada para envio
  const novaAtividade = {
    id: 'act_' + Date.now(),
    titulo: titulo,
    criador: usuarioLogado,
    publicadaEm: dataLancamento.toISOString(),
    alunosSelecionados,
    questoes: questoesFormularioProfessor.map(q => {
      return {
        conteudo: `<b>📝 Atividade: ${escapeHtml(titulo)}</b><br><br>${escapeHtml(q.enunciado)}<br><br><b>A)</b> ${escapeHtml(q.a)}<br><b>B)</b> ${escapeHtml(q.b)}<br><b>C)</b> ${escapeHtml(q.c)}<br><b>D)</b> ${escapeHtml(q.d)}`,
        tipo: "palavra",
        resposta: q.correta.toLowerCase(),
        sinonimos: [q.correta.toLowerCase(), q.correta.toUpperCase()]
      };
    }),
    statusAlunos: {} // Controla quem já fez
  };

  let atividadesSalvas = lerAtividadesSalvas();
  atividadesSalvas.push(novaAtividade);
  localStorage.setItem('educa-atividades', JSON.stringify(atividadesSalvas));

  alert(`Atividade agendada para ${formatarDataAgenda(novaAtividade.publicadaEm)} e enviada para ${alunosSelecionados.length} aluno(s)! 🗓️`);
  voltarParaMenuProfessor();
}

function irParaAgendaAtividades() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-agenda-atividades').classList.remove('hidden');
  renderizarAgendaAtividades();

  if (intervaloAgenda) clearInterval(intervaloAgenda);
  intervaloAgenda = setInterval(renderizarAgendaAtividades, 30000);
}

function renderizarAgendaAtividades() {
  const lista = document.getElementById('lista-agenda-atividades');
  const resumo = document.getElementById('resumo-agenda');
  if (!lista || !resumo) return;

  const atividades = lerAtividadesSalvas().filter(atividade =>
    perfilSelecionado === 'diretor' || atividade.criador === usuarioLogado
  );
  const agendadas = atividades.filter(atividade => !atividadeFoiLiberada(atividade));
  const liberadas = atividades.filter(atividade => atividadeFoiLiberada(atividade));

  resumo.innerHTML = `
    <div class="resumo-card"><strong>${agendadas.length}</strong><span>Agendadas</span></div>
    <div class="resumo-card"><strong>${liberadas.length}</strong><span>Já lançadas</span></div>
    <div class="resumo-card"><strong>${atividades.length}</strong><span>Total</span></div>
  `;

  if (!atividades.length) {
    lista.innerHTML = '<div class="item-lista" style="color: var(--text-muted)">Nenhuma atividade na agenda ainda.</div>';
    return;
  }

  atividades.sort((a, b) => {
    const dataA = new Date(a.publicadaEm || 0).getTime();
    const dataB = new Date(b.publicadaEm || 0).getTime();
    return dataA - dataB;
  });

  lista.innerHTML = atividades.map(atividade => {
    const liberada = atividadeFoiLiberada(atividade);
    const alunos = Array.isArray(atividade.alunosSelecionados)
      ? `${atividade.alunosSelecionados.length} aluno(s) selecionado(s)`
      : 'Todos os alunos';
    const data = atividade.publicadaEm
      ? formatarDataAgenda(atividade.publicadaEm)
      : 'Disponível imediatamente';
    return `
      <div class="agenda-item">
        <div class="agenda-item-topo">
          <b>📋 ${escapeHtml(atividade.titulo)}</b>
          <span class="agenda-status ${liberada ? 'liberada' : 'agendada'}">${liberada ? '✓ Lançada' : '◷ Agendada'}</span>
        </div>
        <div class="agenda-item-detalhes">
          <span>🗓️ ${data}</span>
          <span>👥 ${alunos}</span>
          ${perfilSelecionado === 'diretor' ? `<span>✍️ ${escapeHtml(atividade.criador || 'conta administrativa')}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── RECURSO DO ALUNO: CENTRAL DE ABAS DE ATIVIDADES ──────────────────
function irParaAtividadesAluno() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-atividades-aluno').classList.remove('hidden');
  mudarAbaAluno('recentes');
}

function mudarAbaAluno(aba) {
  const abasValidas = ['recentes', 'pendentes', 'concluidas'];
  if (!abasValidas.includes(aba)) aba = 'recentes';
  abaAtivaAluno = aba;
  document.querySelectorAll('.aba-btn').forEach(btn => {
    btn.classList.toggle('ativa', btn.dataset.aba === aba);
  });

  renderizarListaAtividadesAluno();
}

function renderizarListaAtividadesAluno() {
  const container = document.getElementById('lista-atividades-container');
  container.innerHTML = '';

  let atividadesSalvas = lerAtividadesSalvas().filter(atividade =>
    atividadeDisponivelParaAluno(atividade)
  );
  const totais = { recentes: atividadesSalvas.length, pendentes: 0, concluidas: 0 };
  atividadesSalvas.forEach(act => {
    const status = (act.statusAlunos || {})[usuarioLogado];
    if (status === 'concluida') totais.concluidas++;
    else totais.pendentes++;
  });
  Object.entries(totais).forEach(([nome, total]) => {
    const contador = document.getElementById(`contador-${nome}`);
    if (contador) contador.textContent = total;
  });

  // Filtra as atividades com base na aba escolhida
  let filtradas = atividadesSalvas.filter(act => {
    const status = (act.statusAlunos || {})[usuarioLogado];
    if (abaAtivaAluno === 'concluidas') return status === 'concluida';
    if (abaAtivaAluno === 'pendentes') return status !== 'concluida';
    if (abaAtivaAluno === 'recentes') return true; // Mostra tudo enviado
    return false;
  });

  if (filtradas.length === 0) {
    container.innerHTML = '<div class="item-lista" style="color: var(--text-muted)">Nenhuma atividade encontrada nesta aba.</div>';
    return;
  }

  filtradas.forEach(act => {
    const statusAlunos = act.statusAlunos || {};
    const concluida = statusAlunos[usuarioLogado] === 'concluida';
    const status = concluida ? '✅ Concluída' : '⏳ Pendente';
    const div = document.createElement('div');
    div.className = 'item-lista';
    div.style.cursor = 'pointer';
    div.innerHTML = `📋 <b>${escapeHtml(act.titulo)}</b> <small>(Por: ${escapeHtml(act.criador)})</small> <span style="float: right; font-size:0.8rem;">${status}</span>`;

    if(!concluida) {
      div.onclick = () => iniciarAtividadeProfessorPeloAluno(act);
    } else {
      div.onclick = () => alert("Você já completou esta atividade com êxito!");
    }
    container.appendChild(div);
  });
}

function iniciarAtividadeProfessorPeloAluno(atividade) {
  materiaAtual = 'custom';
  nivelAtual = atividade.id;

  filaQuestoes = [...atividade.questoes]; // Sem embaralhar para manter a ordem do professor
  indiceAtual = 0;
  acertos = 0;

  ocultarTodasAsSecoes();
  document.getElementById('secao-aula').classList.remove('hidden');

  document.getElementById('titulo-aula').innerText = `Atividade: ${atividade.titulo}`;
  carregarQuestao();
}

// ── MOTOR DA LIÇÃO (ADAPTADO) ────────────────────────────────────────
function carregarAula() {
  materiaAtual = document.getElementById('materia').value;
  nivelAtual   = document.getElementById('nivel').value;

  filaQuestoes = embaralhar(banco[materiaAtual]?.[nivelAtual] || []);
  indiceAtual  = 0;
  acertos      = 0;

  ocultarTodasAsSecoes();
  document.getElementById('secao-aula').classList.remove('hidden');

  atualizarTituloAula();
  carregarQuestao();
}

function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function atualizarTituloAula() {
  const nomes = { matematica: "📐 Matemática", fisica: "⚡ Física", quimica: "🧪 Química", historia: "📜 História", biologia: "🌿 Biologia" };
  const niveis = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
  document.getElementById('titulo-aula').innerText = `${nomes[materiaAtual]} · ${niveis[nivelAtual]}`;
}

function carregarQuestao() {
  const input = document.getElementById('input-resposta');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnProxima = document.getElementById('btn-proxima');

  if (filaQuestoes.length === 0) {
    questaoAtual = null;
    document.getElementById('conteudo-aula').innerHTML = `
      <b>🚧 Nenhuma questão disponível nesta categoria.</b>
      <br><br><span>Escolha outra matéria ou nível para continuar seu treino.</span>
    `;
    input.value = '';
    input.disabled = true;
    btnVerificar.disabled = true;
    btnProxima.classList.add('hidden');
    limparFeedback();
    return;
  }
  questaoAtual = filaQuestoes[indiceAtual];
  jaAcertou    = false;

  document.getElementById('conteudo-aula').innerHTML = questaoAtual.conteudo;
  input.value = '';
  input.disabled = false;
  btnVerificar.disabled = false;
  btnProxima.classList.add('hidden');
  limparFeedback();
  atualizarContador();
  document.getElementById('input-resposta').focus();
}

function atualizarContador() {
  const total = filaQuestoes.length;
  if(total === 0) return;
  document.getElementById('contador-questao').innerText = `${indiceAtual + 1} / ${total}`;
  const pct = (acertos / total) * 100;
  document.getElementById('barra-progresso').style.width = pct + '%';
  document.getElementById('label-progresso').innerText = `${acertos} acerto${acertos !== 1 ? 's' : ''}`;
}

function proximaQuestao() {
  indiceAtual++;
  if (indiceAtual >= filaQuestoes.length) {
    if (materiaAtual === 'custom') {
      // Finaliza a atividade customizada salvando o status no localStorage
      let atividadesSalvas = lerAtividadesSalvas();
      let index = atividadesSalvas.findIndex(act => act.id === nivelAtual);
      if (index !== -1) {
        atividadesSalvas[index].statusAlunos ||= {};
        atividadesSalvas[index].statusAlunos[usuarioLogado] = 'concluida';
        localStorage.setItem('educa-atividades', JSON.stringify(atividadesSalvas));
      }
      alert("🏆 Atividade concluída com sucesso! Suas notas foram salvas.");
      voltarParaMenuAluno();
      return;
    }

    // Se for treino livre nativo, reinicia em loop
    filaQuestoes = embaralhar(banco[materiaAtual][nivelAtual]);
    indiceAtual  = 0;
    acertos      = 0;
    mostrarFeedback('correto', `🏆 Rodada concluída! Embaralhando novamente...`);
    setTimeout(carregarQuestao, 1800);
    return;
  }
  carregarQuestao();
}

function verificarResposta() {
  if (!questaoAtual || jaAcertou) return;
  const input = document.getElementById('input-resposta').value.trim();
  if (!input) { mostrarFeedback('errado', '✏️ Digite uma resposta antes de verificar.'); return; }

  const resultado = avaliarResposta(input, questaoAtual);
  mostrarFeedback(resultado.tipo, resultado.mensagem);

  if (resultado.tipo === 'correto') {
    acertos++;
    jaAcertou = true;
    document.getElementById('input-resposta').disabled = true;
    document.getElementById('btn-verificar').disabled  = true;
    document.getElementById('btn-proxima').classList.remove('hidden');
    atualizarContador();
  }
}

function verificarRespostaEmTempoReal() {
  if (!questaoAtual || jaAcertou) return;
  const input = document.getElementById('input-resposta').value.trim();
  if (!input) { limparFeedback(); return; }
  const resultado = avaliarResposta(input, questaoAtual);
  if (resultado.tipo === 'correto' || resultado.tipo === 'proximo') {
    mostrarFeedback(resultado.tipo, resultado.mensagem);
  } else {
    limparFeedback();
  }
}

function avaliarResposta(input, questao) {
  if (questao.tipo === 'numero') {
    const val  = parseFloat(input.replace(',', '.'));
    if (isNaN(val)) return { tipo: 'errado', mensagem: '❌ Digite um número válido.' };
    const diff = Math.abs(val - questao.resposta);
    const tol  = questao.tolerancia;
    if (diff === 0 || (tol === 0 && diff === 0)) return { tipo: 'correto', mensagem: '✅ Resposta correta! Excelente!' };
     if (tol > 0 && diff <= tol)      return { tipo: 'correto', mensagem: '✅ Resposta correta! Excelente!' };
    if (tol > 0 && diff <= tol * 2)  return { tipo: 'proximo',  mensagem: `🔥 Muito perto! Você está a ${diff.toFixed(1)} da resposta certa.` };
    return { tipo: 'errado', mensagem: `❌ Incorreto. Tente novamente!` };
  }

  if (questao.tipo === 'palavra') {
    const norm  = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const n     = norm(input);
    const r     = norm(questao.resposta);
    const sins  = (questao.sinonimos || []).map(norm);
    if (n === r || sins.includes(n)) return { tipo: 'correto', mensagem: '✅ Resposta correta! Muito bem!' };

    // Distância de digitação para respostas curtas ou letras de múltiplas escolhas (A, B, C, D)
    const lev = calcularLevenshtein(n, r);
    if (lev === 1 && r.length > 2) return { tipo: 'proximo', mensagem: `🔥 Quase lá! Verifique a ortografia.` };
    return { tipo: 'errado', mensagem: `❌ Incorreto. Tente de novo.` };
  }
  return { tipo: 'errado', mensagem: '❌ Resposta não reconhecida.' };
}

function calcularLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function mostrarFeedback(tipo, mensagem) {
  const el = document.getElementById('feedback');
  if(!el) return;
  el.className = '';
  el.textContent = mensagem;
  void el.offsetWidth;
  el.classList.add(tipo, 'visivel');
}

function limparFeedback() {
  const el = document.getElementById('feedback');
  if(el) { el.className = ''; el.textContent = ''; }
}