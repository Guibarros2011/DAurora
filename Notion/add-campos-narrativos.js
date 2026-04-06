// add-campos-narrativos.js
// Rode uma vez: node add-campos-narrativos.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node add-campos-narrativos.js SEU_TOKEN"); process.exit(1); }

const DB = "32ba86cd3e898196ae0acb9dcea7cdb8";

async function run() {
  console.log("Adicionando campos Nome Narrativo e Background...");

  const res = await fetch(`https://api.notion.com/v1/databases/${DB}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      properties: {
        "Nome Narrativo": { rich_text: {} },
        "Background":     { rich_text: {} }
      }
    })
  });

  const d = await res.json();
  if (d.status >= 400) {
    console.error("Erro:", JSON.stringify(d));
    process.exit(1);
  }

  console.log("✓ Campo 'Nome Narrativo' adicionado");
  console.log("✓ Campo 'Background' adicionado");
  console.log("\nPróximo passo: rode o teste de fluxo novamente no painel admin.");
}

run().catch(console.error);
