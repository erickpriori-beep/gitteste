let modoLogin = true;
let questaoAtual = null;

// ── DADOS DAS QUESTÕES ──────────────────────────────────────────────
const questoes = {
  matematica: {
    iniciante: {
      conteudo: `<b>📐 Equação do 1º Grau</b><br><br>
        Uma equação do 1º grau tem a forma <b>ax + b = c</b>.<br><br>
        <b>Desafio:</b> Resolva <b>2x + 10 = 20</b>.<br>
        Isole o <em>x</em>: subtraia 10 dos dois lados e depois divida por 2.<br><br>
        <i>Qual é o valor de x?</i>`,
      tipo: "numero",
      resposta: 5,
      tolerancia: 1
    },
    intermediario: {
      conteudo: `<b>📐 Equação do 2º Grau</b><br><br>
        Use a fórmula de Bhaskara: <b>x = (−b ± √Δ) / 2a</b>, onde Δ = b² − 4ac.<br><br>
        <b>Desafio:</b> Resolva <b>x² − 5x + 6 = 0</b>.<br><br>
        <i>Qual é a SOMA das duas raízes?</i>`,
      tipo: "numero",
      resposta: 5,
      tolerancia: 0.5
    },
    avancado: {
      conteudo: `<b>📐 Progressão Aritmética</b><br><br>
        A fórmula do termo geral é <b>aₙ = a₁ + (n−1)·r</b>.<br><br>
        <b>Desafio:</b> Em uma PA com a₁ = 3 e razão r = 4, qual o valor do <b>10º termo</b>?<br><br>
        <i>Digite o valor de a₁₀.</i>`,
      tipo: "numero",
      resposta: 39,
      tolerancia: 2
    }
  },
  fisica: {
    iniciante: {
      conteudo: `<b>⚡ Segunda Lei de Newton</b><br><br>
        A força resultante sobre um objeto é: <b>F = m · a</b><br><br>
        <b>Desafio:</b> Um objeto de massa <b>10 kg</b> sofre uma aceleração de <b>3 m/s²</b>.<br>
        Qual a força resultante em <b>Newtons (N)</b>?<br><br>
        <i>Digite apenas o número.</i>`,
      tipo: "numero",
      resposta: 30,
      tolerancia: 3
    },
    intermediario: {
      conteudo: `<b>⚡ Cinemática — MRUV</b><br><br>
        Equação do espaço: <b>s = s₀ + v₀t + ½at²</b><br><br>
        <b>Desafio:</b> Um carro parte do repouso (v₀ = 0) com aceleração de <b>4 m/s²</b>.<br>
        Qual o espaço percorrido em <b>5 segundos</b>?<br><br>
        <i>Resposta em metros (m).</i>`,
      tipo: "numero",
      resposta: 50,
      tolerancia: 5
    },
    avancado: {
      conteudo: `<b>⚡ Energia Cinética</b><br><br>
        A energia cinética é dada por: <b>Ec = ½ · m · v²</b><br><br>
        <b>Desafio:</b> Um objeto de <b>4 kg</b> se move a <b>10 m/s</b>.<br>
        Qual sua energia cinética em <b>Joules (J)</b>?<br><br>
        <i>Digite apenas o número.</i>`,
      tipo: "numero",
      resposta: 200,
      tolerancia: 10
    }
  },
  quimica: {
    iniciante: {
      conteudo: `<b>🧪 Ligações Iônicas</b><br><br>
        Uma ligação iônica ocorre quando um átomo <b>doa elétrons</b> para outro,
        formando íons de cargas opostas que se atraem.<br><br>
        Exemplo clássico: <b>NaCl</b> (sal de cozinha) — o sódio doa 1 elétron ao cloro.<br><br>
        <b>Pergunta:</b> Que tipo de partícula é <b>transferida</b> numa ligação iônica?<br><br>
        <i>Digite: elétron, próton ou nêutron.</i>`,
      tipo: "palavra",
      resposta: "elétron",
      sinonimos: ["eletron", "elétrons", "eletrons", "electron", "electrons"]
    },
    intermediario: {
      conteudo: `<b>🧪 Reações de Oxirredução</b><br><br>
        Numa reação redox, uma espécie <b>perde elétrons</b> (oxidação) e outra <b>ganha elétrons</b> (redução).<br><br>
        <b>Pergunta:</b> Na reação: <b>Zn + CuSO₄ → ZnSO₄ + Cu</b><br>
        Qual elemento é <b>oxidado</b>?<br><br>
        <i>Digite o símbolo do elemento.</i>`,
      tipo: "palavra",
      resposta: "zn",
      sinonimos: ["zinco", "zn"]
    },
    avancado: {
      conteudo: `<b>🧪 Estequiometria</b><br><br>
        Na reação: <b>2H₂ + O₂ → 2H₂O</b><br><br>
        Usando pesos atômicos H = 1 e O = 16,
        <b>quantos gramas de H₂O</b> são formados a partir de <b>4g de H₂</b>?<br><br>
        <i>Digite o valor em gramas.</i>`,
      tipo: "numero",
      resposta: 36,
      tolerancia: 2
    }
  }
};

// ── ALTERNAR TELA LOGIN / REGISTRO ──────────────────────────────────
function alternarTela(login) {
  modoLogin = login;
  document.getElementById('titulo-auth').innerText = login ? "Bem-vindo de volta" : "Criar sua conta";
  document.getElementById('subtitulo-auth').innerText = login
    ? "Faça login para continuar estudando"
    : "Preencha os dados para se registrar";
  document.getElementById('btn-auth').innerText = login ? "Entrar" : "Cadastrar";
  document.getElementById('msg-troca').innerHTML = login
    ? 'Não tem conta? <a onclick="alternarTela(false)">Registre-se</a>'
    : 'Já tem conta? <a onclick="alternarTela(true)">Fazer Login</a>';
}

// ── AUTENTICAÇÃO ─────────────────────────────────────────────────────
function autenticar() {
  const user = document.getElementById('usuario').value.trim();
  const pass = document.getElementById('senha').value;

  if (!user || !pass) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  if (!modoLogin) {
    localStorage.setItem('user_' + user, pass);
    alert("Conta criada com sucesso! 🎉");
    alternarTela(true);
  } else {
    const senhaSalva = localStorage.getItem('user_' + user);
    if (senhaSalva === pass) {
      document.getElementById('secao-auth').classList.add('hidden');
      document.getElementById('secao-curso').classList.remove('hidden');
      document.getElementById('boas-vindas').innerText = `👋 Olá, ${user}!`;
    } else {
      alert("Usuário ou senha inválidos.");
    }
  }
}

// ── CARREGAR AULA ────────────────────────────────────────────────────
function carregarAula() {
  const materia = document.getElementById('materia').value;
  const nivel   = document.getElementById('nivel').value;

  questaoAtual = questoes[materia][nivel];

  const nomeMateria = {
    matematica: "📐 Matemática",
    fisica:     "⚡ Física",
    quimica:    "🧪 Química"
  }[materia];

  const nomeNivel = {
    iniciante:     "Iniciante",
    intermediario: "Intermediário",
    avancado:      "Avançado"
  }[nivel];

  document.getElementById('secao-curso').classList.add('hidden');
  document.getElementById('secao-aula').classList.remove('hidden');
  document.getElementById('titulo-aula').innerText = `${nomeMateria} — ${nomeNivel}`;
  document.getElementById('conteudo-aula').innerHTML = questaoAtual.conteudo;
  document.getElementById('input-resposta').value = '';
  limparFeedback();
}

// ── VERIFICAR RESPOSTA (clique no botão) ─────────────────────────────
function verificarResposta() {
  if (!questaoAtual) return;

  const input = document.getElementById('input-resposta').value.trim();
  if (!input) {
    mostrarFeedback('errado', '✏️ Digite uma resposta antes de verificar.');
    return;
  }

  const resultado = avaliarResposta(input, questaoAtual);
  mostrarFeedback(resultado.tipo, resultado.mensagem);
}

// ── VERIFICAR EM TEMPO REAL (ao digitar) ─────────────────────────────
function verificarRespostaEmTempoReal() {
  if (!questaoAtual) return;

  const input = document.getElementById('input-resposta').value.trim();
  if (!input) { limparFeedback(); return; }

  const resultado = avaliarResposta(input, questaoAtual);

  if (resultado.tipo === 'correto') {
    mostrarFeedback('correto', resultado.mensagem);
  } else if (resultado.tipo === 'proximo') {
    mostrarFeedback('proximo', resultado.mensagem);
  } else {
    limparFeedback();
  }
}

// ── LÓGICA DE AVALIAÇÃO ──────────────────────────────────────────────
function avaliarResposta(input, questao) {
  if (questao.tipo === 'numero') {
    const valorDigitado = parseFloat(input.replace(',', '.'));
    if (isNaN(valorDigitado)) {
      return { tipo: 'errado', mensagem: '❌ Digite um número válido.' };
    }

    const diff = Math.abs(valorDigitado - questao.resposta);
    const tolerancia = questao.tolerancia;

    if (diff === 0) {
      return { tipo: 'correto', mensagem: '✅ Resposta correta! Excelente trabalho!' };
    } else if (diff <= tolerancia) {
      const percentual = Math.round((1 - diff / (tolerancia * 2)) * 100);
      return { tipo: 'proximo', mensagem: `🔥 Muito perto! Você está a ${diff} de distância da resposta certa (${questao.resposta}).` };
    } else if (diff <= tolerancia * 4) {
      return { tipo: 'proximo', mensagem: `💡 Chegando lá! Sua resposta está próxima — revise os cálculos.` };
    } else {
      return { tipo: 'errado', mensagem: `❌ Resposta incorreta. Tente novamente com calma!` };
    }

  } else if (questao.tipo === 'palavra') {
    const normalizado = input.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const respostaNorm = questao.resposta.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sinonimosNorm = (questao.sinonimos || []).map(s =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    if (normalizado === respostaNorm || sinonimosNorm.includes(normalizado)) {
      return { tipo: 'correto', mensagem: '✅ Resposta correta! Muito bem!' };
    }

    const levenshtein = calcularLevenshtein(normalizado, respostaNorm);
    if (levenshtein <= 2) {
      return { tipo: 'proximo', mensagem: `🔥 Quase lá! Verifique a ortografia da sua resposta.` };
    }

    const contemParte = respostaNorm.split('').filter(c => normalizado.includes(c)).length;
    if (contemParte >= respostaNorm.length * 0.6) {
      return { tipo: 'proximo', mensagem: `💡 Você está no caminho certo — revise a resposta.` };
    }

    return { tipo: 'errado', mensagem: `❌ Resposta incorreta. Leia o conteúdo novamente!` };
  }

  return { tipo: 'errado', mensagem: '❌ Resposta não reconhecida.' };
}

// ── DISTÂNCIA DE LEVENSHTEIN (para comparar palavras) ────────────────
function calcularLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// ── HELPERS DE FEEDBACK ──────────────────────────────────────────────
function mostrarFeedback(tipo, mensagem) {
  const el = document.getElementById('feedback');
  el.className = '';
  el.textContent = mensagem;
  void el.offsetWidth;
  el.classList.add(tipo, 'visivel');
}

function limparFeedback() {
  const el = document.getElementById('feedback');
  el.className = '';
  el.textContent = '';
}

// ── VOLTAR ───────────────────────────────────────────────────────────
function voltar() {
  document.getElementById('secao-aula').classList.add('hidden');
  document.getElementById('secao-curso').classList.remove('hidden');
  questaoAtual = null;
  limparFeedback();
}
