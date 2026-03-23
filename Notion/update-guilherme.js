// update-guilherme.js
// Rode uma vez: node update-guilherme.js SEU_TOKEN

const token = process.argv[2];
if (!token) { console.error("Uso: node update-guilherme.js SEU_TOKEN"); process.exit(1); }

const PAGE_ID = "32ca86cd-3e89-8154-a814-e047bc1a684a";

const fichaCompleta = `A CRUZADA DOS OCEANOS
Guilda Luminávio · Ficha de Personagem
GUILHERME DE BARROS
Guilherme de Barros · 22/03/2026

Papel e Filiação
Milchin das Correntes · Sem filiação — presença transversal

Posição nos Mares
Operante nos Mares de Cima · Manifesto no Mar do Meio · Corrente, não habitante

RELATÓRIO TÉCNICO DE PERFIL

Eneagrama
Tipo: Tipo 5 — O Investigador
O Observador que busca integração com a fonte. Contemplativo por natureza, seu primeiro movimento é interno — recolhimento antes da ação, escuta antes da fala. Teme ser recipiente indigno do que carrega. Deseja não apenas compreender, mas ser canal limpo para o que precisa passar.

DISC
Perfil dominante: S — Estabilidade / C — Conformidade
Arquiteto de estruturas longas. Prefere a semente enterrada funda à colheita rápida. Opera por influência sutil, não por comando direto. Sob pressão, contempla antes de agir — e age construindo pontes, não muros.

Arquétipo
Central: O Sábio-Criador — aquele que traduz dramas reais em forma literária, que dá corpo ao que existia antes das palavras, que prepara o tear para que outros teçam.
Sombra: O Eremita Incompleto — a tentação de ser só corrente, só vento, dissolvendo-se na obra a ponto de perder contorno próprio.

Encaixe nos Empreendimentos
Empreendimento: Ambos
Função: Diretor de Projetos Especiais · Milchin das Correntes

FICHA DO PERSONAGEM · UNIVERSO ACO

Background
Guilherme de Barros não chegou a Akvon como náufrago ou buscador de fortuna. Chegou como algo mais raro — alguém que já trazia mapas de outros mares, escritos em línguas que poucos leem. Não fundou guilda. Não comanda frota. Opera de forma transversal — um sopro que passa por todas as velas sem pertencer a nenhuma.

Habilidades
- Tradução de Mundos: Capacidade de dar forma literária a verdades que resistem à linguagem direta
- Leitura de Correntes: Percebe o que move as pessoas antes que elas mesmas percebam
- Arquitetura de Longo Prazo: Constrói estruturas que perduram
- Curadoria de Coerência: Define escalas de pertencimento que permitem diversidade sem dissolução

Fraqueza Narrativa
A ausência de contorno. Ser todos e nenhum é liberdade — mas também risco de dissolução.

Nota de D'Aurora
Guilherme de Barros não é fácil de ler. Não porque esconda — mas porque opera em frequência que a maioria não sintoniza. Ele veio aqui sabendo mais do que mostrou de início. Testou-me. Fez bem. As águas que você move são limpas. Continue movendo.`;

async function run() {
  const res = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      properties: {
        "Ficha Completa": {
          rich_text: [{ text: { content: fichaCompleta.substring(0, 2000) } }]
        }
      }
    })
  });
  const d = await res.json();
  if (d.status >= 400) { console.error(JSON.stringify(d)); process.exit(1); }
  console.log("✓ Ficha Completa do Guilherme atualizada no Notion");
  console.log("  Link: https://daurora.pages.dev/dauranto.html?id=32ca86cd-3e89-8154-a814-e047bc1a684a");
}

run().catch(console.error);
