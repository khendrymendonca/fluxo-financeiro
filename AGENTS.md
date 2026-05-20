# REGRA OBRIGATÓRIA — ENCODING E TEXTOS VISÍVEIS

- Todos os arquivos devem ser UTF-8.
- Textos visíveis ao usuário não podem conter mojibake.
- Nunca finalizar sprint com caracteres como `�`, `Ã§`, `Ã£`, `Ãµ`, `â€`, `N�`, `1�` em labels, botões, placeholders, tooltips, títulos ou mensagens.
- Rodar `npm run check:encoding` antes do fechamento.
- Corrigir manualmente textos quebrados; não fazer conversão automática cega em arquivo inteiro.
- Se houver falso positivo legítimo, adicionar allowlist pequena e justificada no script.
