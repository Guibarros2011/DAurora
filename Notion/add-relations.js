// add-relations.js
// Rode uma vez: node add-relations.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node add-relations.js SEU_TOKEN"); process.exit(1); }

const DB_ENTREVISTADOS = "32ba86cd3e898196ae0acb9dcea7cdb8";
const DB_VAGAS         = "32ba86cd3e8981cb92cecc222f571213";
const DB_PAPEIS        = "32ba86cd3e8981b2973acda83cc5cade";

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

  // 1. Adicionar relação Entrevistados → Vagas
  console.log("Criando relação Entrevistados → Vagas...");
  await notionPatch(`databases/${DB_ENTREVISTADOS}`, {
    properties: {
      "Vaga matched": {
        relation: {
          database_id: DB_VAGAS,
          type: "dual_property",
          dual_property: {
            synced_property_name: "Candidatos"
          }
        }
      }
    }
  });
  console.log("✓ Relação Vagas criada");

  // 2. Adicionar relação Entrevistados → Papéis
  console.log("Criando relação Entrevistados → Papéis Narrativos...");
  await notionPatch(`databases/${DB_ENTREVISTADOS}`, {
    properties: {
      "Papel narrativo matched": {
        relation: {
          database_id: DB_PAPEIS,
          type: "dual_property",
          dual_property: {
            synced_property_name: "Candidatos"
          }
        }
      }
    }
  });
  console.log("✓ Relação Papéis criada");

  console.log("\n✦ Relações criadas com sucesso.");
  console.log("  Em Entrevistados: campos 'Vaga matched' e 'Papel narrativo matched'");
  console.log("  Em Vagas: campo 'Candidatos'");
  console.log("  Em Papéis: campo 'Candidatos'");
}

main().catch(console.error);
