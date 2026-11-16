let modoLogin = true;
let perfilSelecionado = 'aluno'; // 'aluno', 'professor', 'diretor' ou 'programador'
let usuarioLogado = null;
let contaAtual = null;
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
let questoesNotaFormulario = [];

const nomesPerfis = {
  aluno: 'Aluno',
  professor: 'Professor',
  diretor: 'Diretor',
  programador: 'Programador'
};

const turmasDisponiveis = [
  { valor: '1A', texto: '1º A' },
  { valor: '1B', texto: '1º B' },
  { valor: '1C', texto: '1º C' },
  { valor: '2A', texto: '2º A' },
  { valor: '2B', texto: '2º B' },
  { valor: '2C', texto: '2º C' },
  { valor: '2D', texto: '2º D' },
  { valor: '3A', texto: '3º A' },
  { valor: '3B', texto: '3º B' },
  { valor: '3C', texto: '3º C' },
  { valor: '9A', texto: '9º A' },
  { valor: '9B', texto: '9º B' },
  { valor: '9C', texto: '9º C' }
];

function perfilEmTexto(perfil) {
  return nomesPerfis[perfil] || nomesPerfis.aluno;
}

async function solicitarApi(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    credentials: 'same-origin',
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opcoes.headers || {})
    }
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.message || 'Não foi possível concluir a solicitação.');
    erro.status = resposta.status;
    erro.code = dados.code;
    throw erro;
  }
  return dados;
}

function atualizarCampoIdentificador() {
  const metodo = perfilSelecionado === 'aluno'
    ? 'email'
    : document.getElementById('metodo-acesso')?.value || 'email';
  const campo = document.getElementById('usuario');
  const rotulo = document.getElementById('usuario-label');
  const seletor = document.getElementById('metodo-acesso-campo');
  if (!campo) return;

  const usarEmail = metodo === 'email';
  campo.type = usarEmail ? 'email' : 'text';
  campo.placeholder = usarEmail ? 'voce@exemplo.com' : 'Ex.: ana.silva';
  campo.autocomplete = usarEmail ? 'email' : 'username';
  if (rotulo) rotulo.innerText = usarEmail ? 'E-mail de acesso' : 'Nome de usuário';
  if (seletor) seletor.classList.toggle('hidden', perfilSelecionado === 'aluno');
}

function turmaEmTexto(turma) {
  return turmasDisponiveis.find(opcao => opcao.valor === turma)?.texto ||
    window.turmasApiAtuais?.find(opcao => opcao.name === turma)?.name ||
    turma ||
    'Sem turma';
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

function obterAlunosComTurma() {
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
    .map(usuario => ({
      email: usuario.email.toLowerCase(),
      turma: usuario.turma || ''
    }))
    .filter((aluno, index, lista) =>
      lista.findIndex(outro => outro.email === aluno.email) === index
    )
    .sort((a, b) => {
      const turmaA = turmasDisponiveis.findIndex(opcao => opcao.valor === a.turma);
      const turmaB = turmasDisponiveis.findIndex(opcao => opcao.valor === b.turma);
      return (turmaA === -1 ? 999 : turmaA) - (turmaB === -1 ? 999 : turmaB)
        || a.email.localeCompare(b.email);
    });
}

function obterAlunosDisponiveis() {
  return obterAlunosComTurma().map(aluno => aluno.email);
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

function configurarProtecaoAtividades() {
  const conteudoQuestao = document.getElementById('conteudo-aula');
  const campoResposta = document.getElementById('input-resposta');

  conteudoQuestao?.addEventListener('contextmenu', evento => {
    evento.preventDefault();
  });

  const bloquearColagem = evento => {
    evento.preventDefault();
    mostrarFeedback('proximo', 'Digite sua resposta diretamente; colar está desativado.');
  };

  campoResposta?.addEventListener('paste', bloquearColagem);
  campoResposta?.addEventListener('drop', bloquearColagem);
  campoResposta?.addEventListener('beforeinput', evento => {
    if (['insertFromPaste', 'insertFromDrop'].includes(evento.inputType)) {
      bloquearColagem(evento);
    }
  });
  campoResposta?.addEventListener('keydown', evento => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'v') {
      bloquearColagem(evento);
    }
  });
}

configurarProtecaoAtividades();

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

  const turmaCampo = document.getElementById('turma-auth-campo');
  if (turmaCampo) turmaCampo.classList.toggle('hidden', perfil !== 'aluno' || modoLogin);
  const metodoAcesso = document.getElementById('metodo-acesso');
  if (metodoAcesso && perfil === 'aluno') metodoAcesso.value = 'email';
  atualizarCampoIdentificador();
}

function alternarTela(login) {
  modoLogin = login;
  document.getElementById('titulo-auth').innerText = login ? "Bem-vindo de volta" : "Criar sua conta";
  selecionarPerfil(perfilSelecionado);
  document.getElementById('btn-auth').innerText = login ? "Entrar na conta" : "Cadastrar Conta";
  document.getElementById('msg-troca').innerHTML = login
    ? 'Não tem conta? <a onclick="alternarTela(false)">Registre-se grátis</a>'
    : 'Já tem conta? <a onclick="alternarTela(true)">Fazer Login</a>';
  const codigoTurma = document.getElementById('codigo-turma-aluno');
  if (codigoTurma) codigoTurma.value = '';
  const turmaCampo = document.getElementById('turma-auth-campo');
  if (turmaCampo) turmaCampo.classList.toggle('hidden', perfilSelecionado !== 'aluno' || login);
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

function entrarNaContaApi(conta) {
  contaAtual = conta;
  usuarioLogado = conta.email || conta.username;
  perfilSelecionado = conta.role;
  document.getElementById('secao-auth').classList.add('hidden');
  registrarUsuario(conta);

  if (conta.role === 'aluno') entrarMenuAluno();
  else if (conta.role === 'professor') entrarMenuProfessor();
  else if (conta.role === 'diretor') entrarMenuDiretor();
  else entrarMenuProgramador();

  sincronizarCacheApi().catch(erro => {
    console.warn('Não foi possível atualizar a lista compartilhada de contas.', erro);
  });
}

async function sincronizarCacheApi() {
  if (!contaAtual || !['professor', 'diretor', 'programador'].includes(contaAtual.role)) return;
  const [dados, turmas] = await Promise.all([
    solicitarApi('/api/accounts'),
    buscarTurmasApi()
  ]);
  window.turmasApiAtuais = turmas;
  const usuarios = dados.accounts.map(usuario => ({
    id: usuario.id,
    email: usuario.email,
    username: usuario.username,
    perfil: usuario.role,
    ativo: usuario.active,
    turma: usuario.classes?.[0] || ''
  }));
  localStorage.setItem('educa-usuarios', JSON.stringify(usuarios));
  atualizarEstatisticasMenus();
}

async function restaurarSessaoApi() {
  try {
    const dados = await solicitarApi('/api/auth/me');
    if (dados.account) entrarNaContaApi(dados.account);
  } catch {
    // Uma sessão ausente ou expirada mantém o formulário de login visível.
  }
}

async function migrarContaLocalLegada(email, senha, perfil) {
  const chave = `user_${email}`;
  const contaLocalRaw = localStorage.getItem(chave);
  if (!contaLocalRaw) return null;

  let contaLocal;
  try {
    contaLocal = JSON.parse(contaLocalRaw);
  } catch {
    return null;
  }
  if (contaLocal.perfil !== perfil || contaLocal.senha !== senha) return null;

  const dados = await solicitarApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      identifier: email,
      loginMethod: 'email',
      role: perfil,
      password: senha,
      legacyImport: true
    })
  });
  localStorage.removeItem(chave);
  return dados;
}

async function autenticar() {
  const campoIdentificador = document.getElementById('usuario');
  const metodo = perfilSelecionado === 'aluno'
    ? 'email'
    : document.getElementById('metodo-acesso').value;
  const identifier = campoIdentificador.value.trim().toLowerCase();
  const password = document.getElementById('senha').value;
  const joinCode = document.getElementById('codigo-turma-aluno').value.trim().toUpperCase();
  if (!identifier || !password) {
    alert('Preencha o identificador e a senha para continuar.');
    return;
  }
  if (metodo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    alert('Digite um e-mail válido para continuar.');
    return;
  }
  if (metodo === 'username' && !/^[a-z0-9._-]{3,32}$/.test(identifier)) {
    alert('O usuário deve ter de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
    return;
  }
  if (joinCode && perfilSelecionado !== 'aluno') {
    alert('O código de turma só pode ser usado por alunos.');
    return;
  }

  const payload = {
    identifier,
    loginMethod: metodo,
    role: perfilSelecionado,
    password
  };

  try {
    let resultado;
    if (!modoLogin) {
      resultado = await solicitarApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...payload, joinCode })
      });
      alert(`Conta de ${perfilEmTexto(perfilSelecionado)} criada com sucesso.`);
    } else {
      try {
        resultado = await solicitarApi('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (erroLogin) {
        if (erroLogin.code !== 'account_not_found' || metodo !== 'email') throw erroLogin;
        resultado = await migrarContaLocalLegada(identifier, password, perfilSelecionado);
        if (!resultado) throw erroLogin;
        alert('Sua conta antiga foi transferida para o acesso compartilhado.');
      }
    }

    entrarNaContaApi(resultado.account);
    campoIdentificador.value = '';
    document.getElementById('senha').value = '';
    document.getElementById('codigo-turma-aluno').value = '';
  } catch (erro) {
    alert(erro.message || 'Não foi possível acessar sua conta.');
  }
}

async function fazerLogout() {
  try {
    await solicitarApi('/api/auth/logout', { method: 'POST', body: '{}' });
  } catch (erro) {
    console.warn('Não foi possível encerrar a sessão no servidor.', erro);
  }
  usuarioLogado = null;
  contaAtual = null;
  ocultarTodasAsSecoes();
  document.getElementById('secao-auth').classList.remove('hidden');
  document.getElementById('usuario').value = '';
  document.getElementById('senha').value = '';
  document.getElementById('codigo-turma-aluno').value = '';
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
    'secao-gerenciar-alunos', 'secao-gerenciar-turmas', 'secao-entrar-turma',
    'secao-contas-plataforma', 'secao-notas', 'secao-agenda-atividades',
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
  if (!dadosUsuario) return;
  const usuarios = lerUsuariosSalvos();
  const email = dadosUsuario.email?.toLowerCase() || null;
  const username = dadosUsuario.username?.toLowerCase() || null;
  const perfil = dadosUsuario.perfil || dadosUsuario.role;
  const chave = email || username;
  if (!chave) return;
  const existente = usuarios.find(usuario =>
    (dadosUsuario.id && usuario.id === dadosUsuario.id) ||
    (email && usuario.email === email) ||
    (username && usuario.username === username)
  );
  if (existente) {
    existente.id = dadosUsuario.id || existente.id;
    existente.email = email || existente.email;
    existente.username = username || existente.username;
    existente.perfil = perfil;
    existente.ativo = dadosUsuario.active ?? existente.ativo ?? true;
    if (dadosUsuario.turma) existente.turma = dadosUsuario.turma;
  } else {
    usuarios.push({
      id: dadosUsuario.id,
      email,
      username,
      perfil,
      ativo: dadosUsuario.active ?? true,
      ...(dadosUsuario.turma ? { turma: dadosUsuario.turma } : {}),
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

async function irParaPainelProgramador() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-painel-programador').classList.remove('hidden');
  document.getElementById('detalhes-compartilhados-programador').innerHTML =
    '<div class="lista-vazia">Carregando dados compartilhados…</div>';
  try {
    const [contasData, turmasData, notasData] = await Promise.all([
      solicitarApi('/api/accounts'),
      buscarTurmasApi(),
      solicitarApi('/api/grades')
    ]);
    const contas = contasData.accounts || [];
    const turmas = turmasData || [];
    const notas = notasData.grades || [];
    const atividadesLocais = lerAtividadesSalvas();
    const alunos = contas.filter(conta => conta.role === 'aluno').length;
    const professores = contas.filter(conta => conta.role === 'professor').length;
    document.getElementById('resumo-programador').innerHTML = `
      <div class="resumo-card"><strong>${contas.length}</strong><span>Contas compartilhadas</span></div>
      <div class="resumo-card"><strong>${turmas.length}</strong><span>Turmas</span></div>
      <div class="resumo-card"><strong>${notas.length}</strong><span>Notas</span></div>
      <div class="resumo-card"><strong>${alunos}</strong><span>Alunos · ${professores} professores</span></div>
    `;
    renderizarDetalhesProgramador(contas, atividadesLocais, turmas, notas);
  } catch (erro) {
    document.getElementById('resumo-programador').innerHTML = '';
    document.getElementById('detalhes-compartilhados-programador').innerHTML =
      `<div class="lista-vazia mensagem-erro">${escapeHtml(erro.message)}</div>`;
    renderizarDetalhesProgramador([], lerAtividadesSalvas(), [], []);
  }
}

function renderizarDetalhesProgramador(contas, atividades, turmas = [], notas = []) {
  const painelCompartilhado = document.getElementById('detalhes-compartilhados-programador');
  const painelLocal = document.getElementById('detalhes-programador');
  if (!painelCompartilhado || !painelLocal) return;

  const perfis = Object.keys(nomesPerfis).map(role => ({
    role,
    total: contas.filter(conta => conta.role === role).length
  }));
  const contasHtml = contas.length
    ? [...contas]
      .sort((a, b) => (a.email || a.username || '').localeCompare(b.email || b.username || ''))
      .map(conta => `
        <div class="info-linha">
          <span>${escapeHtml(conta.email || conta.username)}</span>
          <small>${perfilEmTexto(conta.role)}${conta.classes?.length ? ` · ${conta.classes.map(escapeHtml).join(', ')}` : ''} · ${conta.active ? 'Ativa' : 'Suspensa'}</small>
        </div>
      `).join('')
    : '<div class="info-vazio">Nenhuma conta registrada.</div>';

  const turmasHtml = turmas.length
    ? turmas.map(turma => `
      <div class="info-linha">
        <span>${escapeHtml(turma.name)}</span>
        <small>${escapeHtml(turma.teacher_identifier || 'Sem professor')} · ${Number(turma.member_count || 0)} aluno(s)${turma.join_code ? ` · Código ${escapeHtml(turma.join_code)}` : ''}</small>
      </div>
    `).join('')
    : '<div class="info-vazio">Nenhuma turma registrada.</div>';

  const notasHtml = notas.length
    ? notas.slice(0, 30).map(nota => {
      const possible = Number(nota.possible_points);
      const earned = Number(nota.earned_points);
      const score = possible > 0 ? (earned / possible) * 10 : 0;
      return `
        <div class="info-linha">
          <span>${escapeHtml(nota.activity_title)} — ${escapeHtml(nota.student_identifier)}</span>
          <small>${escapeHtml(nota.class_name)} · ${earned.toFixed(2)}/${possible.toFixed(2)} pts · nota ${score.toFixed(2)}/10</small>
        </div>
      `;
    }).join('')
    : '<div class="info-vazio">Nenhuma nota registrada.</div>';

  const atividadesHtml = atividades.length
    ? [...atividades]
      .sort((a, b) => new Date(a.publicadaEm || 0) - new Date(b.publicadaEm || 0))
      .map(atividade => {
        const liberada = atividadeFoiLiberada(atividade);
        const destinatarios = Array.isArray(atividade.alunosSelecionados)
          ? atividade.alunosSelecionados.map(email => escapeHtml(email)).join(', ')
          : 'Todos os alunos';
        const conclusoes = Object.values(atividade.statusAlunos || {})
          .filter(status => status === 'concluida').length;
        return `
          <div class="info-atividade">
            <div class="info-atividade-topo">
              <b>📋 ${escapeHtml(atividade.titulo)}</b>
              <span class="tech-status ${liberada ? 'liberada' : 'agendada'}">${liberada ? 'Lançada' : 'Agendada'}</span>
            </div>
            <div class="info-atividade-detalhes">
              <span>✍️ ${escapeHtml(atividade.criador || 'não informado')}</span>
              <span>🗓️ ${atividade.publicadaEm ? formatarDataAgenda(atividade.publicadaEm) : 'imediata'}</span>
              <span>👥 ${destinatarios || 'Nenhum aluno'}</span>
              <span>✅ ${conclusoes} conclusão(ões) · ${atividade.questoes?.length || 0} questão(ões)</span>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="info-vazio">Nenhuma atividade registrada.</div>';

  const perfisHtml = perfis.map(item =>
    `<span class="info-chip">${perfilEmTexto(item.role)} <b>${item.total}</b></span>`
  ).join('');

  painelCompartilhado.innerHTML = `
    <div class="detalhe-bloco">
      <div class="detalhe-bloco-titulo"><b>Contas compartilhadas</b><small>Dados de acesso sem exibir senhas</small></div>
      <div class="info-chips">${perfisHtml}</div>
      <div class="info-lista">${contasHtml}</div>
    </div>
    <div class="detalhe-bloco">
      <div class="detalhe-bloco-titulo"><b>Todas as turmas</b><small>Responsáveis, matrículas e códigos</small></div>
      <div class="info-lista">${turmasHtml}</div>
    </div>
    <div class="detalhe-bloco">
      <div class="detalhe-bloco-titulo"><b>Notas registradas</b><small>${notas.length} registro(s) · exibindo até 30</small></div>
      <div class="info-lista">${notasHtml}</div>
    </div>
  `;
  painelLocal.innerHTML = `
    <div class="detalhe-bloco">
      <div class="detalhe-bloco-titulo"><b>Atividades deste aparelho</b><small>Agenda, destinatários e progresso guardados localmente</small></div>
      <div class="info-lista">${atividadesHtml}</div>
    </div>
  `;
}

// ── RECURSO DO PROFESSOR/DIRETOR: GERENCIAR USUÁRIOS ────────────────
async function irParaGerenciarAlunos() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-gerenciar-alunos').classList.remove('hidden');

  const container = document.getElementById('banco-alunos-lista');
  container.innerHTML = '<div class="item-lista">Carregando contas compartilhadas…</div>';
  try {
    const { accounts } = await solicitarApi('/api/accounts');
    if (!accounts.length) {
      container.innerHTML = '<div class="item-lista" style="color: var(--text-muted)">Nenhum aluno encontrado nas turmas administradas por esta conta.</div>';
      return;
    }
    const grupos = new Map();
    accounts.forEach(aluno => {
      const salas = aluno.classes?.length ? aluno.classes : ['Sem turma'];
      salas.forEach(sala => {
        if (!grupos.has(sala)) grupos.set(sala, []);
        grupos.get(sala).push(aluno);
      });
    });
    container.innerHTML = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([sala, alunos]) => `
      <div class="grupo-usuarios">
        <div class="grupo-usuarios-titulo"><b>${escapeHtml(sala)}</b><span>${alunos.length} aluno(s)</span></div>
        ${alunos.map(aluno => `
          <div class="item-lista">
            ${{aluno:'🧑‍🎓',professor:'👨‍🏫',diretor:'🏫',programador:'💻'}[aluno.role] || '👤'}
            <b>${escapeHtml(aluno.email || aluno.username)}</b>
            <span class="perfil-tag">${perfilEmTexto(aluno.role)} · ${aluno.active ? 'Ativa' : 'Suspensa'}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch (erro) {
    container.innerHTML = `<div class="item-lista mensagem-erro">${escapeHtml(erro.message)}</div>`;
  }
}

async function buscarTurmasApi() {
  const dados = await solicitarApi('/api/classes');
  return dados.classes || [];
}

async function irParaGerenciarTurmas() {
  if (!contaAtual || !['professor', 'diretor', 'programador'].includes(contaAtual.role)) {
    alert('Entre como professor, diretor ou programador para administrar turmas.');
    return;
  }
  ocultarTodasAsSecoes();
  document.getElementById('secao-gerenciar-turmas').classList.remove('hidden');
  const ehProfessor = contaAtual.role === 'professor';
  document.getElementById('titulo-gerenciar-turmas').innerText =
    ehProfessor ? 'Minhas turmas' : 'Administrar turmas';
  document.getElementById('descricao-gerenciar-turmas').innerText = ehProfessor
    ? 'Crie salas, compartilhe o código de entrada e transfira alunos entre suas turmas.'
    : 'Consulte todas as salas, gerencie seus responsáveis e acompanhe os alunos.';
  document.getElementById('nome-nova-turma').value = '';

  try {
    const [turmas, contas] = await Promise.all([
      buscarTurmasApi(),
      ['diretor', 'programador'].includes(contaAtual.role)
        ? solicitarApi('/api/accounts')
        : Promise.resolve({ accounts: [] })
    ]);
    window.turmasApiAtuais = turmas;
    const professores = (contas.accounts || []).filter(conta => conta.role === 'professor');
    const seletorResponsavel = document.getElementById('campo-professor-responsavel');
    const seletorProfessor = document.getElementById('professor-responsavel-turma');
    const podeAtribuirProfessor = ['diretor', 'programador'].includes(contaAtual.role);
    seletorResponsavel.classList.toggle('hidden', !podeAtribuirProfessor);
    seletorProfessor.innerHTML = '<option value="">Sem professor atribuído</option>' +
      professores.map(professor =>
        `<option value="${escapeHtml(professor.id)}">${escapeHtml(professor.email || professor.username)}</option>`
      ).join('');
    renderizarTurmasApi(turmas, professores);
  } catch (erro) {
    document.getElementById('lista-turmas-api').innerHTML =
      `<div class="item-lista mensagem-erro">${escapeHtml(erro.message)}</div>`;
  }
}

function renderizarTurmasApi(turmas, professores = []) {
  const container = document.getElementById('lista-turmas-api');
  if (!turmas.length) {
    container.innerHTML = '<div class="lista-vazia">Nenhuma turma criada ainda.</div>';
    return;
  }
  const ehProfessor = contaAtual?.role === 'professor';
  const podeAdministrarTudo = ['diretor', 'programador'].includes(contaAtual?.role);
  container.innerHTML = turmas.map(turma => {
    const membros = Array.isArray(turma.members) ? turma.members : [];
    const membrosHtml = membros.length
      ? membros.map(aluno => {
        const destinos = turmas.filter(destino => destino.id !== turma.id);
        const transferenciaHtml = destinos.length
          ? `<div class="transferir-aluno">
              <select id="destino-${turma.id}-${aluno.id}" aria-label="Sala de destino">
                <option value="">Transferir para…</option>
                ${destinos.map(destino => `<option value="${escapeHtml(destino.id)}">${escapeHtml(destino.name)}</option>`).join('')}
              </select>
              <button class="btn-secundario" onclick="transferirAlunoApi('${escapeHtml(turma.id)}', '${escapeHtml(aluno.id)}')">Transferir</button>
            </div>`
          : '';
        return `
          <div class="membro-turma">
            <div><b>${escapeHtml(aluno.email || aluno.username)}</b><small>Aluno</small></div>
            ${ehProfessor ? transferenciaHtml : ''}
          </div>
        `;
      }).join('')
      : '<div class="lista-vazia">Ainda não há alunos nesta turma.</div>';

    const editavel = ehProfessor || podeAdministrarTudo;
    const professorAtual = turma.teacher_id || '';
    const controlesHtml = editavel ? `
      <div class="controles-turma">
        <div class="campo">
          <label for="nome-turma-${turma.id}">Nome da turma</label>
          <input id="nome-turma-${turma.id}" value="${escapeHtml(turma.name)}" maxlength="80">
        </div>
        ${podeAdministrarTudo ? `
          <div class="campo">
            <label for="responsavel-turma-${turma.id}">Professor responsável</label>
            <select id="responsavel-turma-${turma.id}">
              <option value="">Sem professor atribuído</option>
              ${professores.map(professor => `
                <option value="${escapeHtml(professor.id)}" ${professor.id === professorAtual ? 'selected' : ''}>
                  ${escapeHtml(professor.email || professor.username)}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}
        <div class="acoes-turma">
          <button class="btn-secundario" onclick="salvarTurmaApi('${escapeHtml(turma.id)}', ${podeAdministrarTudo})">Salvar alterações</button>
          <button class="btn-perigo" onclick="excluirTurmaApi('${escapeHtml(turma.id)}', '${escapeHtml(turma.name)}')">Excluir turma</button>
        </div>
      </div>` : '';

    return `
      <article class="turma-card">
        <div class="turma-card-topo">
          <div><h3>${escapeHtml(turma.name)}</h3><span>${turma.member_count || membros.length || 0} aluno(s)</span></div>
          ${turma.join_code ? `<button class="codigo-turma" onclick="copiarCodigoTurma('${escapeHtml(turma.join_code)}')" title="Copiar código">Código: <b>${escapeHtml(turma.join_code)}</b> <span>Copiar</span></button>` : ''}
        </div>
        ${!ehProfessor && turma.teacher_identifier ? `<div class="responsavel-turma">Professor: ${escapeHtml(turma.teacher_identifier)}</div>` : ''}
        ${controlesHtml}
        <div class="lista-membros-turma">${membrosHtml}</div>
      </article>
    `;
  }).join('');
}

async function criarTurmaApi() {
  const name = document.getElementById('nome-nova-turma').value.trim();
  if (name.length < 2) {
    alert('Digite um nome para a turma.');
    return;
  }
  const payload = { name };
  if (['diretor', 'programador'].includes(contaAtual?.role)) {
    payload.teacherId = document.getElementById('professor-responsavel-turma').value || null;
  }
  try {
    const resultado = await solicitarApi('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(`Turma criada. Código para compartilhar: ${resultado.classroom.join_code}`);
    await irParaGerenciarTurmas();
  } catch (erro) {
    alert(erro.message);
  }
}

async function salvarTurmaApi(classId, podeAtribuirProfessor) {
  const payload = {
    name: document.getElementById(`nome-turma-${classId}`).value.trim()
  };
  if (podeAtribuirProfessor) {
    payload.teacherId = document.getElementById(`responsavel-turma-${classId}`).value || null;
  }
  try {
    await solicitarApi(`/api/classes/${encodeURIComponent(classId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    await irParaGerenciarTurmas();
  } catch (erro) {
    alert(erro.message);
  }
}

async function excluirTurmaApi(classId, className) {
  if (!confirm(`Excluir a turma "${className}"? Os alunos perderão o vínculo e as notas registradas nesta turma serão apagadas.`)) return;
  try {
    await solicitarApi(`/api/classes/${encodeURIComponent(classId)}`, { method: 'DELETE' });
    await irParaGerenciarTurmas();
  } catch (erro) {
    alert(erro.message);
  }
}

async function transferirAlunoApi(sourceClassId, studentId) {
  const seletor = document.getElementById(`destino-${sourceClassId}-${studentId}`);
  const targetClassId = seletor?.value;
  if (!targetClassId) {
    alert('Escolha a turma de destino.');
    return;
  }
  const destino = (window.turmasApiAtuais || []).find(turma => turma.id === targetClassId);
  if (!confirm(`Transferir este aluno para "${destino?.name || 'a turma selecionada'}"?`)) return;
  try {
    await solicitarApi(`/api/classes/${encodeURIComponent(sourceClassId)}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ studentId, targetClassId })
    });
    await irParaGerenciarTurmas();
  } catch (erro) {
    alert(erro.message);
  }
}

async function copiarCodigoTurma(code) {
  try {
    await navigator.clipboard.writeText(code);
    alert('Código copiado.');
  } catch {
    prompt('Copie este código e envie aos alunos:', code);
  }
}

async function irParaEntrarTurma() {
  if (contaAtual?.role !== 'aluno') {
    alert('Entre como aluno para acessar suas turmas.');
    return;
  }
  ocultarTodasAsSecoes();
  document.getElementById('secao-entrar-turma').classList.remove('hidden');
  document.getElementById('codigo-entrada-turma').value = '';
  await carregarTurmasAluno();
}

async function carregarTurmasAluno() {
  const container = document.getElementById('lista-turmas-aluno');
  try {
    const turmas = await buscarTurmasApi();
    container.innerHTML = turmas.length
      ? turmas.map(turma => `
        <article class="turma-card">
          <div class="turma-card-topo"><div><h3>${escapeHtml(turma.name)}</h3><span>Turma ativa</span></div></div>
          ${turma.teacher_identifier ? `<div class="responsavel-turma">Professor: ${escapeHtml(turma.teacher_identifier)}</div>` : ''}
        </article>
      `).join('')
      : '<div class="lista-vazia">Você ainda não entrou em nenhuma turma.</div>';
  } catch (erro) {
    container.innerHTML = `<div class="lista-vazia mensagem-erro">${escapeHtml(erro.message)}</div>`;
  }
}

async function entrarTurmaPorCodigo() {
  const code = document.getElementById('codigo-entrada-turma').value.trim().toUpperCase();
  if (!code) {
    alert('Digite o código enviado pelo professor.');
    return;
  }
  try {
    await solicitarApi('/api/classes/join', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    document.getElementById('codigo-entrada-turma').value = '';
    await carregarTurmasAluno();
  } catch (erro) {
    alert(erro.message);
  }
}

async function irParaContasPlataforma() {
  if (contaAtual?.role !== 'programador') {
    alert('Somente o Programador pode administrar contas da plataforma.');
    return;
  }
  ocultarTodasAsSecoes();
  document.getElementById('secao-contas-plataforma').classList.remove('hidden');
  await carregarContasPlataforma();
}

async function carregarContasPlataforma() {
  const container = document.getElementById('lista-contas-plataforma');
  container.innerHTML = '<div class="lista-vazia">Carregando contas…</div>';
  try {
    const { accounts } = await solicitarApi('/api/accounts');
    container.innerHTML = accounts.length ? accounts.map(account => {
      const proprio = account.id === contaAtual?.id;
      const perfisDisponiveis = Object.entries(nomesPerfis).filter(([role]) =>
        ['aluno', 'professor'].includes(role) || role === account.role
      );
      return `
        <article class="conta-admin-card">
          <div class="conta-admin-cabecalho">
            <b>${escapeHtml(account.email || account.username)}${proprio ? ' · você' : ''}</b>
            <span class="perfil-tag">${perfilEmTexto(account.role)}</span>
          </div>
          <div class="conta-admin-campos">
            <div class="campo">
              <label for="conta-email-${account.id}">E-mail</label>
              <input type="email" id="conta-email-${account.id}" value="${escapeHtml(account.email || '')}" placeholder="Sem e-mail" ${proprio ? 'disabled' : ''}>
            </div>
            <div class="campo">
              <label for="conta-usuario-${account.id}">Usuário</label>
              <input type="text" id="conta-usuario-${account.id}" value="${escapeHtml(account.username || '')}" placeholder="Sem usuário" ${proprio ? 'disabled' : ''}>
            </div>
            <div class="campo">
              <label for="conta-perfil-${account.id}">Perfil</label>
              <select id="conta-perfil-${account.id}" ${proprio ? 'disabled' : ''}>
                ${perfisDisponiveis.map(([role, name]) =>
                  `<option value="${role}" ${account.role === role ? 'selected' : ''}>${name}</option>`
                ).join('')}
              </select>
            </div>
            <div class="campo">
              <label for="conta-estado-${account.id}">Estado</label>
              <select id="conta-estado-${account.id}" ${proprio ? 'disabled' : ''}>
                <option value="true" ${account.active ? 'selected' : ''}>Ativa</option>
                <option value="false" ${!account.active ? 'selected' : ''}>Suspensa</option>
              </select>
            </div>
          </div>
          <div class="conta-admin-acoes">
            ${proprio
              ? '<small>A conta de administrador em uso não pode ser alterada ou excluída.</small>'
              : `<button class="btn-secundario" onclick="salvarContaPlataforma('${escapeHtml(account.id)}')">Salvar alterações</button>
                 <button class="btn-perigo" onclick="excluirContaPlataforma('${escapeHtml(account.id)}', '${escapeHtml(account.email || account.username)}')">Excluir conta</button>`}
          </div>
        </article>
      `;
    }).join('') : '<div class="lista-vazia">Nenhuma conta cadastrada.</div>';
  } catch (erro) {
    container.innerHTML = `<div class="lista-vazia mensagem-erro">${escapeHtml(erro.message)}</div>`;
  }
}

async function salvarContaPlataforma(accountId) {
  const email = document.getElementById(`conta-email-${accountId}`).value.trim() || null;
  const username = document.getElementById(`conta-usuario-${accountId}`).value.trim() || null;
  const role = document.getElementById(`conta-perfil-${accountId}`).value;
  const active = document.getElementById(`conta-estado-${accountId}`).value === 'true';
  try {
    await solicitarApi(`/api/accounts/${encodeURIComponent(accountId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ email, username, role, active })
    });
    await carregarContasPlataforma();
  } catch (erro) {
    alert(erro.message);
  }
}

async function excluirContaPlataforma(accountId, identifier) {
  if (!confirm(`Excluir a conta "${identifier}"? O acesso será encerrado, os vínculos com turmas e as notas serão apagados. Esta ação não pode ser desfeita.`)) return;
  try {
    await solicitarApi(`/api/accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' });
    const usuarios = lerUsuariosSalvos().filter(usuario => usuario.id !== accountId);
    localStorage.setItem('educa-usuarios', JSON.stringify(usuarios));
    if (identifier.includes('@')) localStorage.removeItem(`user_${identifier}`);
    await carregarContasPlataforma();
  } catch (erro) {
    alert(erro.message);
  }
}

async function irParaNotas() {
  if (!contaAtual || !['aluno', 'professor', 'diretor', 'programador'].includes(contaAtual.role)) {
    alert('Entre na sua conta para acessar as notas.');
    return;
  }
  ocultarTodasAsSecoes();
  document.getElementById('secao-notas').classList.remove('hidden');
  const aluno = contaAtual.role === 'aluno';
  document.getElementById('titulo-notas').innerText = aluno ? 'Minhas notas' : 'Notas e pontos';
  document.getElementById('descricao-notas').innerText = aluno
    ? 'Consulte os pontos e as notas registrados nas suas atividades.'
    : 'Registre os pontos das questões e a nota total de cada atividade.';
  document.getElementById('form-notas').classList.toggle('hidden', aluno);
  document.getElementById('atividade-nota').value = '';
  questoesNotaFormulario = [{ title: '', possible: 1, earned: 0 }];
  renderizarQuestoesNota();

  if (!aluno) {
    try {
      const turmas = await buscarTurmasApi();
      window.turmasApiAtuais = turmas;
      const seletor = document.getElementById('turma-nota');
      seletor.innerHTML = '<option value="">Selecione uma turma</option>' +
        turmas.map(turma => `<option value="${escapeHtml(turma.id)}">${escapeHtml(turma.name)}</option>`).join('');
      atualizarAlunosNota();
    } catch (erro) {
      document.getElementById('lista-notas-api').innerHTML =
        `<div class="lista-vazia mensagem-erro">${escapeHtml(erro.message)}</div>`;
    }
  }
  await carregarNotasApi();
}

function atualizarAlunosNota() {
  const classId = document.getElementById('turma-nota').value;
  const turma = (window.turmasApiAtuais || []).find(item => item.id === classId);
  const seletor = document.getElementById('aluno-nota');
  const membros = Array.isArray(turma?.members) ? turma.members : [];
  seletor.innerHTML = '<option value="">Selecione um aluno</option>' +
    membros.map(aluno => `<option value="${escapeHtml(aluno.id)}">${escapeHtml(aluno.email || aluno.username)}</option>`).join('');
}

function adicionarQuestaoNota() {
  if (questoesNotaFormulario.length >= 8) {
    alert('Cada atividade pode ter até 8 questões.');
    return;
  }
  questoesNotaFormulario.push({ title: '', possible: 1, earned: 0 });
  renderizarQuestoesNota();
}

function removerQuestaoNota(index) {
  if (questoesNotaFormulario.length <= 1) return;
  questoesNotaFormulario.splice(index, 1);
  renderizarQuestoesNota();
}

function atualizarCampoQuestaoNota(index, field, value) {
  if (!questoesNotaFormulario[index]) return;
  questoesNotaFormulario[index][field] = field === 'title' ? value : Number(value);
  atualizarResumoPontosNota();
}

function renderizarQuestoesNota() {
  const container = document.getElementById('questoes-nota-formulario');
  if (!container) return;
  container.innerHTML = questoesNotaFormulario.map((questao, index) => `
    <div class="questao-nota-linha">
      <div class="questao-nota-enunciado">
        <label for="titulo-questao-nota-${index}">Questão ${index + 1}</label>
        <input id="titulo-questao-nota-${index}" maxlength="180" value="${escapeHtml(questao.title)}"
          placeholder="Ex.: Questão sobre frações"
          oninput="atualizarCampoQuestaoNota(${index}, 'title', this.value)">
      </div>
      <div class="questao-nota-valor">
        <label for="valor-possivel-nota-${index}">Pontos possíveis</label>
        <input id="valor-possivel-nota-${index}" type="number" min="0.01" step="0.01" value="${escapeHtml(questao.possible)}"
          oninput="atualizarCampoQuestaoNota(${index}, 'possible', this.value)">
      </div>
      <div class="questao-nota-valor">
        <label for="valor-obtido-nota-${index}">Pontos obtidos</label>
        <input id="valor-obtido-nota-${index}" type="number" min="0" step="0.01" value="${escapeHtml(questao.earned)}"
          oninput="atualizarCampoQuestaoNota(${index}, 'earned', this.value)">
      </div>
      ${questoesNotaFormulario.length > 1
        ? `<button class="btn-perigo remover-questao-nota" type="button" onclick="removerQuestaoNota(${index})" aria-label="Remover questão ${index + 1}">Remover</button>`
        : ''}
    </div>
  `).join('');
  document.getElementById('btn-adicionar-questao-nota').disabled = questoesNotaFormulario.length >= 8;
  atualizarResumoPontosNota();
}

function atualizarResumoPontosNota() {
  const possiveis = questoesNotaFormulario.reduce((total, item) =>
    total + (Number.isFinite(Number(item.possible)) ? Number(item.possible) : 0), 0);
  const obtidos = questoesNotaFormulario.reduce((total, item) =>
    total + (Number.isFinite(Number(item.earned)) ? Number(item.earned) : 0), 0);
  const nota = possiveis > 0 ? (obtidos / possiveis) * 10 : 0;
  const resumo = document.getElementById('resumo-pontos-nota');
  if (resumo) {
    resumo.innerText = `Nota total: ${obtidos.toFixed(2)} / ${possiveis.toFixed(2)} pontos · ${nota.toFixed(2)} / 10`;
  }
}

async function salvarNotaAtividade() {
  const classroomId = document.getElementById('turma-nota').value;
  const studentId = document.getElementById('aluno-nota').value;
  const activityTitle = document.getElementById('atividade-nota').value.trim();
  if (!classroomId || !studentId || activityTitle.length < 2) {
    alert('Selecione a turma e o aluno e informe o nome da atividade.');
    return;
  }
  const questionScores = questoesNotaFormulario.map(item => ({
    title: item.title.trim(),
    possible: Number(item.possible),
    earned: Number(item.earned)
  }));
  if (questionScores.some(item =>
    !item.title || !Number.isFinite(item.possible) || item.possible <= 0 ||
    !Number.isFinite(item.earned) || item.earned < 0 || item.earned > item.possible
  )) {
    alert('Revise o enunciado e os pontos possíveis e obtidos de cada questão.');
    return;
  }
  try {
    await solicitarApi('/api/grades', {
      method: 'POST',
      body: JSON.stringify({ classroomId, studentId, activityTitle, questionScores })
    });
    alert('Nota salva.');
    await carregarNotasApi();
  } catch (erro) {
    alert(erro.message);
  }
}

async function carregarNotasApi() {
  const container = document.getElementById('lista-notas-api');
  if (!container) return;
  container.innerHTML = '<div class="lista-vazia">Carregando notas…</div>';
  try {
    const { grades } = await solicitarApi('/api/grades');
    container.innerHTML = grades.length ? grades.map(grade => {
      const possible = Number(grade.possible_points);
      const earned = Number(grade.earned_points);
      const note = possible > 0 ? (earned / possible) * 10 : 0;
      const questions = Array.isArray(grade.question_scores) ? grade.question_scores : [];
      return `
        <article class="nota-card">
          <div class="nota-card-topo">
            <div><h3>${escapeHtml(grade.activity_title)}</h3><span>${escapeHtml(grade.class_name)} · ${escapeHtml(grade.student_identifier)}</span></div>
            <div class="nota-total"><b>${note.toFixed(2)}</b><small>/ 10</small></div>
          </div>
          <div class="nota-resumo-pontos">${earned.toFixed(2)} de ${possible.toFixed(2)} pontos</div>
          <div class="nota-questoes">
            ${questions.map((question, index) => `
              <div><span>Questão ${index + 1}: ${escapeHtml(question.title)}</span><b>${Number(question.earned).toFixed(2)} / ${Number(question.possible).toFixed(2)}</b></div>
            `).join('')}
          </div>
        </article>
      `;
    }).join('') : '<div class="lista-vazia">Nenhuma nota registrada ainda.</div>';
  } catch (erro) {
    container.innerHTML = `<div class="lista-vazia mensagem-erro">${escapeHtml(erro.message)}</div>`;
  }
}

function voltarDoPainelNotas() {
  if (contaAtual?.role === 'aluno') voltarParaMenuAluno();
  else voltarParaMenuGestao();
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
  const alunos = obterAlunosComTurma();
  if (!alunos.length) {
    container.innerHTML = '<div class="seletor-vazio">Nenhum aluno cadastrado. Cadastre alunos antes de agendar uma atividade.</div>';
    return;
  }

  const grupos = new Map();
  alunos.forEach(aluno => {
    const chave = aluno.turma || 'sem-turma';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(aluno);
  });

  container.innerHTML = [...grupos.entries()].map(([turma, estudantes], grupoIndex) => `
    <div class="grupo-turma" data-turma="${escapeHtml(turma)}">
      <div class="grupo-turma-header">
        <span><b>${escapeHtml(turmaEmTexto(turma))}</b><small>${estudantes.length} aluno(s)</small></span>
        <label class="checkbox-opcao checkbox-sala">
          <input type="checkbox" onchange="selecionarTurmaAtividade('${escapeHtml(turma)}', this.checked)">
          <span>Selecionar sala</span>
        </label>
      </div>
      <div class="grupo-turma-alunos">
        ${estudantes.map((aluno, alunoIndex) => `
          <label class="checkbox-opcao aluno-opcao" for="aluno-atividade-${grupoIndex}-${alunoIndex}">
            <input class="aluno-checkbox" type="checkbox" id="aluno-atividade-${grupoIndex}-${alunoIndex}" value="${escapeHtml(aluno.email)}" data-turma="${escapeHtml(turma)}" onchange="atualizarEstadoSelecionarTodos()">
            <span>${escapeHtml(aluno.email)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function alternarTodosAlunosAtividade(selecionado) {
  document.querySelectorAll('#seletor-alunos-atividade .aluno-checkbox').forEach(input => {
    input.checked = selecionado;
  });
  document.querySelectorAll('#seletor-alunos-atividade .checkbox-sala input').forEach(input => {
    input.checked = selecionado;
  });
}

function selecionarTurmaAtividade(turma, selecionado) {
  document.querySelectorAll('#seletor-alunos-atividade .aluno-checkbox').forEach(input => {
    if (input.dataset.turma === turma) input.checked = selecionado;
  });
  atualizarEstadoSelecionarTodos();
}

function atualizarEstadoSelecionarTodos() {
  const caixas = [...document.querySelectorAll('#seletor-alunos-atividade .aluno-checkbox')];
  const todos = caixas.length > 0 && caixas.every(input => input.checked);
  const seletorTodos = document.getElementById('selecionar-todos-alunos');
  if (seletorTodos) seletorTodos.checked = todos;
  document.querySelectorAll('#seletor-alunos-atividade .grupo-turma').forEach(grupo => {
    const caixasDaSala = [...grupo.querySelectorAll('.aluno-checkbox')];
    const seletorSala = grupo.querySelector('.checkbox-sala input');
    if (seletorSala) seletorSala.checked = caixasDaSala.length > 0 && caixasDaSala.every(input => input.checked);
  });
}

function obterAlunosSelecionadosAtividade() {
  return [...document.querySelectorAll('#seletor-alunos-atividade .aluno-checkbox:checked')]
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
    ['diretor', 'programador'].includes(perfilSelecionado) || atividade.criador === usuarioLogado
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

function finalizarCarregamentoInicial() {
  const tela = document.getElementById('initial-loader');
  if (!tela) return;

  const duracao = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 460;
  window.setTimeout(() => {
    tela.classList.add('is-hidden');
    tela.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => tela.remove(), 240);
  }, duracao);
}

selecionarPerfil('aluno');
restaurarSessaoApi();
finalizarCarregamentoInicial();