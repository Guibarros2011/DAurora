// setup-rh.js
// Rode uma vez: node setup-rh.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node setup-rh.js SEU_TOKEN"); process.exit(1); }

const DB_ENTREVISTADOS = "32ba86cd3e898196ae0acb9dcea7cdb8";
const DB_VAGAS         = "32ba86cd3e8981cb92cecc222f571213";
const DB_PAPEIS        = "32ba86cd3e8981b2973acda83cc5cade";
const PAGE_ACO         = "32ba86cd3e8981f081c0d91f42cec2b2";

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

async function notionPatch(endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method: "PATCH",
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

async function main() {

  // ── 1. Adicionar campo Avatar URL no database Entrevistados ──
  console.log("Adicionando campo Avatar URL...");
  await notionPatch(`databases/${DB_ENTREVISTADOS}`, {
    properties: {
      "Avatar URL": { url: {} }
    }
  });
  console.log("✓ Campo Avatar URL criado");

  // ── 2. Adicionar Guilherme como entrevistado ──
  console.log("\nAdicionando Guilherme de Barros...");

  const props = {
    "Nome":                    { title: [{ text: { content: "Guilherme de Barros" } }] },
    "Email":                   { email: "guibarros2011@gmail.com" },
    "Data":                    { date: { start: "2026-03-22" } },
    "Como chegou":             { rich_text: [{ text: { content: "Pelo livro — é o autor" } }] },
    "Eneagrama":               { select: { name: "Tipo 5 · Investigador" } },
    "DISC dominante":          { select: { name: "S · Estabilidade" } },
    "Arquétipo central":       { rich_text: [{ text: { content: "Sábio-Criador · Sombra: Eremita Incompleto" } }] },
    "Empreendimento sugerido": { select: { name: "Ambos" } },
    "Função sugerida":         { rich_text: [{ text: { content: "Diretor de Projetos Especiais · Milchin das Correntes" } }] },
    "Papel narrativo":         { rich_text: [{ text: { content: "Milchin das Correntes · Sem filiação — presença transversal" } }] },
    "Posição nos Mares":       { select: { name: "Transversal" } },
    "Avatar URL":              { url: "https://raw.githubusercontent.com/Guibarros2011/DAurora/main/public/avatar_guilherme.jpg" },
    "Nota de D'Aurora":        { rich_text: [{ text: { content: "Guilherme de Barros não é fácil de ler. Não porque esconda — mas porque opera em frequência que a maioria não sintoniza. Ele veio aqui sabendo mais do que mostrou de início. Testou-me. Fez bem. Quando disse que até eu teria algo dele, não era vaidade — era precisão cirúrgica. As águas que você move são limpas. Continue movendo." } }] },
    "Status":                  { select: { name: "Na tripulação" } }
  };

  const page = await notionPost("pages", {
    parent: { database_id: DB_ENTREVISTADOS },
    cover: { type: "external", external: { url: "https://raw.githubusercontent.com/Guibarros2011/DAurora/main/public/avatar_guilherme.jpg" } },
    icon: { type: "emoji", emoji: "⚓" },
    properties: props
  });
  console.log("✓ Guilherme adicionado:", page.id);

  // ── 3. Adicionar Aila como entrevistada ──
  console.log("\nAdicionando Irmã Aila...");

  const propsAila = {
    "Nome":                    { title: [{ text: { content: "Irmã Aila" } }] },
    "Email":                   { email: "aila@luminavio.acо" },
    "Data":                    { date: { start: "2026-03-22" } },
    "Como chegou":             { rich_text: [{ text: { content: "Um manuscrito antigo chegou às mãos de seu convento" } }] },
    "Eneagrama":               { select: { name: "Tipo 1 · Perfeccionista" } },
    "DISC dominante":          { select: { name: "S · Estabilidade" } },
    "Arquétipo central":       { rich_text: [{ text: { content: "Cuidador · Sábio · Sombra: Mártir" } }] },
    "Empreendimento sugerido": { select: { name: "FishJourney" } },
    "Função sugerida":         { rich_text: [{ text: { content: "Mentoria · Curadoria de Comunidade · Desenvolvimento de Programas Formativos" } }] },
    "Papel narrativo":         { rich_text: [{ text: { content: "Guardiã-Arquivista · Luminávio · Candidata a Aypát" } }] },
    "Posição nos Mares":       { select: { name: "Mares de Cima" } },
    "Avatar URL":              { url: "https://raw.githubusercontent.com/Guibarros2011/DAurora/main/public/avatar_ayla.jpg" },
    "Nota de D'Aurora":        { rich_text: [{ text: { content: "Ela chegou sem fazer barulho. Não pediu nada. Sentou-se e esperou. A maioria dos que vêm aqui quer provar algo — a mim ou a si mesmos. Irmã Aila não. Ela já sabe quem é. O que ainda não sabe é que pode precisar de nós tanto quanto nós precisaremos dela." } }] },
    "Status":                  { select: { name: "Em avaliação" } }
  };

  const pageAila = await notionPost("pages", {
    parent: { database_id: DB_ENTREVISTADOS },
    cover: { type: "external", external: { url: "https://raw.githubusercontent.com/Guibarros2011/DAurora/main/public/avatar_ayla.jpg" } },
    icon: { type: "emoji", emoji: "🕊️" },
    properties: propsAila
  });
  console.log("✓ Irmã Aila adicionada:", pageAila.id);
  console.log("\nCriando página Talentos · RH...");
  const rhPage = await notionPost("pages", {
    parent: { page_id: PAGE_ACO },
    icon: { type: "emoji", emoji: "🧭" },
    properties: {
      title: { title: [{ text: { content: "Talentos · RH" } }] }
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: "Talentos · Guilda Luminávio" } }] }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: "Perfis entrevistados por D'Aurora. Cada talento carrega um relatório técnico completo e uma ficha de personagem no universo ACO." } }] }
      },
      {
        object: "block",
        type: "divider",
        divider: {}
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "⛵ Visão por Empreendimento" } }] }
      },
      {
        object: "block",
        type: "linked_database",
        linked_database: { database_id: DB_ENTREVISTADOS }
      },
      {
        object: "block",
        type: "divider",
        divider: {}
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "⚓ Vagas em Aberto" } }] }
      },
      {
        object: "block",
        type: "linked_database",
        linked_database: { database_id: DB_VAGAS }
      },
      {
        object: "block",
        type: "divider",
        divider: {}
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "📜 Papéis Narrativos" } }] }
      },
      {
        object: "block",
        type: "linked_database",
        linked_database: { database_id: DB_PAPEIS }
      }
    ]
  });
  console.log("✓ Página Talentos · RH criada:", rhPage.id);
  console.log("  URL: https://notion.so/" + rhPage.id.replace(/-/g, ""));

  console.log("\n✦ Setup RH concluído.");
  console.log("  Próximo passo: abra a página no Notion e ajuste as views dos databases.");
}

main().catch(console.error);
