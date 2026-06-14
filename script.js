let modoLogin = true;
let perfilSelecionado = 'aluno'; // 'aluno' ou 'professor'
let usuarioLogado = null;

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

// ── SISTEMA DE TEMAS ─────────────────────────────────────────────────
function setTema(tema) {
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
    ],
    intermediario: [],
    avancado: []
  },
  quimica: { iniciante: [], intermediario: [], avancado: [] },
  historia: { iniciante: [], intermediario: [], avancado: [] },
  biologia: { iniciante: [], intermediario: [], avancado: [] }
};

// ── FLUXO DE LOGIN E PERFIL ──────────────────────────────────────────
function selecionarPerfil(perfil) {
  perfilSelecionado = perfil;
  document.querySelectorAll('.btn-perfil').forEach(btn => btn.classList.remove('ativo'));
  document.getElementById(`perfil-${perfil}`).classList.add('ativo');

  if (modoLogin) {
    document.getElementById('subtitulo-auth').innerText = `Faça login como ${perfil === 'aluno' ? 'Aluno' : 'Professor'} para continuar`;
  } else {
    document.getElementById('subtitulo-auth').innerText = `Preencha os dados para se registrar como ${perfil === 'aluno' ? 'Aluno' : 'Professor'}`;
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

function autenticar() {
  const user = document.getElementById('usuario').value.trim();
  const pass = document.getElementById('senha').value;
  if (!user || !pass) { alert("Por favor, preencha todos os campos."); return; }

  if (!modoLogin) {
    // Salva o tipo do perfil junto com as credenciais
    const dadosUsuario = { senha: pass, perfil: perfilSelecionado };
    localStorage.setItem('user_' + user, JSON.stringify(dadosUsuario));

    // Adiciona ao banco de dados simulado caso seja um aluno
    if (perfilSelecionado === 'aluno') {
      atualizarBancoAlunosLocal(user);
    }

    alert(`Conta de ${perfilSelecionado.toUpperCase()} criada com sucesso! 🎉`);
    alternarTela(true);
  } else {
    const dadosSalvosRaw = localStorage.getItem('user_' + user);
    if (dadosSalvosRaw) {
      const dadosSalvos = JSON.parse(dadosSalvosRaw);

      if (dadosSalvos.senha === pass && dadosSalvos.perfil === perfilSelecionado) {
        usuarioLogado = user;
        document.getElementById('secao-auth').classList.add('hidden');

        if (perfilSelecionado === 'aluno') {
          entrarMenuAluno();
        } else {
          entrarMenuProfessor();
        }
      } else {
        alert("Senha incorreta ou perfil de acesso inválido.");
      }
    } else {
      alert("Usuário não encontrado.");
    }
  }
}

function fazerLogout() {
  usuarioLogado = null;
  document.getElementById('secao-menu-aluno').classList.add('hidden');
  document.getElementById('secao-menu-professor').classList.add('hidden');
  document.getElementById('secao-auth').classList.remove('hidden');
  document.getElementById('usuario').value = '';
  document.getElementById('senha').value = '';
}

// ── INTERFACES DOS MENUS ─────────────────────────────────────────────
function entrarMenuAluno() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-aluno').classList.remove('hidden');
  document.getElementById('boas-vindas-aluno').innerText = `👋 Olá, ${usuarioLogado}!`;
}

function entrarMenuProfessor() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-menu-professor').classList.remove('hidden');
  document.getElementById('boas-vindas-professor').innerText = `👨‍🏫 Mestre ${usuarioLogado}`;
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

function ocultarTodasAsSecoes() {
  const secoes = ['secao-auth', 'secao-menu-aluno', 'secao-curso', 'secao-atividades-aluno', 'secao-menu-professor', 'secao-gerenciar-alunos', 'secao-atribuir-atividade', 'secao-aula'];
  secoes.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
}

// ── RECURSO DO PROFESSOR 1: GERENCIAR ALUNOS ─────────────────────────
function irParaGerenciarAlunos() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-gerenciar-alunos').classList.remove('hidden');

  const container = document.getElementById('banco-alunos-lista');
  container.innerHTML = '';

  let listaAlunos = JSON.parse(localStorage.getItem('educa-lista-alunos') || '[]');

  if (listaAlunos.length === 0) {
    container.innerHTML = '<div class="item-lista" style="color: var(--text-muted)">Nenhum aluno registrado no banco ainda.</div>';
    return;
  }

  listaAlunos.forEach(aluno => {
    const div = document.createElement('div');
    div.className = 'item-lista';
    div.innerHTML = `👤 <b>${aluno}</b> — Perfil: Aluno Ativo <span style="float: right; color: var(--success)">● Online</span>`;
    container.appendChild(div);
  });
}

function atualizarBancoAlunosLocal(novoAluno) {
  let listaAlunos = JSON.parse(localStorage.getItem('educa-lista-alunos') || '[]');
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
  questoesFormularioProfessor = [];
  renderizarFormularioQuestoes();
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
  if (!titulo) { alert("Dê um título para a sua atividade."); return; }
  if (questoesFormularioProfessor.length === 0) { alert("Adicione pelo menos 1 questão."); return; }

  // Estrutura a atividade customizada para envio
  const novaAtividade = {
    id: 'act_' + Date.now(),
    titulo: titulo,
    criador: usuarioLogado,
    questoes: questoesFormularioProfessor.map(q => {
      return {
        conteudo: `<b>📝 Atividade: ${titulo}</b><br><br>${q.enunciado}<br><br><b>A)</b> ${q.a}<br><b>B)</b> ${q.b}<br><b>C)</b> ${q.c}<br><b>D)</b> ${q.d}`,
        tipo: "palavra",
        resposta: q.correta.toLowerCase(),
        sinonimos: [q.correta.toLowerCase(), q.correta.toUpperCase()]
      };
    }),
    statusAlunos: {} // Controla quem já fez
  };

  let atividadesSalvas = JSON.parse(localStorage.getItem('educa-atividades') || '[]');
  atividadesSalvas.push(novaAtividade);
  localStorage.setItem('educa-atividades', JSON.stringify(atividadesSalvas));

  alert("Atividade publicada e enviada para todos os alunos! 🚀");
  voltarParaMenuProfessor();
}

// ── RECURSO DO ALUNO: CENTRAL DE ABAS DE ATIVIDADES ──────────────────
function irParaAtividadesAluno() {
  ocultarTodasAsSecoes();
  document.getElementById('secao-atividades-aluno').classList.remove('hidden');
  mudarAbaAluno('recentes');
}

function mudarAbaAluno(aba) {
  abaAtivaAluno = aba;
  document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));

  // Encontra o botão correspondente de forma segura
  const abasMapeadas = { recentes: 0, pendentes: 1, concluidas: 2 };
  document.querySelectorAll('.aba-btn')[abasMapeadas[aba]].classList.add('ativa');

  renderizarListaAtividadesAluno();
}

function renderizarListaAtividadesAluno() {
  const container = document.getElementById('lista-atividades-container');
  container.innerHTML = '';

  let atividadesSalvas = JSON.parse(localStorage.getItem('educa-atividades') || '[]');

  // Filtra as atividades com base na aba escolhida
  let filtradas = atividadesSalvas.filter(act => {
    const status = act.statusAlunos[usuarioLogado];
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
    const status = act.statusAlunos[usuarioLogado] === 'concluida' ? '✅ Concluída' : '⏳ Pendente';
    const div = document.createElement('div');
    div.className = 'item-lista';
    div.style.cursor = 'pointer';
    div.innerHTML = `📋 <b>${act.titulo}</b> <small>(Por: ${act.criador})</small> <span style="float: right; font-size:0.8rem;">${status}</span>`;

    if(act.statusAlunos[usuarioLogado] !== 'concluida') {
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

  filaQuestoes = embaralhar(banco[materiaAtual][nivelAtual]);
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
  if (filaQuestoes.length === 0) {
    document.getElementById('conteudo-aula').innerHTML = "<b>Nenhuma questão cadastrada nesta categoria ainda.</b>";
    return;
  }
  questaoAtual = filaQuestoes[indiceAtual];
  jaAcertou    = false;

  document.getElementById('conteudo-aula').innerHTML = questaoAtual.conteudo;
  document.getElementById('input-resposta').value = '';
  document.getElementById('input-resposta').disabled = false;
  document.getElementById('btn-verificar').disabled = false;
  document.getElementById('btn-proxima').classList.add('hidden');
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
      let atividadesSalvas = JSON.parse(localStorage.getItem('educa-atividades') || '[]');
      let index = atividadesSalvas.findIndex(act => act.id === nivelAtual);
      if (index !== -1) {
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
    if (tol > 0 && diff <= tol)      return { tipo: 'correto', margin: '✅ Resposta correta! Excelente!' };
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