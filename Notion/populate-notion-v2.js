// populate-notion-v2.js
// Rode uma vez: node populate-notion-v2.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node populate-notion-v2.js SEU_TOKEN"); process.exit(1); }

const DB_VAGAS  = "32ba86cd3e8981cb92cecc222f571213";
const DB_PAPEIS = "32ba86cd3e8981b2973acda83cc5cade";

async function notionPost(endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.status >= 400) throw new Error(JSON.stringify(data));
  return data;
}

async function addVaga(v) {
  const props = {
    "Nome da vaga":   { title: [{ text: { content: v.nome } }] },
    "Empreendimento": { select: { name: v.empreendimento } },
    "Função real":    { rich_text: [{ text: { content: v.funcao } }] },
    "Status":         { select: { name: "Em avaliação" } },
    "Descrição":      { rich_text: [{ text: { content: v.descricao } }] }
  };
  if (v.eneagrama?.length) props["Eneagrama"] = { multi_select: v.eneagrama.map(e => ({ name: e })) };
  if (v.disc?.length)      props["DISC"]      = { multi_select: v.disc.map(d => ({ name: d })) };
  if (v.arquetipo)         props["Arquétipo"] = { rich_text: [{ text: { content: v.arquetipo } }] };
  await notionPost("pages", { parent: { database_id: DB_VAGAS }, properties: props });
  console.log("✓ Vaga:", v.nome);
}

async function addPapel(p) {
  await notionPost("pages", {
    parent: { database_id: DB_PAPEIS },
    properties: {
      "Nome do papel":       { title: [{ text: { content: p.nome } }] },
      "Guilda / Filiação":   { select: { name: p.guilda } },
      "Mar de atuação":      { select: { name: p.mar } },
      "Status":              { select: { name: "Disponível" } },
      "Habilidades":         { rich_text: [{ text: { content: p.habilidades } }] },
      "Conexão com Dipé":    { rich_text: [{ text: { content: p.conexao } }] },
      "Descrição narrativa": { rich_text: [{ text: { content: p.descricao } }] }
    }
  });
  console.log("✓ Papel:", p.nome);
}

async function main() {

  // ═══════════════════════════════════════
  // VAGAS
  // ═══════════════════════════════════════
  console.log("\n=== VAGAS · FishJourney & StoryForge ===\n");

  const vagas = [
    {
      nome: "CEO e Diretor de Arte · Capitão da Frota",
      empreendimento: "Ambos",
      funcao: "Adriano Gilberti. Visão executiva e criativa. Integração dos produtos literários e artísticos da StoryForge ao ecossistema FishJourney. Timing do projeto e conexão com outros produtos e ações.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Divide entre executivo e criativo — CEO e Diretor de Arte. Zurara no universo de Akvon: fundador de Ĉielpeceto, velho amigo de D'Aurora, homem de mundo que construiu algo real e agora precisa protegê-lo."
    },
    {
      nome: "Diretor Financeiro e Operacional · Mestre de Porto",
      empreendimento: "Ambos",
      funcao: "Luis Constâncio. Diretor financeiro e operacional estratégico. Garante que os recursos existem para a travessia e que a operação não afunda a missão.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Além do financeiro acumula função de diretor operacional. Papel narrativo: Mestre de Porto — quem garante que os navios saem e chegam no tempo certo."
    },
    {
      nome: "Diretor de Marketing · Comerciante da Frota",
      empreendimento: "Ambos",
      funcao: "Thiago Pagani. Campanhas de marketing, alcance de público cristão e geral, integridade da missão.",
      eneagrama: ["Tipo 3", "Tipo 7"],
      disc: ["I", "D"],
      arquetipo: "Herói ou Explorador",
      descricao: "Posição reservada. Papel narrativo: Comerciante da Frota — quem leva a história para fora do Promontório e faz o mundo saber que a expedição existe."
    },
    {
      nome: "Diretor Jurídico e Âncora de Missão · Guardião das Leis",
      empreendimento: "Ambos",
      funcao: "Ronaldo Jung. Jurídico + governança + âncora de missão e valores. Estudioso, calmo, ponderado.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Papel narrativo: Guardião das Leis dos Sete Mares — papel canônico da Luminávio. Não é o que age primeiro — é o que garante que quando se age, se age certo."
    },
    {
      nome: "Diretor de Projetos Especiais · Milchin das Correntes",
      empreendimento: "Ambos",
      funcao: "Guilherme de Barros. Relações com investidores, novos negócios e projetos especiais. StoryForge é um projeto especial e um novo negócio.",
      eneagrama: ["Tipo 5"], disc: ["S", "C"],
      arquetipo: "Sábio-Criador",
      descricao: "Posição reservada. Papel narrativo: Milchin das Correntes — transversal, não pertence a nenhuma guilda mas alimenta todas. Lê o que outros não veem, abre rotas que outros não ousam mapear."
    },
    {
      nome: "TI · Engenheiro da Nau · StoryForge",
      empreendimento: "StoryForge",
      funcao: "Angelo. TI StoryForge. Par com Hamilton na FishJourney. Juntos cobrem as duas embarcações da frota.",
      eneagrama: ["Tipo 5"], disc: ["C", "D"],
      arquetipo: "Sábio ou Mágico",
      descricao: "Posição reservada. Personagem canônico: Anĝelo Prakto — O Elo Entre Mundos. Dom do Tuŝlego: leitura de correntes vivas e objetos. Tipo 9 asa 1 segundo D'Aurora."
    },
    {
      nome: "TI · Engenheiro da Nau · FishJourney",
      empreendimento: "FishJourney",
      funcao: "Hamilton. TI FishJourney. Perfil complementar ao Angelo na StoryForge.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Par com Angelo — juntos sustentam a infraestrutura técnica das duas embarcações."
    },
    {
      nome: "Consultora Espiritual · Ĉielpeceto",
      empreendimento: "Ambos",
      funcao: "Aila Pinheiro. Freira católica. Construiu conteúdo para A Little Piece of Heaven. Formação espiritual e conteúdo narrativo.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista — candidata a Aypát",
      descricao: "Posição reservada. Candidata ao papel de Aypát — Administradora de Ĉielpeceto. A entrevista com D'Aurora decide se ela ou Ana assume esse papel."
    },
    {
      nome: "Professora Carmelita · Ĉielpeceto",
      empreendimento: "Ambos",
      funcao: "Ana (esposa do André). Professora de seminário carmelita. Tradição contemplativa, formação teológica profunda.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista — candidata a Aypát",
      descricao: "Posição reservada. Candidata ao papel de Aypát — Administradora de Ĉielpeceto. A entrevista com D'Aurora decide se ela ou Aila assume esse papel."
    },
    {
      nome: "Naturalista do Lore · Compêndio de Akvon",
      empreendimento: "StoryForge",
      funcao: "Francisco (filho do Angelo). Construção de lore, flora e fauna de Akvon, ilustração naturalista, zoologia e botânica do universo.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Já recebeu carta de D'Aurora com três missões: Compêndio de Flora e Fauna, investigação dos Krevuloj, expedição com Aldric sobre os Velkantoj."
    },
    {
      nome: "Construtor de Lore · Nova Guilda Espírita",
      empreendimento: "StoryForge",
      funcao: "Davi (amigo da Bia). Construção de lore, expansão narrativa, fundação de nova guilda espírita no universo ACO.",
      eneagrama: [], disc: [],
      arquetipo: "A mapear na entrevista",
      descricao: "Posição reservada. Herdeiro de tradição espírita ecumênica fundada pela avó. Papel narrativo: Fundador da primeira guilda espírita de Akvon — terceira via espiritual que D'Aurora reconhece como legítima e necessária."
    }
  ];

  for (const v of vagas) await addVaga(v);

  // ═══════════════════════════════════════
  // PAPÉIS NARRATIVOS
  // ═══════════════════════════════════════
  console.log("\n=== PAPÉIS NARRATIVOS · Universo ACO ===\n");

  const papeis = [
    {
      nome: "Arquivista do Promontório",
      guilda: "Luminávio",
      mar: "Mares de Cima",
      habilidades: "Memória sistêmica, catalogação de conhecimento, leitura de padrões históricos, preservação das Leis",
      conexao: "Guarda os registros que D'Aurora não pode mais carregar sozinho — e que Dipé precisará consultar nos momentos de decisão crítica",
      descricao: "O Promontório Silenciado tem um arquivo vivo que nenhum sistema digital substituiu. O Arquivista conhece cada fragmento do Codex Tavirel e sabe quando e para quem abrir cada seção."
    },
    {
      nome: "Milchin das Correntes",
      guilda: "Luminávio",
      mar: "Mares de Cima",
      habilidades: "Leitura de fluidos de maré, percepção de padrões invisíveis, tradução entre mundos, cartografia de correntes",
      conexao: "Dipé encontrou sua rota porque alguém antes dele leu as correntes certas — o Milchin é quem torna rotas impossíveis em possíveis",
      descricao: "O Milchin não navega — ele lê o que os navegadores não conseguem ver. Função técnica de altíssima especialização dentro da Luminávio, rara e essencial para as expedições aos Mares de Cima."
    },
    {
      nome: "Cartógrafo de Rotas Esquecidas",
      guilda: "Luminávio",
      mar: "Mar do Meio",
      habilidades: "Mapeamento de territórios desconhecidos, síntese de informação fragmentada, criação de sistemas de orientação",
      conexao: "Dipé chegou ao Promontório sem mapa — o Cartógrafo garante que quem vem depois não precise chegar à deriva",
      descricao: "Cria e mantém os mapas que a Luminávio usa para formar novos navegadores. Não apenas registra o que existe — descobre o que ainda não foi nomeado."
    },
    {
      nome: "Diplomata entre Guildas",
      guilda: "Sem filiação",
      mar: "Mar do Meio",
      habilidades: "Mediação de conflitos, leitura de motivações ocultas, construção de pontes, comunicação em múltiplos registros",
      conexao: "O universo do ACO tem guildas em guerra fria permanente — Dipé precisará de alguém que navegue essas águas políticas sem se afogar",
      descricao: "Transita entre a Luminávio, a Preloma e os grupos independentes sem ser capturado por nenhum. Papel essencial para as missões que exigem negociação e aliança."
    },
    {
      nome: "Administradora de Ĉielpeceto · Aypát",
      guilda: "Luminávio",
      mar: "Mar do Meio",
      habilidades: "Profundidade contemplativa, lealdade ao todo da Luminávio, mediação entre espiritual e institucional, resistência à pressão sem confronto",
      conexao: "Quando Dipé chega a Ĉielpeceto, é Aypát quem reconhece nele algo que Tanwen não consegue ver — e abre as portas internas da cidade para ele",
      descricao: "Indicada por Zurara a D'Aurora. Ajudou a fundar Ĉielpeceto como espaço ecumênico. Carrega as chaves — não como cargo, mas como responsabilidade vivida. Pressionada por Tanwen, resiste sem confrontar diretamente. Papel a ser assumido por Aila ou Ana após entrevista com D'Aurora."
    },
    {
      nome: "Naturalista do Promontório · Francisco",
      guilda: "Luminávio",
      mar: "Mar do Meio",
      habilidades: "Ilustração naturalista, zoologia e botânica de Akvon, observação sem perturbar, registro com rigor e alma",
      conexao: "Já recebeu carta de D'Aurora. Aldric o aguarda na base das falésias. Três missões: Compêndio de Flora e Fauna, investigação dos Krevuloj, expedição sobre os Velkantoj",
      descricao: "Filho de navegador. Chegou ao Promontório não pelo chamado do mar, mas pelo olhar — seus desenhos revelaram dom natural para o naturalismo. O Filósofo (Ronduĉo) ficou parado ao lado de sua mochila durante toda a visita."
    },
    {
      nome: "Fundador da Nova Guilda Espírita",
      guilda: "Sem filiação",
      mar: "Mares de Cima",
      habilidades: "Mediação entre tradições, herança espírita ecumênica, leitura de dimensões que outras guildas não mapeiam",
      conexao: "Traz a Akvon uma terceira via espiritual — nem Luminávio nem Preloma. D'Aurora reconhece essa linhagem como legítima e necessária para o que está por vir",
      descricao: "Herdeiro de uma tradição espírita ecumênica fundada pela avó. A guilda que fundará será a primeira de Akvon a representar espiritualidade mediúnica e ancestral — completando o mapa espiritual que Preloma e Luminávio não cobrem sozinhas."
    },
    {
      nome: "Zurara · Fundador de Ĉielpeceto",
      guilda: "Sem filiação",
      mar: "Mar do Meio",
      habilidades: "Construção de comunidade, visão ecumênica, amizade de longa data com D'Aurora, gestão de territórios em tensão",
      conexao: "Velho amigo de D'Aurora. Através de Zurara algumas rotas de Ĉielpeceto se abrem para Dipé. É ele quem indica Aypát para a missão de administrar a cidade",
      descricao: "Construiu Ĉielpeceto como refúgio para os Prelomanoj por amor e deferência — não por ser um deles. Homem de mundo, tavernas e bons vinhos. Escreve com urgência e afeto. Carrega o peso de uma obra que ama e que está sendo pressionada por forças que não percebem que são a ameaça."
    },
    {
      nome: "Tanwen · Colaboradora de Ĉielpeceto",
      guilda: "Preloma",
      mar: "Mar do Meio",
      habilidades: "Fidelidade profunda, estudo consistente, amor genuíno pela tradição Prelomana, capacidade de mobilizar e inspirar",
      conexao: "Recebe Dipé com desconfiança — não por malícia, mas porque ele não cabe na moldura que ela conhece. Esse é o primeiro sinal de que a moldura está pequena",
      descricao: "Não é antagonista — é colaboradora fiel com uma moldura pequena demais para o que está em jogo. Sua lealdade está alinhada com a parte, não com o todo. Quando a pressão aumenta, lê fechamento como fidelidade. Representa a tensão real entre tradição e universalidade dentro da Luminávio."
    },
    {
      nome: "Anĝelo Prakto · O Elo Entre Mundos",
      guilda: "Luminávio",
      mar: "Mar do Meio",
      habilidades: "Tuŝlego — leitura de correntes vivas em reuniões e de objetos trabalhados por mãos humanas. Síntese de conversas complexas, catalogação viva do arquivo do Promontório",
      conexao: "D'Aurora reservou para Prakto três frentes de trabalho. A terceira exigirá que ele atravesse águas que pedem conflito real. Dipé será a testemunha desse momento",
      descricao: "Cresceu servindo pousadas nas bordas de Blanka Dunmaro — aprendeu a ler pessoas em estado de travessia. Chegou à Luminávio já formado por outra guilda de alto método. Tipo 9 asa 1 segundo D'Aurora. Fraqueza: evita confronto direto mesmo quando seria o caminho mais curto."
    }
  ];

  for (const p of papeis) await addPapel(p);

  console.log("\n✦ Vagas e Papéis populados com sucesso no Notion.");
  console.log("   11 vagas · 10 papéis narrativos");
}

main().catch(console.error);
