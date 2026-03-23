const token = process.argv[2];
if (!token) { console.error("Uso: node add-ficha-completa.js SEU_TOKEN"); process.exit(1); }
const DB = "32ba86cd3e898196ae0acb9dcea7cdb8";

async function run() {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ properties: { "Ficha Completa": { rich_text: {} } } })
  });
  const d = await res.json();
  if (d.status >= 400) { console.error(JSON.stringify(d)); process.exit(1); }
  console.log("✓ Campo 'Ficha Completa' adicionado ao database Entrevistados");
}
run().catch(console.error);
