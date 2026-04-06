# Sistema de Marcadores · D'Aurora ACO
## Guia de Deploy Completo

---

## PASSO 1 · Adicionar arquivos ao repositório

Copie para `~/daurora` os seguintes arquivos:

```
functions/api/setup-notion.js   → cria os DBs no Notion
functions/api/marcadores.js     → POST/GET de pins
functions/api/locacao.js        → dados de uma locação
public/locacao.html             → hotsite público
```

```bash
cd ~/daurora

cp functions/api/setup-notion.js functions/api/
cp functions/api/marcadores.js   functions/api/
cp functions/api/locacao.js      functions/api/
cp public/locacao.html           public/
```

---

## PASSO 2 · Adicionar secrets nas Cloudflare Pages

No painel da Cloudflare Pages → Settings → Variables and Secrets:

Você já tem: NOTION_TOKEN, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ✅

Ainda não tem (vai obter no Passo 3):
- NOTION_DB_LOCACOES
- NOTION_DB_CAPITULOS

---

## PASSO 3 · Rodar o setup do Notion (UMA VEZ)

Depois do primeiro deploy, acesse no browser:

```
https://daurora.pages.dev/api/setup-notion
```

Isso vai:
✅ Criar o database "Locações · ACO" (filho da raiz ACO)
✅ Criar o database "Capítulos · ACO" (filho da raiz ACO)
✅ Criar a Relation bidirecional Locações ↔ Capítulos

A resposta JSON vai retornar algo assim:
```json
{
  "ok": true,
  "secrets": {
    "NOTION_DB_LOCACOES": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "NOTION_DB_CAPITULOS": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

Copie esses dois IDs e adicione como secrets nas Cloudflare Pages.

---

## PASSO 4 · Atualizar o admin.html

Abra `public/admin.html` e:

1. Adicione os estilos do arquivo `PATCH-admin-mapa.html` dentro do `<style>`
2. Substitua o conteúdo do tab Mapa Histórico pelo HTML do patch
3. Adicione o `<script>` do patch antes do `</body>`

O seletor de tab no script usa `[data-tab="mapa"]` — ajuste se o seu admin usar
outro seletor/evento para ativar o tab do mapa.

---

## PASSO 5 · Fazer deploy

```bash
cd ~/daurora
git add -A
git commit -m "feat: sistema de marcadores + locacao.html + databases Notion"
git push
```

Cloudflare Pages faz o deploy automaticamente.

---

## PASSO 6 · Criar marcadores.json inicial no R2

Se o bucket ainda não tiver um `marcadores.json`, crie um arquivo vazio:

```json
{ "marcadores": [] }
```

E faça upload para o bucket `daurora-mapas` com o caminho `marcadores.json`
(sem o prefixo `tiles/tiles/`).

---

## FLUXO DE USO

1. Acesse `https://daurora.pages.dev/admin.html` → aba Mapa Histórico
2. Clique em qualquer ponto do mapa
3. Modal abre → preencha nome, tipo, capítulo, descrição, personagens, local real
4. Clique em "Criar locação"
5. Sistema cria automaticamente:
   - Pin no mapa (imediato)
   - Entrada em `marcadores.json` no R2
   - Página no Notion (filha do DB Locações) com links de volta
   - Abre `locacao.html?id=xxx` em nova aba

---

## FLUXO DO AGENTE (futuro)

Quando você marcar um capítulo como "Publicado" no DB Capítulos:
- Um webhook ou função periódica lê o texto do capítulo
- Identifica nomes de locações citadas
- Cria a Relation automática com as páginas de Locação correspondentes
- A `locacao.html` passa a listar o capítulo na seção "Capítulos onde aparece"

---

## ARQUIVOS CRIADOS

| Arquivo | Função |
|---|---|
| `functions/api/setup-notion.js` | Cria DBs + Relation no Notion (roda 1x) |
| `functions/api/marcadores.js` | POST: cria pin+página / GET: lista pins |
| `functions/api/locacao.js` | GET: dados de uma locação + capítulos |
| `public/locacao.html` | Hotsite público da locação |
| `PATCH-admin-mapa.html` | Estilos+HTML+JS para o admin |
