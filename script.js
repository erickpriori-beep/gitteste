let modoLogin = true;

// Alterna entre tela de Login e Registro
function alternarTela(login) {
    modoLogin = login;
    document.getElementById('titulo-auth').innerText = login ? "Login do Aluno" : "Criar Conta";
    document.getElementById('btn-auth').innerText = login ? "Entrar" : "Cadastrar";
    document.getElementById('msg-troca').innerHTML = login ? 
        'Não tem conta? <a onclick="alternarTela(false)">Registre-se</a>' : 
        'Já tem conta? <a onclick="alternarTela(true)">Fazer Login</a>';
}

// Lógica de Autenticação simulando Banco de Dados
function autenticar() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('senha').value;

    if (!user || !pass) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    if (!modoLogin) {
        // Simula o INSERT no Banco de Dados
        localStorage.setItem('user_' + user, pass);
        alert("Conta registrada com sucesso!");
        alternarTela(true);
    } else {
        // Simula o SELECT no Banco de Dados
        const senhaSalva = localStorage.getItem('user_' + user);
        if (senhaSalva === pass) {
            document.getElementById('secao-auth').classList.add('hidden');
            document.getElementById('secao-curso').classList.remove('hidden');
            document.getElementById('boas-vindas').innerText = `Bem-vindo, ${user}!`;
        } else {
            alert("Usuário ou senha inválidos.");
        }
    }
}

// Carrega o "Curso" selecionado
function carregarAula() {
    const materia = document.getElementById('materia').value;
    const nivel = document.getElementById('nivel').value;
    const boxConteudo = document.getElementById('conteudo-ia');

    document.getElementById('secao-curso').classList.add('hidden');
    document.getElementById('secao-aula').classList.remove('hidden');
    document.getElementById('titulo-aula').innerText = `${materia.toUpperCase()} - Nível ${nivel}`;

    // Lógica simples que simula o que a IA faria via Python
    let textoDinamico = "";

    if (materia === "matematica") {
        textoDinamico = "<b>Desafio:</b> Resolva 2x + 10 = 20.<br><b>Explicação:</b> Primeiro, isolamos o 2x subtraindo 10 de ambos os lados...";
    } else if (materia === "fisica") {
        textoDinamico = "<b>Conceito:</b> Segunda Lei de Newton.<br><b>Explicação:</b> Força é igual a massa vezes aceleração (F = m.a)...";
    } else {
        textoDinamico = "<b>Química:</b> Ligações Iônicas.<br><b>Explicação:</b> Ocorre quando um átomo doa elétrons para outro...";
    }

    boxConteudo.innerHTML = textoDinamico;
}

function voltar() {
    document.getElementById('secao-aula').classList.add('hidden');
    document.getElementById('secao-curso').classList.remove('hidden');
}