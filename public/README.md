# Sistema D'Aurora — Deploy Guide

## Estrutura de arquivos

```
projeto/
├── public/
│   └── index.html          ← App completo (frontend)
└── functions/
    └── api/
        ├── chat.js          ← Proxy Anthropic API
        ├── contact.js       ← Salva contato no Brevo
        ├── docx.js          ← Gera ficha .docx no servidor
        └── email.js         ← Envia email com .docx via Brevo
```

## Deploy no Cloudflare Pages

1. Criar repositório no GitHub com a estrutura acima
2. Conectar ao Cloudflare Pages (New Project → Connect to Git)
3. Build output directory: `public`
4. Configurar variáveis de ambiente:

| Variável        | Descrição                          |
|-----------------|------------------------------------|
| ANTHROPIC_KEY   | Chave Anthropic (sk-ant-...)       |
| BREVO_KEY       | Chave Brevo (xkeysib-...)          |
| SENDER_EMAIL    | Email verificado no Brevo          |

## Ajustes pós-deploy

### contact.js
- Trocar `listIds: [3]` pelo ID real da lista D'Aurora no Brevo
- Criar atributos customizados no Brevo: COMO_CHEGOU, OBS_DAURORA

### index.html
- Linha do modelo: `model:'claude-opus-4-5'` — usar claude-sonnet-4-6 para economia

## Variáveis de ambiente — NUNCA no código
Todas as chaves ficam apenas no painel do Cloudflare.
Settings → Variables and Secrets → Add variable

## Marcadores do sistema

| Marcador        | Função                              |
|-----------------|-------------------------------------|
| [ETAPA:X]       | Avança barra de progresso (1-4)     |
| [FICHA_INICIO]  | Início da ficha de personagem       |
| [FICHA_FIM]     | Fim da ficha — dispara o card       |

---
*Vilhelmo de Bahxos · FishJourney · StoryForge · Março 2026*
