// add-dauranto.js
// Rode uma vez: node add-dauranto.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node add-dauranto.js SEU_TOKEN"); process.exit(1); }

const DB_ENTREVISTADOS = "32ba86cd3e898196ae0acb9dcea7cdb8";
const BASE_URL = "https://daurora.pages.dev";

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

async function main() {

  // 1. Adicionar campo Ficha URL e status Daurant
  console.log("Atualizando database Entrevistados...");
  await notionPatch(`databases/${DB_ENTREVISTADOS}`, {
    properties: {
      "Ficha URL": { url: {} },
      "Status": {
        select: {
          options: [
            { name: "Entrevistado",   color: "gray" },
            { name: "Em avaliação",   color: "yellow" },
            { name: "Convidado",      color: "blue" },
            { name: "Na tripulação",  color: "green" },
            { name: "Daurant",        color: "orange" }
          ]
        }
      }
    }
  });
  console.log("✓ Campo Ficha URL e status Daurant adicionados");

  // 2. Buscar todos os entrevistados e atualizar Ficha URL
  console.log("\nAtualizando Ficha URL de todos os entrevistados...");
  const res = await notionPost(`databases/${DB_ENTREVISTADOS}/query`, {});
  const pages = res.results || [];

  for (const page of pages) {
    const fichaUrl = `${BASE_URL}/dauranto.html?id=${page.id}`;
    await notionPatch(`pages/${page.id}`, {
      properties: {
        "Ficha URL": { url: fichaUrl }
      }
    });
    const nome = page.properties["Nome"]?.title?.[0]?.plain_text || page.id;
    console.log(`  ✓ ${nome} → ${fichaUrl}`);
  }

  console.log("\n✦ Concluído.");
  console.log(`  ${pages.length} entrevistados atualizados com Ficha URL`);
  console.log("  Status 'Daurant' disponível no campo Status");
}

main().catch(console.error);
