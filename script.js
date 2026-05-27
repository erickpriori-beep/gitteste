// 1. Configuração Inicial do Banco de Dados Local atualizado para Educa+
if (!localStorage.getItem('db_educamais')) {
    localStorage.setItem('db_educamais', JSON.stringify({ "ADMIN": "123" }));
}

// 2. Metas de Repetição
const METAS = { 
    iniciante: 15, 
    intermediario: 25, 
    avancado: 60 
};

// 3. Banco de Dados de Teoria
const cursoData = {
    matematica: {
        iniciante: { slides: ["<b>Teoria:</b> Soma e Subtração básica.", "<b>Exemplo:</b> Se você tem 2 e ganha X para ter 5, X=3.", "<b>Desafio:</b> Acerte 15 questões vindas da API."] },
        intermediario: { slides: ["<b>Teoria:</b> Equações de 1º Grau.", "<b>Exemplo:</b> 2x = 20 -> x = 10.", "<b>Desafio:</b> Acerte 25 questões vindas da API."] },
        avancado: { slides: ["<b>Teoria:</b> Potenciação e Radiciação.", "<b>Exemplo:</b> √64 = 8.", "<b>Desafio:</b> Acerte 60 questões dinâmicas de IA."] }
    },
    fisica: {
        iniciante: { slides: ["<b>Teoria:</b> Velocidade Média.", "<b>Fórmula:</b> V = ΔS / Δt.", "<b>Desafio:</b> 15 questões vindas da API."] },
        intermediario: { slides: ["<b>Teoria:</b> Movimento Uniforme.", "<b>Exemplo:</b> Distância percorrida com velocidade constante.", "<b>Desafio:</b> 25 questões vindas da API."] },
        avancado: { slides: ["<b>Teoria:</b> Leis de Newton.", "<b>Fórmula:</b> F = m * a.", "<b>Desafio:</b> 60 questões vindas da API."] }
    },
    quimica: {
        iniciante: { slides: ["<b>Teoria:</b> O Átomo.", "<b>Dica:</b> Prótons (+) e Elétrons (-).", "<b>Desafio:</b> 15 questões vindas da API."] },
        intermediario: { slides: ["<b>Teoria:</b> Distribuição Eletrônica.", "<b>Dica:</b> Camadas K, L, M...", "<b>Desafio:</b> 25 questões vindas da API."] },
        avancado: { slides: ["<b>Teoria:</b> Estequiometria.", "<b>Exemplo:</b> Cálculo de massa molar.", "<b>Desafio:</b> 60 questões vindas da API."] }
    }
};

let questaoAtual = { p: "", r: "" };
let acertosContador = 0;
let metaAtual = 0;
let slidesAtuais = [];
let slideIndex = 0;

function mostrarTela(id) {
    const telas = ['tela-login', 'tela-registro', 'tela-cursos', 'tela-aula', 'tela-admin'];
    telas.forEach(t => document.getElementById(t).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// SISTEMA DE API EXPANDIDO (Com uma grande variedade de perguntas)
async function buscarQuestaoDaAPI(materia, nivel) {
    try {
        // Pequena pausa imperceptível de simulação assíncrona (200ms)
        await new Promise(resolve => setTimeout(resolve, 200));

        const bancoDeDadosAPI = {
            matematica: {
                iniciante: [
                    { p: "Qual é o valor de 15 + 27?", r: "42" },
                    { p: "Quanto é 12 - 5?", r: "7" },
                    { p: "Se x + 7 = 20, qual o valor de x?", r: "13" },
                    { p: "Quanto é 45 + 15?", r: "60" },
                    { p: "Qual o resultado de 30 - 18?", r: "12" },
                    { p: "Se 10 - x = 4, quanto vale x?", r: "6" },
                    { p: "Quanto é 7 + 14?", r: "21" },
                    { p: "Calcule: 50 - 25", r: "25" }
                ],
                intermediario: [
                    { p: "Quanto é 9 multiplicado por 8?", r: "72" },
                    { p: "Resolva a equação: 3x - 9 = 12", r: "7" },
                    { p: "Qual é a área de um quadrado com lado de 6cm?", r: "36" },
                    { p: "Se 2x + 4 = 16, quanto vale x?", r: "6" },
                    { p: "Quanto é 7 vezes 6?", r: "42" },
                    { p: "Qual o valor de 81 dividido por 9?", r: "9" },
                    { p: "Se um triângulo tem base 4 e altura 5, qual a área?", r: "10" },
                    { p: "Resolva: 5x = 25", r: "5" }
                ],
                avancado: [
                    { p: "Qual é a raiz quadrada de 144?", r: "12" },
                    { p: "Qual o valor do logaritmo de 100 na base 10?", r: "2" },
                    { p: "Calcule a hipotenusa de um triângulo de catetos 3 e 4.", r: "5" },
                    { p: "Qual é o valor de 2 elevado a 5?", r: "32" },
                    { p: "Qual a raiz quadrada de 169?", r: "13" },
                    { p: "Se log de x na base 2 é 3, quanto vale x?", r: "8" },
                    { p: "Qual o valor de 11 elevado ao quadrado?", r: "121" },
                    { p: "Calcule a área de um círculo de raio 2 (use pi=3).", r: "12" }
                ]
            },
            fisica: {
                iniciante: [
                    { p: "Se um objeto anda 100m em 10s, qual sua velocidade em m/s?", r: "10" },
                    { p: "Qual a unidade de medida da força no SI?", r: "Newton" },
                    { p: "Verdadeiro ou Falso: O som pode se propagar no vácuo.", r: "Falso" },
                    { p: "Qual o símbolo da unidade de medida do tempo no SI?", r: "s" },
                    { p: "Se corro 20 metros em 2 segundos, qual minha velocidade?", r: "10" },
                    { p: "Qual a unidade de medida de distância no SI?", r: "metro" }
                ],
                intermediario: [
                    { p: "Força necessária para mover massa de 2kg a uma aceleração de 5m/s²? (em Newtons)", r: "10" },
                    { p: "Qual a velocidade de um objeto após cair por 2 segundos livremente? (g=10m/s²)", r: "20" },
                    { p: "Se a massa é 5kg e a aceleração é 3m/s², qual a força resultante?", r: "15" },
                    { p: "Qual o trabalho realizado por uma força de 10N que desloca um corpo por 5m?", r: "50" },
                    { p: "Qual a energia cinética de um corpo de 2kg a 4m/s?", r: "16" }
                ],
                avancado: [
                    { p: "Qual o nome da tendência de um corpo de resistir a mudanças no seu estado de movimento?", r: "Inércia" },
                    { p: "Qual o peso em Newtons de um objeto de 50kg na Terra (g=10m/s²)?", r: "500" },
                    { p: "Qual a aceleração de gravidade padrão adotada na Terra nos testes simplificados?", r: "10" },
                    { p: "Qual a terceira lei de Newton? Lei da Ação e ...", r: "Reação" },
                    { p: "Qual a velocidade da luz no vácuo aproximada? (em milhoes de m/s)", r: "300" }
                ]
            },
            quimica: {
                iniciante: [
                    { p: "Qual é o símbolo químico do Oxigênio?", r: "O" },
                    { p: "Qual é a fórmula molecular da água?", r: "H2O" },
                    { p: "Qual o elemento químico mais abundante no universo?", r: "Hidrogênio" },
                    { p: "Qual o símbolo químico do Carbono?", r: "C" },
                    { p: "Qual o símbolo do Nitrogênio?", r: "N" },
                    { p: "Qual a fórmula do gás oxigênio que respiramos?", r: "O2" }
                ],
                intermediario: [
                    { p: "Qual é o número atômico do elemento Hidrogênio (H)?", r: "1" },
                    { p: "Qual o nome das partículas subatômicas com carga positiva?", r: "Prótons" },
                    { p: "Qual partícula possui carga negativa no átomo?", r: "Elétrons" },
                    { p: "Onde ficam localizados os prótons e nêutrons?", r: "Núcleo" },
                    { p: "Qual o símbolo do elemento Sódio?", r: "Na" }
                ],
                avancado: [
                    { p: "Qual o nome da organização que padroniza a nomenclatura química mundial?", r: "IUPAC" },
                    { p: "Qual o principal composto químico presente no sal de cozinha comum?", r: "NaCl" },
                    { p: "Qual a massa molar do Hidrogênio molecular (H2) em g/mol?", r: "2" },
                    { p: "Qual o nome das colunas verticais da tabela periódica?", r: "Famílias" },
                    { p: "Qual a fórmula química do Dióxido de Carbono?", r: "CO2" }
                ]
            }
        };

        const listaQuestoes = bancoDeDadosAPI[materia][nivel];
        const questaoSorteada = listaQuestoes[Math.floor(Math.random() * listaQuestoes.length)];
        return questaoSorteada;

    } catch (erro) {
        console.error("Falha na API: ", erro);
        return { p: "Erro ao conectar. Quanto é 5 + 5?", r: "10" };
    }
}

function carregarAula() {
    const mat = document.getElementById('materia').value;
    const niv = document.getElementById('nivel').value;
    const aula = cursoData[mat][niv];

    document.getElementById('titulo-aula').innerText = `${mat.toUpperCase()} - ${niv.toUpperCase()}`;
    slidesAtuais = aula.slides;
    slideIndex = 0;
    acertosContador = 0;
    metaAtual = METAS[niv];

    document.getElementById('meta-n').innerText = metaAtual;
    document.getElementById('progresso-n').innerText = "0";
    document.getElementById('sessao-certificado').classList.add('hidden');

    atualizarSlide();
    mostrarTela('tela-aula');
}

function atualizarSlide() {
    const conteudo = document.getElementById('conteudo-aula');
    const areaTeste = document.getElementById('area-teste');
    const btnAvancar = document.getElementById('btn-avancar-slide');

    conteudo.innerHTML = slidesAtuais[slideIndex];
    document.getElementById('btn-voltar-slide').disabled = (slideIndex === 0);

    if (slideIndex === slidesAtuais.length - 1) {
        areaTeste.classList.remove('hidden');
        btnAvancar.classList.add('hidden');
        novaPergunta();
    } else {
        areaTeste.classList.add('hidden');
        btnAvancar.classList.remove('hidden');
    }
}

function mudarSlide(direcao) {
    slideIndex += direcao;
    atualizarSlide();
}

// Sem mensagens de texto intermediárias, carregamento limpo e ágil
async function novaPergunta() {
    const mat = document.getElementById('materia').value;
    const niv = document.getElementById('nivel').value;

    document.getElementById('resposta-aluno').value = "";
    document.getElementById('feedback').innerText = "";

    // Requisição assíncrona aguardando a resposta direta do banco de dados
    questaoAtual = await buscarQuestaoDaAPI(mat, niv);

    document.getElementById('pergunta-texto').innerText = questaoAtual.p;
}

function verificarResposta() {
    const resp = document.getElementById('resposta-aluno').value.trim();
    const f = document.getElementById('feedback');

    if (resp.toLowerCase() === questaoAtual.r.toLowerCase()) {
        acertosContador++;
        document.getElementById('progresso-n').innerText = acertosContador;

        if (acertosContador >= metaAtual) {
            f.innerText = "⭐ Meta concluída com sucesso!";
            f.style.color = "#2ecc71";
            document.getElementById('sessao-certificado').classList.remove('hidden');
        } else {
            f.innerText = "✅ Correto!";
            f.style.color = "#2ecc71";
            setTimeout(novaPergunta, 400);
        }
    } else {
        f.innerText = "❌ Tente novamente.";
        f.style.color = "#e74c3c";
    }
}

function fazerLogin() {
    const u = document.getElementById('login-user').value.toUpperCase().trim();
    const p = document.getElementById('login-pass').value;
    const db = JSON.parse(localStorage.getItem('db_educamais'));

    if(u === "ADMIN" && db["ADMIN"] === p) {
        document.getElementById('visualizador-db').innerText = JSON.stringify(db, null, 4);
        mostrarTela('tela-admin');
        return;
    }

    if(db[u] && db[u] === p) {
        document.getElementById('boas-vindas').innerText = `Bem-vindo, ${u}!`;
        mostrarTela('tela-cursos');
    } else {
        alert("Usuário ou senha incorretos.");
    }
}

function fazerRegistro() {
    const u = document.getElementById('reg-user').value.toUpperCase().trim();
    const p = document.getElementById('reg-pass').value;
    if(!u || !p) return alert("Preencha todos os campos.");

    let db = JSON.parse(localStorage.getItem('db_educamais'));
    if(db[u]) return alert("Usuário já cadastrado.");

    db[u] = p;
    localStorage.setItem('db_educamais', JSON.stringify(db));
    alert("Registro concluído!");
    mostrarTela('tela-login');
}

function gerarCertificado() {
    const user = document.getElementById('boas-vindas').innerText.replace("Bem-vindo, ", "").replace("!", "");
    alert(`📜 CERTIFICADO EDUCA+\n\nAluno: ${user}\nStatus: Concluído com mérito via API Integrada.\nData: ${new Date().toLocaleDateString()}`);
}

function sair() {
    location.reload();
}