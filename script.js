let modoLogin = true;
let questaoAtual = null;
let filaQuestoes = [];
let indiceAtual = 0;
let acertos = 0;
let materiaAtual = '';
let nivelAtual = '';
let jaAcertou = false;

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

// ── BANCO DE QUESTÕES ────────────────────────────────────────────────
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
      { conteudo: `<b>⚡ Peso</b><br><br>Fórmula: <b>P = m · g</b> (g = 10 m/s²)<br><br>Massa = <b>7 kg</b><br><br><i>Qual o peso em Newtons (N)?</i>`, tipo: "numero", resposta: 70, tolerancia: 2 },
      { conteudo: `<b>⚡ Velocidade Média</b><br><br>Fórmula: <b>v = Δs / Δt</b><br><br>Distância = <b>240 m</b>, Tempo = <b>60 s</b><br><br><i>Qual a velocidade em m/s?</i>`, tipo: "numero", resposta: 4, tolerancia: 0.5 },
      { conteudo: `<b>⚡ Segunda Lei de Newton</b><br><br>Fórmula: <b>F = m · a</b><br><br>Massa = <b>8 kg</b>, Aceleração = <b>5 m/s²</b><br><br><i>Qual a força em Newtons (N)?</i>`, tipo: "numero", resposta: 40, tolerancia: 2 },
    ],
    intermediario: [
      { conteudo: `<b>⚡ MRUV — Espaço</b><br><br>Fórmula: <b>s = s₀ + v₀t + ½at²</b><br><br>v₀ = 0, a = 4 m/s², t = 5 s<br><br><i>Qual o espaço percorrido em metros (m)?</i>`, tipo: "numero", resposta: 50, tolerancia: 3 },
      { conteudo: `<b>⚡ MRUV — Velocidade Final</b><br><br>Fórmula: <b>v = v₀ + a·t</b><br><br>v₀ = 10 m/s, a = 3 m/s², t = 4 s<br><br><i>Qual a velocidade final em m/s?</i>`, tipo: "numero", resposta: 22, tolerancia: 1 },
      { conteudo: `<b>⚡ Energia Cinética</b><br><br>Fórmula: <b>Ec = ½ · m · v²</b><br><br>Massa = <b>2 kg</b>, Velocidade = <b>6 m/s</b><br><br><i>Qual a energia cinética em Joules (J)?</i>`, tipo: "numero", resposta: 36, tolerancia: 2 },
      { conteudo: `<b>⚡ Trabalho</b><br><br>Fórmula: <b>W = F · d · cos(θ)</b><br><br>F = 20 N, d = 5 m, θ = 0°<br><br><i>Qual o trabalho realizado em Joules (J)?</i>`, tipo: "numero", resposta: 100, tolerancia: 3 },
      { conteudo: `<b>⚡ MRUV — Espaço</b><br><br>Fórmula: <b>s = v₀t + ½at²</b><br><br>v₀ = 20 m/s, a = −2 m/s², t = 3 s<br><br><i>Qual o espaço percorrido em metros (m)?</i>`, tipo: "numero", resposta: 51, tolerancia: 3 },
      { conteudo: `<b>⚡ Potência</b><br><br>Fórmula: <b>P = W / t</b><br><br>Trabalho = <b>600 J</b>, Tempo = <b>20 s</b><br><br><i>Qual a potência em Watts (W)?</i>`, tipo: "numero", resposta: 30, tolerancia: 2 },
    ],
    avancado: [
      { conteudo: `<b>⚡ Energia Cinética</b><br><br>Fórmula: <b>Ec = ½ · m · v²</b><br><br>Massa = <b>4 kg</b>, Velocidade = <b>10 m/s</b><br><br><i>Qual a energia cinética em Joules (J)?</i>`, tipo: "numero", resposta: 200, tolerancia: 5 },
      { conteudo: `<b>⚡ Lei de Ohm</b><br><br>Fórmula: <b>V = R · I</b><br><br>Resistência = <b>15 Ω</b>, Corrente = <b>4 A</b><br><br><i>Qual a tensão em Volts (V)?</i>`, tipo: "numero", resposta: 60, tolerancia: 2 },
      { conteudo: `<b>⚡ Potência Elétrica</b><br><br>Fórmula: <b>P = V · I</b><br><br>Tensão = <b>120 V</b>, Corrente = <b>3 A</b><br><br><i>Qual a potência em Watts (W)?</i>`, tipo: "numero", resposta: 360, tolerancia: 5 },
      { conteudo: `<b>⚡ Gravitação Universal</b><br><br>O período de um pêndulo simples é: <b>T ≈ 2π√(L/g)</b><br><br>Para L = 1 m e g = 10 m/s², use π ≈ 3,14.<br><br><i>Qual o período T (em segundos, arredondado)?</i>`, tipo: "numero", resposta: 2, tolerancia: 0.3 },
      { conteudo: `<b>⚡ Ondulatória</b><br><br>Fórmula: <b>v = λ · f</b><br><br>Frequência f = <b>50 Hz</b>, Comprimento de onda λ = <b>4 m</b><br><br><i>Qual a velocidade da onda em m/s?</i>`, tipo: "numero", resposta: 200, tolerancia: 5 },
      { conteudo: `<b>⚡ Capacitor</b><br><br>Fórmula: <b>Q = C · V</b><br><br>Capacitância C = <b>10 μF = 10×10⁻⁶ F</b>, Tensão V = <b>200 V</b><br><br><i>Qual a carga Q em microcoulombs (μC)?</i>`, tipo: "numero", resposta: 2000, tolerancia: 50 },
    ]
  },
  quimica: {
    iniciante: [
      { conteudo: `<b>🧪 Ligações Iônicas</b><br><br>Uma ligação iônica ocorre quando um átomo <b>doa elétrons</b> para outro, formando íons.<br><br>Exemplo: <b>NaCl</b> — o sódio doa 1 elétron ao cloro.<br><br><i>Que tipo de partícula é transferida?</i><br><small>Digite: elétron, próton ou nêutron</small>`, tipo: "palavra", resposta: "elétron", sinonimos: ["eletron","elétrons","eletrons","electron","electrons"] },
      { conteudo: `<b>🧪 Tabela Periódica</b><br><br>O símbolo <b>Au</b> na tabela periódica representa qual elemento?<br><br><i>Digite o nome do elemento.</i>`, tipo: "palavra", resposta: "ouro", sinonimos: ["ouro","gold","au"] },
      { conteudo: `<b>🧪 Estados da Matéria</b><br><br>No estado <b>gasoso</b>, as moléculas têm grande energia cinética e estão muito afastadas.<br><br>Qual estado da matéria tem forma e volume definidos?<br><br><i>Digite: sólido, líquido ou gasoso</i>`, tipo: "palavra", resposta: "sólido", sinonimos: ["solido","sólido","solid"] },
      { conteudo: `<b>🧪 Reações Químicas</b><br><br>Na reação: <b>2H₂ + O₂ → 2H₂O</b><br><br>O produto formado é a água.<br><br><i>Qual é o nome da substância formada? (produto)</i>`, tipo: "palavra", resposta: "água", sinonimos: ["agua","água","water","h2o"] },
      { conteudo: `<b>🧪 Ácidos e Bases</b><br><br>pH abaixo de 7 = ácido | pH acima de 7 = base<br><br>Uma solução com <b>pH = 3</b> é:<br><br><i>Digite: ácido ou base</i>`, tipo: "palavra", resposta: "ácido", sinonimos: ["acido","ácido","acid"] },
      { conteudo: `<b>🧪 Tabela Periódica</b><br><br>O elemento com símbolo <b>Fe</b> é um metal muito comum na construção civil.<br><br><i>Qual é o nome deste elemento?</i>`, tipo: "palavra", resposta: "ferro", sinonimos: ["ferro","iron","fe"] },
    ],
    intermediario: [
      { conteudo: `<b>🧪 Oxirredução</b><br><br>Numa reação redox, quem <b>perde elétrons</b> é oxidado.<br><br>Reação: <b>Zn + CuSO₄ → ZnSO₄ + Cu</b><br><br><i>Qual elemento é oxidado? (símbolo)</i>`, tipo: "palavra", resposta: "zn", sinonimos: ["zn","zinco","zinc"] },
      { conteudo: `<b>🧪 Estequiometria</b><br><br>Reação: <b>2H₂ + O₂ → 2H₂O</b><br><br>H = 1, O = 16<br>A partir de <b>4g de H₂</b>, quantos gramas de H₂O são produzidos?<br><br><i>Digite o valor em gramas.</i>`, tipo: "numero", resposta: 36, tolerancia: 2 },
      { conteudo: `<b>🧪 Mol e Massa Molar</b><br><br>A massa molar da água (H₂O) é <b>18 g/mol</b>.<br><br>Quantos mols há em <b>54 g</b> de água?<br><br><i>Digite apenas o número.</i>`, tipo: "numero", resposta: 3, tolerancia: 0.3 },
      { conteudo: `<b>🧪 pH e Concentração</b><br><br>O pH é calculado como: <b>pH = −log[H⁺]</b><br><br>Para [H⁺] = 10⁻⁴ mol/L<br><br><i>Qual é o pH da solução?</i>`, tipo: "numero", resposta: 4, tolerancia: 0.3 },
      { conteudo: `<b>🧪 Lei de Hess</b><br><br>Numa reação de combustão completa do carbono:<br><b>C + O₂ → CO₂</b><br><br>Que gás é produzido nessa combustão?<br><br><i>Digite a fórmula ou o nome.</i>`, tipo: "palavra", resposta: "co2", sinonimos: ["co2","CO2","dióxido de carbono","dioxido de carbono","gás carbônico","gas carbonico"] },
      { conteudo: `<b>🧪 Ligações Covalentes</b><br><br>Na molécula de água (H₂O), o oxigênio faz <b>ligações covalentes</b> com hidrogênio.<br><br><i>Quantas ligações covalentes existem na molécula H₂O?</i>`, tipo: "numero", resposta: 2, tolerancia: 0 },
    ],
    avancado: [
      { conteudo: `<b>🧪 Estequiometria Avançada</b><br><br>Reação: <b>2H₂ + O₂ → 2H₂O</b><br><br>Partindo de <b>8g de H₂</b> com excesso de O₂, quantos gramas de H₂O são formados?<br><br><i>Digite o valor em gramas.</i>`, tipo: "numero", resposta: 72, tolerancia: 3 },
      { conteudo: `<b>🧪 Termoquímica</b><br><br>ΔH < 0 = reação exotérmica (libera calor)<br>ΔH > 0 = reação endotérmica (absorve calor)<br><br>A combustão do gás natural libera calor (ΔH = −890 kJ).<br><br><i>Esse processo é exo ou endotérmico? Digite uma palavra.</i>`, tipo: "palavra", resposta: "exotérmico", sinonimos: ["exotermico","exotérmico","exothermic","exotermica","exotérmica"] },
      { conteudo: `<b>🧪 Equilíbrio Químico</b><br><br>A constante de equilíbrio Kc para <b>aA ⇌ bB</b> é:<br><b>Kc = [B]ᵇ / [A]ᵃ</b><br><br>[B] = 0,4 mol/L, [A] = 0,2 mol/L (a=1, b=1)<br><br><i>Qual o valor de Kc?</i>`, tipo: "numero", resposta: 2, tolerancia: 0.2 },
      { conteudo: `<b>🧪 Número de Oxidação</b><br><br>Na molécula <b>H₂SO₄</b>, H = +1 e O = −2.<br><br><i>Qual o número de oxidação (NOX) do enxofre (S)?</i>`, tipo: "numero", resposta: 6, tolerancia: 0.3 },
      { conteudo: `<b>🧪 Radioatividade</b><br><br>No decaimento alfa (α), o núcleo perde <b>2 prótons e 2 nêutrons</b>.<br><br>Se ²³⁸₉₂U emite 1 partícula alfa, qual o novo número atômico?<br><br><i>Digite apenas o número.</i>`, tipo: "numero", resposta: 90, tolerancia: 0 },
      { conteudo: `<b>🧪 Soluções</b><br><br>Fórmula da concentração molar: <b>C = n / V</b><br><br>2 mols de NaCl dissolvidos em <b>0,5 L</b> de solução.<br><br><i>Qual a concentração molar em mol/L?</i>`, tipo: "numero", resposta: 4, tolerancia: 0.2 },
    ]
  },
  historia: {
    iniciante: [
      { conteudo: `<b>📜 Idade Antiga</b><br><br>A escrita cuneiforme foi desenvolvida pelos <b>sumérios</b> na Mesopotâmia, por volta de 3.500 a.C.<br><br><i>Qual povo criou a escrita cuneiforme?</i>`, tipo: "palavra", resposta: "sumérios", sinonimos: ["sumerios","sumérios","sumerians","sumério","sumerio"] },
      { conteudo: `<b>📜 Civilizações Antigas</b><br><br>As pirâmides de Gizé foram construídas como tumbas dos faraós no <b>Egito Antigo</b>.<br><br><i>Em qual país ficam as pirâmides de Gizé?</i>`, tipo: "palavra", resposta: "egito", sinonimos: ["egito","egypt","Egito"] },
      { conteudo: `<b>📜 Brasil Colonial</b><br><br>O Brasil foi colonizado pelos portugueses a partir de <b>1500</b>, com a chegada de Pedro Álvares Cabral.<br><br><i>Quem chegou ao Brasil em 1500?</i>`, tipo: "palavra", resposta: "pedro álvares cabral", sinonimos: ["cabral","pedro cabral","pedro álvares cabral","pedro alvares cabral"] },
      { conteudo: `<b>📜 Independência do Brasil</b><br><br>A independência do Brasil foi proclamada em <b>7 de setembro de 1822</b> por Dom Pedro I.<br><br><i>Em que ano o Brasil se tornou independente?</i>`, tipo: "numero", resposta: 1822, tolerancia: 0 },
      { conteudo: `<b>📜 Revolução Francesa</b><br><br>A Revolução Francesa começou em <b>1789</b> com a queda da Bastilha, simbolizando o fim do Antigo Regime.<br><br><i>Em que ano começou a Revolução Francesa?</i>`, tipo: "numero", resposta: 1789, tolerancia: 0 },
      { conteudo: `<b>📜 Segunda Guerra Mundial</b><br><br>A Segunda Guerra Mundial terminou em <b>1945</b> com a rendição da Alemanha e do Japão.<br><br><i>Em que ano terminou a Segunda Guerra Mundial?</i>`, tipo: "numero", resposta: 1945, tolerancia: 0 },
    ],
    intermediario: [
      { conteudo: `<b>📜 Revolução Industrial</b><br><br>A Revolução Industrial começou na <b>Inglaterra</b> no século XVIII, com a invenção da máquina a vapor.<br><br><i>Em qual país começou a Revolução Industrial?</i>`, tipo: "palavra", resposta: "inglaterra", sinonimos: ["inglaterra","england","grã-bretanha","reino unido","gran bretanha"] },
      { conteudo: `<b>📜 Guerra Fria</b><br><br>A Guerra Fria foi uma disputa ideológica entre <b>EUA e URSS</b> após a 2ª Guerra Mundial.<br><br><i>Qual país rival dos EUA na Guerra Fria? (sigla)</i>`, tipo: "palavra", resposta: "urss", sinonimos: ["urss","ussr","união soviética","uniao sovietica","soviética"] },
      { conteudo: `<b>📜 Era Vargas</b><br><br>Getúlio Vargas governou o Brasil de <b>1930 a 1945</b> e depois de 1950 a 1954.<br><br><i>Em que ano Vargas assumiu o poder pela primeira vez?</i>`, tipo: "numero", resposta: 1930, tolerancia: 0 },
      { conteudo: `<b>📜 Proclamação da República</b><br><br>A República no Brasil foi proclamada em <b>15 de novembro de 1889</b> pelo Marechal Deodoro da Fonseca.<br><br><i>Em que ano foi proclamada a República no Brasil?</i>`, tipo: "numero", resposta: 1889, tolerancia: 0 },
      { conteudo: `<b>📜 Imperialismo</b><br><br>No século XIX, países europeus dividiram a África entre si na chamada <b>Conferência de Berlim (1884)</b>.<br><br><i>Em que ano foi a Conferência de Berlim?</i>`, tipo: "numero", resposta: 1884, tolerancia: 0 },
      { conteudo: `<b>📜 Nazismo</b><br><br>Adolf Hitler assumiu o poder na Alemanha em <b>1933</b>, iniciando o regime nazista.<br><br><i>Em que ano Hitler assumiu o poder?</i>`, tipo: "numero", resposta: 1933, tolerancia: 0 },
    ],
    avancado: [
      { conteudo: `<b>📜 Revolução Russa</b><br><br>A Revolução Bolchevique de <b>outubro de 1917</b> levou Lênin ao poder e criou a União Soviética.<br><br><i>Em que ano ocorreu a Revolução Bolchevique?</i>`, tipo: "numero", resposta: 1917, tolerancia: 0 },
      { conteudo: `<b>📜 Ditadura Militar no Brasil</b><br><br>O regime militar no Brasil durou de <b>1964 a 1985</b>.<br><br><i>Quantos anos durou o regime militar no Brasil?</i>`, tipo: "numero", resposta: 21, tolerancia: 0 },
      { conteudo: `<b>📜 Queda do Muro de Berlim</b><br><br>O Muro de Berlim caiu em <b>9 de novembro de 1989</b>, marcando o fim da Guerra Fria.<br><br><i>Em que ano caiu o Muro de Berlim?</i>`, tipo: "numero", resposta: 1989, tolerancia: 0 },
      { conteudo: `<b>📜 Iluminismo</b><br><br>O Iluminismo foi um movimento intelectual do séc. XVIII que defendia razão, liberdade e igualdade.<br><br><i>Qual filósofo iluminista escreveu "O Contrato Social"?</i>`, tipo: "palavra", resposta: "rousseau", sinonimos: ["rousseau","jean-jacques rousseau","jean jacques rousseau"] },
      { conteudo: `<b>📜 Primeira Guerra Mundial</b><br><br>A 1ª Guerra Mundial durou de <b>1914 a 1918</b> e foi desencadeada pelo assassinato do Arquiduque Francisco Ferdinando.<br><br><i>Em que ano terminou a Primeira Guerra Mundial?</i>`, tipo: "numero", resposta: 1918, tolerancia: 0 },
      { conteudo: `<b>📜 Apartheid</b><br><br>O regime do Apartheid na África do Sul terminou oficialmente em <b>1991</b>, com Nelson Mandela eleito em 1994.<br><br><i>Em que ano Mandela foi eleito presidente da África do Sul?</i>`, tipo: "numero", resposta: 1994, tolerancia: 0 },
    ]
  },
  biologia: {
    iniciante: [
      { conteudo: `<b>🌿 Célula</b><br><br>A célula é a unidade básica da vida. As células <b>procariontes</b> não têm núcleo definido (ex: bactérias).<br><br><i>Qual tipo de célula NÃO possui núcleo delimitado por membrana?</i>`, tipo: "palavra", resposta: "procarionte", sinonimos: ["procarionte","procariota","procariontes","procarionticos","prokaryote"] },
      { conteudo: `<b>🌿 Fotossíntese</b><br><br>Fórmula: <b>6CO₂ + 6H₂O + luz → C₆H₁₂O₆ + 6O₂</b><br><br><i>Qual gás é LIBERADO na fotossíntese?</i>`, tipo: "palavra", resposta: "oxigênio", sinonimos: ["oxigenio","oxigênio","o2","O2","oxygen"] },
      { conteudo: `<b>🌿 Genética</b><br><br>O DNA (ácido desoxirribonucleico) carrega as informações genéticas hereditárias de todos os seres vivos.<br><br><i>Qual molécula carrega a informação genética hereditária?</i>`, tipo: "palavra", resposta: "dna", sinonimos: ["dna","DNA","ácido desoxirribonucleico","acido desoxirribonucleico"] },
      { conteudo: `<b>🌿 Ecologia</b><br><br>A cadeia alimentar começa sempre com os <b>produtores</b> (plantas), seguidos de consumidores primários, secundários etc.<br><br><i>Como chamamos os organismos que produzem seu próprio alimento via fotossíntese?</i>`, tipo: "palavra", resposta: "produtores", sinonimos: ["produtores","autótrofos","autotrofos","autotroph","produtores primários"] },
      { conteudo: `<b>🌿 Mitose</b><br><br>A mitose é a divisão celular que gera <b>2 células-filhas idênticas</b> à célula-mãe.<br><br><i>Quantas células-filhas são geradas numa mitose?</i>`, tipo: "numero", resposta: 2, tolerancia: 0 },
      { conteudo: `<b>🌿 Biomas</b><br><br>A <b>Amazônia</b> é a maior floresta tropical do mundo, localizada principalmente no Brasil.<br><br><i>Qual bioma brasileiro é considerado a maior floresta tropical do mundo?</i>`, tipo: "palavra", resposta: "amazônia", sinonimos: ["amazonia","amazônia","floresta amazonica","floresta amazônica","amazon"] },
    ],
    intermediario: [
      { conteudo: `<b>🌿 Meiose</b><br><br>A meiose produz <b>4 células-filhas haploides</b> (metade do número de cromossomos).<br><br><i>Quantas células-filhas são geradas numa meiose?</i>`, tipo: "numero", resposta: 4, tolerancia: 0 },
      { conteudo: `<b>🌿 Leis de Mendel</b><br><br>Cruzamento Aa × Aa (1ª Lei). Proporção fenotípica esperada: <b>3 dominantes : 1 recessivo</b>.<br><br><i>Em 400 descendentes, quantos expressarão o fenótipo dominante?</i>`, tipo: "numero", resposta: 300, tolerancia: 5 },
      { conteudo: `<b>🌿 Respiração Celular</b><br><br>A respiração aeróbica produz até <b>36–38 moléculas de ATP</b> por glicose, com consumo de O₂.<br><br><i>Qual molécula de energia é produzida na respiração celular?</i>`, tipo: "palavra", resposta: "atp", sinonimos: ["atp","ATP","adenosina trifosfato"] },
      { conteudo: `<b>🌿 Grupos Sanguíneos</b><br><br>O sistema ABO tem os grupos: A, B, AB e O. O grupo <b>O negativo</b> é doador universal.<br><br><i>Qual é o grupo sanguíneo doador universal?</i>`, tipo: "palavra", resposta: "o negativo", sinonimos: ["o negativo","o-","o neg","O negativo","O-"] },
      { conteudo: `<b>🌿 Vírus</b><br><br>Vírus não são considerados seres vivos pois não têm metabolismo próprio e precisam de células hospedeiras.<br><br><i>Verdadeiro ou falso: vírus são considerados seres vivos.</i>`, tipo: "palavra", resposta: "falso", sinonimos: ["falso","false","não","nao"] },
      { conteudo: `<b>🌿 Hormônios</b><br><br>A <b>insulina</b> é produzida pelo pâncreas e regula a quantidade de glicose no sangue.<br><br><i>Qual hormônio regula a glicose no sangue?</i>`, tipo: "palavra", resposta: "insulina", sinonimos: ["insulina","insulin"] },
    ],
    avancado: [
      { conteudo: `<b>🌿 Tradução Gênica</b><br><br>Cada códon do mRNA é composto por <b>3 bases nitrogenadas</b> e codifica um aminoácido.<br><br><i>Quantas bases nitrogenadas formam um códon?</i>`, tipo: "numero", resposta: 3, tolerancia: 0 },
      { conteudo: `<b>🌿 Evolução</b><br><br>Darwin propôs a teoria da <b>seleção natural</b>: organismos mais adaptados sobrevivem e se reproduzem mais.<br><br><i>Como se chama o mecanismo evolutivo proposto por Darwin?</i>`, tipo: "palavra", resposta: "seleção natural", sinonimos: ["seleção natural","selecao natural","natural selection","seleção","selecao"] },
      { conteudo: `<b>🌿 Ecologia — Nível Trófico</b><br><br>A eficiência de transferência de energia entre níveis tróficos é de aproximadamente <b>10%</b>.<br><br><i>Qual a porcentagem de energia transferida entre níveis tróficos?</i>`, tipo: "numero", resposta: 10, tolerancia: 1 },
      { conteudo: `<b>🌿 Mutação</b><br><br>Uma mutação de ponto ocorre quando uma única base do DNA é alterada, podendo mudar um aminoácido.<br><br><i>Qual molécula sofre alteração direta durante uma mutação gênica?</i>`, tipo: "palavra", resposta: "dna", sinonimos: ["dna","DNA","ácido desoxirribonucleico","acido desoxirribonucleico"] },
      { conteudo: `<b>🌿 Sistema Nervoso</b><br><br>O neurônio transmite impulsos elétricos. A sinapse é a junção entre dois neurônios onde ocorre a transmissão química.<br><br><i>Como chamamos a junção entre dois neurônios?</i>`, tipo: "palavra", resposta: "sinapse", sinonimos: ["sinapse","synapse","sinapses"] },
      { conteudo: `<b>🌿 Cromossomos Humanos</b><br><br>O ser humano possui <b>46 cromossomos</b> (23 pares) nas células somáticas.<br><br><i>Quantos cromossomos têm uma célula somática humana?</i>`, tipo: "numero", resposta: 46, tolerancia: 0 },
    ]
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
  if (!user || !pass) { alert("Por favor, preencha todos os campos."); return; }
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

// ── EMBARALHAR ARRAY ─────────────────────────────────────────────────
function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── CARREGAR AULA ────────────────────────────────────────────────────
function carregarAula() {
  materiaAtual = document.getElementById('materia').value;
  nivelAtual   = document.getElementById('nivel').value;

  filaQuestoes = embaralhar(banco[materiaAtual][nivelAtual]);
  indiceAtual  = 0;
  acertos      = 0;

  document.getElementById('secao-curso').classList.add('hidden');
  document.getElementById('secao-aula').classList.remove('hidden');

  atualizarTituloAula();
  carregarQuestao();
}

function atualizarTituloAula() {
  const nomes = { matematica: "📐 Matemática", fisica: "⚡ Física", quimica: "🧪 Química", historia: "📜 História", biologia: "🌿 Biologia" };
  const niveis = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
  document.getElementById('titulo-aula').innerText = `${nomes[materiaAtual]} · ${niveis[nivelAtual]}`;
}

function carregarQuestao() {
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
  document.getElementById('contador-questao').innerText = `${indiceAtual + 1} / ${total}`;
  const pct = (acertos / total) * 100;
  document.getElementById('barra-progresso').style.width = pct + '%';
  document.getElementById('label-progresso').innerText = `${acertos} acerto${acertos !== 1 ? 's' : ''}`;
}

// ── PRÓXIMA QUESTÃO ──────────────────────────────────────────────────
function proximaQuestao() {
  indiceAtual++;
  if (indiceAtual >= filaQuestoes.length) {
    filaQuestoes = embaralhar(banco[materiaAtual][nivelAtual]);
    indiceAtual  = 0;
    acertos      = 0;
    mostrarFeedback('correto', `🏆 Rodada concluída! Embaralhando novamente...`);
    setTimeout(carregarQuestao, 1800);
    return;
  }
  carregarQuestao();
}

// ── VERIFICAR RESPOSTA (botão) ───────────────────────────────────────
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

// ── VERIFICAR EM TEMPO REAL (ao digitar) ─────────────────────────────
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

// ── LÓGICA DE AVALIAÇÃO ──────────────────────────────────────────────
function avaliarResposta(input, questao) {
  if (questao.tipo === 'numero') {
    const val  = parseFloat(input.replace(',', '.'));
    if (isNaN(val)) return { tipo: 'errado', mensagem: '❌ Digite um número válido.' };
    const diff = Math.abs(val - questao.resposta);
    const tol  = questao.tolerancia;
    if (diff === 0 || (tol === 0 && diff === 0)) return { tipo: 'correto', mensagem: '✅ Resposta correta! Excelente!' };
    if (tol > 0 && diff <= tol)      return { tipo: 'correto', mensagem: '✅ Resposta correta! Excelente!' };
    if (tol > 0 && diff <= tol * 2)  return { tipo: 'proximo',  mensagem: `🔥 Muito perto! Você está a ${diff} da resposta certa (${questao.resposta}).` };
    if (tol > 0 && diff <= tol * 6)  return { tipo: 'proximo',  mensagem: `💡 Chegando lá! Revise os cálculos.` };
    return { tipo: 'errado', mensagem: `❌ Incorreto. Tente novamente!` };
  }

  if (questao.tipo === 'palavra') {
    const norm  = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const n     = norm(input);
    const r     = norm(questao.resposta);
    const sins  = (questao.sinonimos || []).map(norm);
    if (n === r || sins.includes(n)) return { tipo: 'correto', mensagem: '✅ Resposta correta! Muito bem!' };
    const lev = calcularLevenshtein(n, r);
    if (lev <= 2) return { tipo: 'proximo', mensagem: `🔥 Quase lá! Verifique a ortografia.` };
    const partsMatch = sins.some(s => n.includes(s.split(' ')[0]) || s.includes(n.split(' ')[0]));
    if (partsMatch)  return { tipo: 'proximo', mensagem: `💡 Você está no caminho certo — seja mais específico.` };
    return { tipo: 'errado', mensagem: `❌ Incorreto. Releia o enunciado e tente novamente.` };
  }

  return { tipo: 'errado', mensagem: '❌ Resposta não reconhecida.' };
}

// ── DISTÂNCIA LEVENSHTEIN ─────────────────────────────────────────────
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

// ── HELPERS FEEDBACK ──────────────────────────────────────────────────
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

// ── VOLTAR ────────────────────────────────────────────────────────────
function voltar() {
  document.getElementById('secao-aula').classList.add('hidden');
  document.getElementById('secao-curso').classList.remove('hidden');
  questaoAtual = null;
  limparFeedback();
}
