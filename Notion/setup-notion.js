// setup-notion.js
// Rode uma vez: node setup-notion.js SEU_TOKEN_AQUI

const token = process.argv[2];
const parentId = process.argv[3] || "cbacb6b7dfb94c96941aa68f4818db09";
if (!token) { console.error("Uso: node setup-notion.js SEU_TOKEN"); process.exit(1); }


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
  if (data.status && data.status >= 400) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  console.log("Criando página Akvon...");
  const akvon = await notionPost("pages", {
    parent: { page_id: parentId },
    icon: { type: "emoji", emoji: "⚓" },
    properties: { title: { title: [{ text: { content: "Akvon" } }] } }
  });
  console.log("✓ Akvon criado:", akvon.id);

  console.log("Criando página ACO...");
  const aco = await notionPost("pages", {
    parent: { page_id: akvon.id },
    icon: { type: "emoji", emoji: "🌊" },
    properties: { title: { title: [{ text: { content: "ACO — A Cruzada dos Oceanos" } }] } }
  });
  console.log("✓ ACO criado:", aco.id);

  console.log("Criando database Vagas...");
  await notionPost("databases", {
    parent: { page_id: aco.id },
    icon: { type: "emoji", emoji: "⛵" },
    title: [{ text: { content: "Vagas · FishJourney & StoryForge" } }],
    properties: {
      "Nome da vaga":     { title: {} },
      "Empreendimento":   { select: { options: [{ name: "FishJourney", color: "blue" }, { name: "StoryForge", color: "orange" }, { name: "Ambos", color: "purple" }] } },
      "Função real":      { rich_text: {} },
      "Status":           { select: { options: [{ name: "Aberta", color: "green" }, { name: "Fechada", color: "red" }, { name: "Em avaliação", color: "yellow" }] } },
      "Eneagrama":        { multi_select: { options: [
        { name: "Tipo 1", color: "gray" }, { name: "Tipo 2", color: "pink" }, { name: "Tipo 3", color: "orange" },
        { name: "Tipo 4", color: "purple" }, { name: "Tipo 5", color: "blue" }, { name: "Tipo 6", color: "green" },
        { name: "Tipo 7", color: "yellow" }, { name: "Tipo 8", color: "red" }, { name: "Tipo 9", color: "brown" }
      ]}},
      "DISC":             { multi_select: { options: [{ name: "D", color: "red" }, { name: "I", color: "yellow" }, { name: "S", color: "green" }, { name: "C", color: "blue" }] } },
      "Arquétipo":        { rich_text: {} },
      "Descrição":        { rich_text: {} }
    }
  });
  console.log("✓ Database Vagas criado");

  console.log("Criando database Papéis Narrativos...");
  await notionPost("databases", {
    parent: { page_id: aco.id },
    icon: { type: "emoji", emoji: "📜" },
    title: [{ text: { content: "Papéis Narrativos · Universo ACO" } }],
    properties: {
      "Nome do papel":        { title: {} },
      "Guilda / Filiação":    { select: { options: [
        { name: "Luminávio", color: "blue" }, { name: "Preloma", color: "red" },
        { name: "Ordo Malpeza", color: "purple" }, { name: "Ligo Senradika", color: "green" },
        { name: "Sem filiação", color: "gray" }
      ]}},
      "Mar de atuação":       { select: { options: [
        { name: "Mares de Cima", color: "blue" }, { name: "Mar do Meio", color: "green" }, { name: "Mares de Baixo", color: "red" }
      ]}},
      "Status":               { select: { options: [{ name: "Disponível", color: "green" }, { name: "Ocupado", color: "red" }] } },
      "Habilidades":          { rich_text: {} },
      "Conexão com Dipé":     { rich_text: {} },
      "Descrição narrativa":  { rich_text: {} }
    }
  });
  console.log("✓ Database Papéis Narrativos criado");

  console.log("Criando database Entrevistados...");
  await notionPost("databases", {
    parent: { page_id: aco.id },
    icon: { type: "emoji", emoji: "🧭" },
    title: [{ text: { content: "Entrevistados · D'Aurora" } }],
    properties: {
      "Nome":                   { title: {} },
      "Email":                  { email: {} },
      "Data":                   { date: {} },
      "Eneagrama":              { select: { options: [
        { name: "Tipo 1 · Perfeccionista", color: "gray" }, { name: "Tipo 2 · Prestativo", color: "pink" },
        { name: "Tipo 3 · Realizador", color: "orange" }, { name: "Tipo 4 · Individualista", color: "purple" },
        { name: "Tipo 5 · Investigador", color: "blue" }, { name: "Tipo 6 · Leal", color: "green" },
        { name: "Tipo 7 · Entusiasta", color: "yellow" }, { name: "Tipo 8 · Desafiador", color: "red" },
        { name: "Tipo 9 · Pacificador", color: "brown" }
      ]}},
      "DISC dominante":         { select: { options: [{ name: "D · Dominância", color: "red" }, { name: "I · Influência", color: "yellow" }, { name: "S · Estabilidade", color: "green" }, { name: "C · Conformidade", color: "blue" }] } },
      "Arquétipo central":      { rich_text: {} },
      "Empreendimento sugerido":{ select: { options: [{ name: "FishJourney", color: "blue" }, { name: "StoryForge", color: "orange" }, { name: "Ambos", color: "purple" }] } },
      "Função sugerida":        { rich_text: {} },
      "Papel narrativo":        { rich_text: {} },
      "Posição nos Mares":      { select: { options: [
        { name: "Mares de Cima", color: "blue" }, { name: "Mar do Meio", color: "green" }, { name: "Mares de Baixo", color: "red" }, { name: "Transversal", color: "purple" }
      ]}},
      "Como chegou":            { rich_text: {} },
      "Nota de D'Aurora":       { rich_text: {} },
      "Status":                 { select: { options: [
        { name: "Entrevistado", color: "gray" }, { name: "Em avaliação", color: "yellow" },
        { name: "Convidado", color: "blue" }, { name: "Na tripulação", color: "green" }
      ]}}
    }
  });
  console.log("✓ Database Entrevistados criado");

  console.log("\n✦ Estrutura Akvon/ACO criada com sucesso no Notion.");
}

main().catch(console.error);
