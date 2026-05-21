# MEMÓRIAS — REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO

## REGRA GERAL DO PRODUTO

O Fluxo Financeiro deve ser tratado como um app financeiro modular, robusto e profissional.

O objetivo principal atual não é vender ainda, mas fazer o app funcionar de forma confiável para uso real e ser escalável no futuro.

O desenvolvimento deve evitar gambiarras, excesso de código e soluções temporárias sem documentação. Sempre que uma solução temporária for usada, ela deve ficar registrada como tal.

O app deve ser modular:
- As funcionalidades podem existir no backend/código.
- O acesso/visibilidade deve ser controlado por plano/módulo/feature flag.
- Não remover estruturalmente features apenas porque um plano não deve vê-las.
- Planos futuros: Basic, Pro e Premium.
- A matriz final de planos ainda não deve ser definida agora.

Não mexer sem autorização explícita em:
- Supabase migrations;
- RLS;
- SuperPage/admin;
- estrutura multiusuário/família;
- matriz de planos;
- regras financeiras já estabilizadas.

---

# REGRA DE UI/UX DO APP

## Padrão visual geral

O Fluxo deve parecer um produto financeiro profissional, não um tutorial.

Diretriz visual:

- Menos explicação.
- Mais indicador.
- Mais comparação.
- Mais ação.
- Menos texto.
- Mais leitura executiva.

Evitar na interface:
- parágrafos explicativos longos;
- textos de onboarding no corpo das telas;
- frases como “Compare...” ou “Quanto da receita vira despesa...”;
- badges de regra técnica expostos sem necessidade;
- explicações amadoras que diminuem a percepção profissional.

Preferir:
- labels curtas;
- cards objetivos;
- indicadores comparativos;
- status visuais;
- tooltips discretos;
- ícones;
- nomes financeiros fortes.

Exemplos de nomenclatura aprovada:
- “Total de Consumo vs Receita”
- “Composição das Despesas”
- “Análise de Categoria”
- “Orçamentos por Categoria”
- “Orçamentos por Agrupamento”
- “Receitas previstas”
- “Despesas previstas”
- “Saldo previsto”
- “Receitas efetivas”
- “Despesas efetivas”
- “Saldo efetivo”

Regras de cálculo complexas devem ficar em tooltip, documentação ou código, não como texto fixo na tela.

---

# REGRA DE BOOT / ENTRADA DO APP

Ao abrir o app em uma nova sessão real, o Fluxo pode exibir uma intro curta com a logo.

Se o usuário estiver logado:
- o app deve mostrar uma tela de carregamento/sincronização;
- deve executar automaticamente a mesma rotina do botão “Atualizar”;
- deve carregar os dados reais antes de liberar a Home;
- a Home não pode abrir com valores zerados falsos.

A rotina de boot deve:
1. Aguardar autenticação/sessão pronta.
2. Confirmar usuário autenticado.
3. Executar refresh real dos dados financeiros.
4. Só liberar o app após refresh ou timeout/falha controlada.
5. Em erro, mostrar aviso discreto e abrir com dados disponíveis.

O usuário não deve precisar clicar em “Atualizar” ao abrir o app.

O botão “Atualizar” manual deve continuar existindo e funcionando como fallback.

O app não deve recarregar automaticamente no meio de ações críticas, como:
- editar lançamento;
- pagar fatura;
- criar acordo;
- parcelar fatura;
- cadastrar conta;
- editar categoria.

Atualizações PWA/service worker podem ser aplicadas automaticamente apenas durante o boot. Durante uso normal, usar aviso/fallback manual.

---

# REGRA DE TUTORIAL

O tutorial guiado foi removido completamente do app.

Não deve existir:
- oferta inicial de tutorial;
- botão “?” / “Como utilizar”;
- popups de tour guiado;
- hook de tutorial;
- localStorage de tutorial;
- logs de tutorial;
- componentes GuidedTour, HelpButton ou TutorialOfferDialog.

Motivo:
O tutorial estava gerando comportamento indesejado e atrapalhando a experiência. O app deve comunicar por UX profissional, não por explicações de onboarding.

Se no futuro houver ajuda, ela deve ser repensada como central de ajuda discreta, não como tutorial automático.

---

# REGRA DE LOGO / MARCA

A nova logo oficial do Fluxo deve substituir completamente:
- logo antiga;
- ícone provisório;
- logo do Lovable;
- favicon antigo;
- PWA icons antigos;
- manifest antigo;
- qualquer resquício visual anterior.

A logo dentro do app deve usar SVG/estrutura compatível com `currentColor`, para acompanhar a cor de destaque/accent color do cliente.

No app:
- a logo deve aparecer na intro;
- login;
- header;
- sidebar;
- mobile;
- qualquer ponto de marca.

Para favicon/PWA:
- pode usar versão estática da logo;
- manifest e service worker devem apontar para novos arquivos versionados quando necessário;
- o ícone instalado pode depender de cache do navegador/sistema operacional e pode demorar para atualizar.

---

# REGRA DE ENCODING E TEXTOS VISÍVEIS

Todos os arquivos devem permanecer em UTF-8.

É proibido finalizar sprint com mojibake/acentuação quebrada em textos visíveis.

Exemplos proibidos:
- LanÃ§amento
- Descri��o
- A entrada � separada
- N� de Parcelas
- 1� Parcela
- GestÃ£o
- CartÃ£o
- RelatÃ³rios
- OrÃ§amentos
- ConfiguraÃ§Ãµes
- â€

Textos corretos:
- Lançamento
- Descrição
- Gestão
- Cartão
- Relatórios
- Orçamentos
- Configurações
- Nº
- 1ª
- Mês
- Próximo
- Competência

Regra permanente:
- antes de finalizar qualquer sprint, rodar `npm run check:encoding`;
- não fazer conversão automática cega de arquivos inteiros;
- corrigir manualmente textos quebrados;
- allowlist deve ser mínima e justificada.

Arquivos de proteção existentes:
- `.editorconfig` com `charset = utf-8`;
- `AGENTS.md` com regra obrigatória de encoding;
- `scripts/check-mojibake.mjs`;
- `package.json` com `check:encoding` e `validate`.

Validação recomendada de fechamento:
- `npm run check:encoding`
- `npm test`
- `npm run build`
- `npm run lint`

---

# REGRA DE RESPONSIVIDADE

Modais com formulários longos devem ser responsivos.

No desktop:
- podem ocupar mais largura/altura da tela;
- devem usar `max-height` baseado em viewport;
- corpo do modal deve ter `overflow-y-auto`;
- conteúdo não pode ficar cortado.

No mobile:
- modal deve ocupar quase toda a tela;
- campos devem ir para uma coluna;
- rolagem deve funcionar;
- botões devem continuar acessíveis;
- inputs não podem ficar escondidos pelo teclado.

Exemplo importante:
O modal de Novo Acordo/Edição de Acordo deve ser largo o suficiente no desktop e rolável no mobile, porque agora possui campos de entrada, parcelas, datas e total.

---

# REGRA DE TELAS E RESPONSABILIDADES

## Gestão de Contas

Gestão de Contas é a tela operacional.

Ela responde:
“O que preciso pagar ou baixar?”

Regra:
- mostra obrigações do mês selecionado;
- mostra pendências anteriores ainda abertas;
- não deve depender de `original_id` para exibir obrigação real;
- pendência anterior em aberto deve aparecer mesmo sem `original_id`.

No filtro por Mês:
- mostra obrigações do mês inteiro;
- mais pendências anteriores abertas.

No filtro por Dia:
- mostra obrigações daquele dia;
- mais pendências anteriores abertas;
- não mostra obrigações futuras depois do dia selecionado.

Filtro Dia deve existir na Gestão de Contas.

Pagamentos de fatura devem acontecer exclusivamente pela Gestão de Contas.

---

## Home / MonthPlan

Home/MonthPlan é uma tela de decisão mensal.

Ela responde:
“Como está o mês selecionado?”

Cards principais da Home devem usar competência do mês selecionado:
- não somar despesas pendentes de meses anteriores dentro dos cards principais;
- pendências anteriores podem aparecer apenas em indicador separado;
- vencidas devem usar a data real de hoje, não o fim do mês selecionado.

Regra importante:
- `viewDate` define a competência analisada;
- `currentDate`/data real define se algo está vencido.

Home não deve funcionar como Gestão de Contas disfarçada.

Filtro Dia não deve existir na Home.

---

## Cartões

A tela de Cartões é demonstrativa.

Ela deve mostrar:
- cartão selecionado;
- limite total;
- limite usado;
- limite disponível;
- percentual usado;
- fatura do mês selecionado;
- lista de compras/parcelas da fatura;
- status da fatura;
- atalho para Gestão de Contas.

A tela de Cartões não deve:
- pagar fatura;
- baixar fatura;
- parcelar fatura;
- fazer movimentação financeira real.

Pagamentos e baixas de fatura acontecem somente na Gestão de Contas.

Foram removidos da UI de Cartões os blocos:
- Total lançado;
- Valor pago;
- Diferença a conciliar;
- Gastos;
- Disponível como card separado;
- mensagens de conciliação visual que confundiam o usuário.

Esses cálculos podem existir internamente, mas não devem poluir a tela.

---

## Lançamentos

Lançamentos é o extrato/movimentos registrados.

Deve mostrar:
- compras;
- despesas;
- receitas;
- transferências;
- pagamentos de fatura;
- compras de cartão;
- acordos;
- entradas e parcelas quando aplicável.

Compra no cartão aparece em Lançamentos, mas não conta como despesa efetiva.

Pagamento de fatura aparece em Lançamentos e conta como despesa efetiva.

Transferências aparecem em Lançamentos, mas não contam como receita/despesa.

Filtro Dia deve permanecer em Lançamentos.

---

## Relatórios

Relatórios é uma tela analítica e projetiva.

Ela deve responder:
- como os meses futuros vão ficar;
- quanto entra;
- quanto sai;
- quanto sobra/falta;
- como evolui o consumo;
- quais categorias/macrogrupos consomem mais;
- como o período atual compara com o anterior.

Relatórios deve ter modos:

### Projetado

Modo padrão.

Considera:
- receitas previstas;
- despesas previstas;
- contas fixas/futuras;
- faturas futuras;
- parcelas futuras;
- acordos futuros;
- despesas pendentes;
- receitas pendentes;
- recorrências;
- compromissos do período.

Não exige `isPaid`.

### Realizado

Considera somente caixa efetivo:
- receitas pagas/recebidas;
- despesas pagas;
- pagamento de fatura;
- não soma compra comum no cartão;
- não soma transferência.

### Cards principais

Projetado:
- Receitas previstas;
- Despesas previstas;
- Saldo previsto.

Realizado:
- Receitas efetivas;
- Despesas efetivas;
- Saldo efetivo.

Comparativos dos cards devem ser visíveis e BI-like:
- valor atual;
- variação absoluta;
- percentual;
- direção;
- cor semântica.

Regra de cor:
- receita/saldo aumentando = positivo;
- receita/saldo reduzindo = negativo;
- despesa aumentando = negativo;
- despesa reduzindo = positivo;
- consumo aumentando = negativo;
- consumo reduzindo = positivo.

### Períodos

Mês:
- calcula o mês selecionado;
- compara com mês anterior.

Semestre:
- calcula semestre selecionado;
- deve permitir selecionar 1º ou 2º semestre;
- evolução semestral deve mostrar contexto como 1S/ano anterior, 2S/ano anterior, 1S/ano atual, 2S/ano atual;
- compara com semestre anterior.

Ano:
- calcula ano selecionado;
- compara com ano anterior.

Filtro Dia não deve existir em Relatórios.

---

# REGRA DE RELATÓRIOS — TOTAL DE CONSUMO VS RECEITA

O antigo gráfico de Evolução Mensal foi substituído por uma métrica mais útil: Total de Consumo vs Receita.

Cálculo:

Consumo da receita (%) =
despesas do período / receitas do período × 100

No modo Projetado:
- usa receitas previstas;
- usa despesas previstas.

No modo Realizado:
- usa receitas efetivas;
- usa despesas efetivas.

Deve exibir:
- percentual;
- valor consumido;
- receita total;
- variação contra período anterior em pontos percentuais;
- gráfico de linha/evolução.

Exemplo:
Total de Consumo vs Receita
81,0%
R$ 3.506,71 de R$ 4.330,00
↓ 17,6 p.p. vs mês anterior

Sem textos explicativos longos.

---

# REGRA DE RELATÓRIOS — COMPOSIÇÃO DAS DESPESAS

Composição das Despesas deve destrinchar o total de despesas do período selecionado por categoria.

Mês:
- despesas do mês por categoria.

Semestre:
- despesas acumuladas do semestre por categoria.

Ano:
- despesas acumuladas do ano por categoria.

Modo Projetado:
- despesas previstas/projetadas por categoria.

Modo Realizado:
- despesas efetivas por categoria.

A composição deve respeitar o modo e o período selecionados.

Clicar em uma categoria na Composição das Despesas deve alimentar a seção Análise de Categoria.

Preferência:
- cards principais continuam globais;
- clique no gráfico/ranking seleciona categoria para análise;
- a categoria clicada fica destacada;
- usuário pode trocar pelo seletor.

---

# REGRA DE RELATÓRIOS — ANÁLISE DE CATEGORIA

A seção deve se chamar:

Análise de Categoria

Deve conter:
- seletor de categoria;
- consumo do período atual;
- consumo do período anterior;
- diferença;
- percentual de variação;
- gráfico/linha de evolução.

Regras:
- Mês compara com mês anterior;
- Semestre compara com semestre anterior;
- Ano compara com ano anterior.

Sem textos explicativos longos.

---

# REGRA DE ORÇAMENTOS

Orçamentos comparam Planejado x Realizado por categoria ou agrupamento.

Orçamento não é a mesma coisa que despesa efetiva financeira.

## Orçamento por Categoria

Unidade principal:
Categoria.

Deve mostrar:
- categoria;
- planejado;
- consumo/realizado;
- diferença;
- percentual utilizado;
- status.

Status:
- Dentro;
- Atenção;
- Estourado;
- Sem orçamento definido.

Regra fundamental:

Acompanhar = visibilidade.
Orçamento = meta.
Movimento = consumo.

Essas três coisas não podem ser misturadas.

O usuário deve escolher explicitamente quais categorias quer acompanhar.

A lista principal de Orçamentos por Categoria mostra somente categorias escolhidas pelo usuário.

Não deve aparecer apenas porque:
- tem `budgetLimit`;
- tem movimento;
- tem gasto;
- tem categoria;
- está em macrocategoria.

Se o toggle “Acompanhar” estiver desligado:
- categoria não aparece na lista principal;
- mesmo com orçamento definido;
- mesmo com movimento.

Se estiver ligado:
- aparece;
- se tiver orçamento, mostra meta;
- se não tiver orçamento, mostra “Sem orçamento definido”;
- se não tiver movimento, mostra realizado R$ 0,00.

O aviso de categorias com movimento não acompanhadas foi removido porque poluía a tela.

## Cartão no orçamento por categoria

Para métricas financeiras gerais:
- compra no cartão não conta como despesa efetiva;
- pagamento da fatura conta como despesa efetiva.

Para orçamento por categoria:
- compra no cartão conta no consumo da categoria da compra;
- pagamento da fatura não entra no orçamento por categoria.

Motivo:
Orçamento mede comportamento de consumo por categoria. Fatura é forma de pagamento, não categoria de consumo.

Exemplo:
Compra no cartão:
Mercado — R$ 300 — Alimentação

Orçamento:
Alimentação + R$ 300

Relatório efetivo:
só conta quando pagar a fatura.

---

# REGRA DE MACROCATEGORIAS / AGRUPAMENTOS ORÇAMENTÁRIOS

Macrocategorias são agrupamentos personalizados de categorias.

Exemplos:
- Essencial;
- Conforto;
- Dívidas;
- Lazer;
- Investimentos;
- Variáveis;
- Família;
- Empresa.

Elas servem para análise estratégica acima das categorias.

Exemplo:
Essencial
- Moradia;
- Saúde;
- Alimentação Base.

Cada macrocategoria pode ter teto percentual sobre a receita do período.

Exemplo:
Essencial = 25% da receita.

Cálculo:

Teto do agrupamento =
receita do período × percentual definido

Consumo do agrupamento =
soma dos gastos das categorias vinculadas no período

Uso =
consumo / teto

Disponível =
teto - consumo

Status:
- Dentro;
- Atenção;
- Estourado;
- Sem teto definido.

A tela de Relatórios/Orçamentos deve alternar entre:
- Por Categoria;
- Por Agrupamento.

## Persistência atual

A estrutura persistente oficial ainda não foi criada no Supabase.

A implementação atual usa `localStorage` por usuário:
- `fluxo_budget_groups:<userId>`;
- `fluxo_category_group_assignments:<userId>`.

Risco:
- não sincroniza entre dispositivos/navegadores.

Futuro recomendado:
Criar migration oficial:
- `budget_groups`;
- `user_id`;
- `name`;
- `color`;
- `icon`;
- `budget_type`;
- `budget_percent`;
- `budget_amount`;
- vínculo em `categories` ou tabela relacional.

## Tela de Categorias

O gerenciamento de macrocategorias acontece na tela de Categorias.

Cada categoria pode ser associada a uma macrocategoria.

O usuário deve conseguir:
- criar macrocategoria;
- editar nome/cor;
- definir teto percentual da receita;
- associar categoria;
- trocar categoria de grupo;
- deixar categoria sem agrupamento.

---

# REGRA DE CARTÃO DE CRÉDITO E FATURA

Compra no cartão:
- aparece em Lançamentos;
- aparece em Cartões/Fatura;
- consome limite do cartão;
- não conta como despesa efetiva no momento da compra.

Pagamento de fatura:
- é despesa efetiva;
- acontece somente pela Gestão de Contas;
- pode ser total, parcial ou parcelado;
- não pode duplicar compra + fatura.

Cartões é demonstrativo.

Gestão de Contas é o ponto único para baixa/pagamento de fatura.

## Pagamento total

Ao pagar fatura total:
- registra despesa efetiva `isInvoicePayment`;
- debita conta/carteira escolhida;
- marca fatura/itens como baixados conforme regra;
- não gera saldo futuro.

## Pagamento parcial

Ao pagar fatura parcialmente:
- registra somente o valor pago como despesa efetiva;
- marca a obrigação/fatura atual como baixada/settled;
- gera saldo restante na próxima fatura como obrigação/despesa futura;
- não duplica compras originais;
- não libera limite total indevidamente se houver saldo remanescente.

## Parcelamento de fatura

Ao parcelar fatura:
- usuário informa entrada, se houver;
- usuário informa quantidade/valor das parcelas conforme banco/app do cartão;
- o Fluxo não calcula juros;
- fatura atual é considerada renegociada/baixada;
- parcelas futuras são geradas conforme valores informados;
- não exigir que entrada + parcelas fechem valor original, pois juros podem já estar embutidos pelo banco.

---

# REGRA DE LIMITE DO CARTÃO E isPaid

Compras no cartão podem ser registradas como `isPaid = true` porque representam uma despesa baixada via cartão.

Mas isso não significa que a fatura foi paga.

Para limite de cartão:
- compra no cartão continua consumindo limite até que a fatura correspondente seja quitada, renegociada ou tratada conforme regra;
- pagamento de fatura (`isInvoicePayment`) é o evento financeiro que ajusta/libera limite;
- o campo `isPaid` da compra individual não deve, sozinho, zerar o impacto da compra no limite.

Erro corrigido:
O cálculo de limite descartava compras no cartão marcadas como `isPaid = true`, o que fazia a fatura ter valor, mas o limite usado aparecer como 0.

Regra correta:
- fatura aberta com valor lançado e valor pago R$ 0,00 deve consumir limite;
- limite disponível = limite total - limite usado;
- percentual usado = limite usado / limite total.

Exemplo:
Limite: R$ 1.000,00
Fatura aberta: R$ 771,89
Pago: R$ 0,00

Resultado esperado:
- limite usado: R$ 771,89;
- limite disponível: R$ 228,11;
- uso: ~77%.

---

# REGRA DE ACORDOS

Acordo = entrada opcional + parcelas futuras.

Entrada não é parcela.

Parcelas começam depois da entrada.

O app não calcula juros; registra o acordo informado pelo usuário.

Exemplo real:
Entrada: R$ 79,60
Parcelas: 11x de R$ 90,39
Total: R$ 1.073,89

Cálculo:
R$ 79,60 + 11 × R$ 90,39 = R$ 1.073,89

## Formulário de Acordos

Campos:
- Tem entrada?
- Valor da entrada;
- Data da entrada;
- Entrada paga no ato?
- Conta/Carteira da entrada;
- Quantidade de parcelas;
- Valor da parcela;
- Total do acordo calculado automaticamente;
- Data da 1ª parcela;
- Dia de vencimento.

## Entrada do acordo

A entrada deve ser uma transação separada vinculada ao `debt_id`.

Se paga no ato:
- `is_paid = true`;
- `payment_date` preenchido;
- `account_id`/conta informada;
- deve debitar conta/carteira se o fluxo atual faz isso.

Se não paga:
- fica pendente;
- aparece na Gestão de Contas como obrigação separada.

Descrição sugerida:
Entrada acordo [nome]

## Parcelas do acordo

Gerar parcelas separadas:
- Parcela 1/N acordo [nome]
- Parcela 2/N acordo [nome]
- ...
- Parcela N/N acordo [nome]

Entrada não entra na contagem.

Exemplo:
Entrada + 11 parcelas gera:
- 1 transação de entrada;
- 11 parcelas;
- não 12 parcelas.

## Novo Acordo vs Edição

Novo Acordo deve abrir limpo.

Não pode herdar:
- dados de acordo editado;
- valores de exemplo;
- dados do último acordo;
- valores como 90,39, 11, Inter etc.

Editar Acordo:
- deve abrir preenchido com dados reais do acordo selecionado.

Regra técnica:
- separar `createEmptyAgreementForm()`;
- `resetFormState()`;
- `handleEdit(...)`;
- `openAddDebtForm()` deve resetar antes de abrir;
- `handleCloseForm()` deve resetar;
- usar key diferente entre novo e edição para evitar reaproveitamento indevido do subtree React.

## Datas de acordo

Ao lidar com strings `yyyy-mm-dd`, usar parsing local (`parseLocalDate`) em vez de `new Date(...)`, para evitar deslocamento por timezone.

---

# REGRA DE CLASSIFICAÇÃO CANÔNICA DE CATEGORIAS

Relatórios e composições por categoria devem agrupar transações por chave canônica, não por label solto, `debt_id` individual ou fallback local.

Regra geral:
- label igual não basta;
- agrupamento deve usar key canônica.

## Buckets canônicos

Categoria real:
- key: `category:{category.id}`;
- label: nome da categoria.

Acordo:
- key: `logical:agreement`;
- label: `Acordo`.

Renegociação:
- key: `logical:renegotiation`;
- label: `Renegociação`.

Sem categoria:
- key: `logical:uncategorized`;
- label: `Não identificados`.

Categoria órfã:
- key: `logical:missing-category:{categoryId}`;
- label: `Categoria não encontrada`.

## Prioridade atual

1. `debtId` → Acordo.
2. Renegociação sistêmica → Renegociação.
3. Categoria real chamada Acordo → Acordo.
4. Categoria real diferente de Não Identificados → categoria real.
5. Categoria real Não Identificados → Não identificados.
6. `categoryId` órfão → Categoria não encontrada.
7. Fallback → Não identificados.

## Acordo

Transações com `debt_id` devem cair na categoria lógica Acordo, quando não houver categoria real melhor.

Todos os acordos devem somar no mesmo bucket:
- `logical:agreement`.

Não usar:
- `debt_id` individual como key;
- label solto;
- fallback separado.

Exemplo:
99 - Empréstimo: R$ 167,67
Inter: R$ 90,39

Composição correta:
Acordo — R$ 258,06

Não:
Acordo — R$ 167,67
Acordo — R$ 90,39

## Renegociação

Renegociação é categoria lógica/nativa do sistema, assim como Acordo.

Não Identificados é último recurso.

Se o sistema sabe que a transação representa renegociação, ela deve aparecer como Renegociação, mesmo se estiver cadastrada com categoria real “Não Identificados”.

Exemplos de transações que podem ser Renegociação:
- Renegociação de Pendências;
- Parcela fatura;
- Saldo restante;
- parcelamentos/ajustes sistêmicos de fatura;
- registros com sinais estruturados como `transactionType`, `cardId`, `invoiceMonthYear`, desde que não sejam `isInvoicePayment`.

Regra:
- usar campo estruturado quando existir;
- usar descrição como fallback controlado;
- documentar que falta um campo dedicado de renegociação em Transaction.

Exemplo real:
Renegociação de Pendências (1/9)
Categoria real: Não Identificados
Resultado correto:
Renegociação — R$ 483,86

## Não Identificados

Não Identificados deve ser usado apenas quando:
- não há categoria real;
- não há `debt_id`;
- não há regra lógica nativa melhor;
- não há categoria órfã identificável.

Não deve esconder:
- acordo;
- renegociação;
- categoria órfã.

## Categoria não encontrada

Se `category_id` existe, mas a categoria não é encontrada na lista carregada:
- mostrar como `Categoria não encontrada`;
- não misturar com Não Identificados.

Isso indica problema de integridade:
- categoria apagada;
- categoria de outro usuário;
- RLS/escopo;
- dado órfão.

---

# REGRA DE RELATÓRIOS — CATEGORIAS LÓGICAS NATIVAS

Algumas classificações não dependem apenas da categoria manual cadastrada pelo usuário.

Categorias lógicas/nativas:
- Acordo;
- Renegociação;
- Não identificados;
- Categoria não encontrada.

Acordo:
- transações com `debt_id` ou categoria real Acordo.

Renegociação:
- transações sistêmicas de renegociação, saldo restante, parcela de fatura ou renegociação de pendências.

Não Identificados:
- usado apenas como último recurso.

Categoria não encontrada:
- usada quando há `category_id`, mas a categoria não resolve.

---

# REGRA DE RELATÓRIOS — ACORDOS

Acordos devem entrar em Relatórios conforme competência/data.

Modo Projetado:
- entrada pendente ou paga entra no mês da entrada;
- parcelas futuras entram nos meses de vencimento;
- não exigir `is_paid`.

Modo Realizado:
- entrada/parcela só entra se paga.

Composição das Despesas:
- transações com `debt_id` e sem categoria real devem cair como Acordo;
- múltiplos acordos no mesmo período somam em uma única linha Acordo.

Exemplo:
Entrada Inter: Maio/2026 — R$ 79,60
Parcela 1/11 Inter: Junho/2026 — R$ 90,39
Parcela 2/11 Inter: Julho/2026 — R$ 90,39

Relatório Projetado:
- Maio: Acordo inclui R$ 79,60;
- Junho: Acordo inclui R$ 90,39;
- Julho: Acordo inclui R$ 90,39.

---

# REGRA DE FILTROS DE PERÍODO

Filtro Dia só deve existir em:
- Lançamentos;
- Gestão de Contas.

Filtro Dia deve ser removido de:
- Home;
- Relatórios;
- Orçamentos;
- Cartões;
- demais telas analíticas/planejamento.

Relatórios devem trabalhar com:
- Mês;
- Semestre;
- Ano.

Quando selecionar Semestre:
- toda a tela muda para visão de semestre;
- cards somam semestre;
- gráfico mostra semestres/meses do semestre conforme contexto;
- comparativo usa semestre anterior;
- orçamento por categoria só aparece se a visão suportar adequadamente.

---

# REGRA DE VALORES MONETÁRIOS

Valores monetários não podem quebrar linha entre:
- sinal negativo;
- R$;
- valor.

Usar:
- `whitespace-nowrap`;
- `tabular-nums`;
- `leading-tight`/`leading-none`;
- `clamp` de fonte se necessário.

Aplicar em:
- cards da Home;
- Relatórios;
- Orçamentos;
- Gestão de Contas;
- Cartões;
- resumos financeiros.

Exemplo de problema corrigido:
`-R$ 3.005,30` não deve quebrar depois do hífen.

---

# REGRA DE TESTES E VALIDAÇÃO DE SPRINT

Antes de fechar sprint, executar:

- `npm run check:encoding`
- `npm test`
- `npm run build`
- `npm run lint`

Quando mexer em cálculo financeiro, adicionar teste de regressão.

Quando mexer em UI com texto acentuado, garantir `check:encoding` e testes com texto correto.

Quando mexer em cartão/fatura/acordos/orçamentos/relatórios, validar manualmente cenários reais além dos testes.

---

# CORREÇÕES IMPORTANTES REGISTRADAS

## Correção: Home zerada no boot

Problema:
Home abria com valores R$ 0,00 antes dos dados carregarem.

Correção:
Boot passou a executar a rotina real do botão Atualizar automaticamente ao acessar o app logado.

Regra:
Home não pode renderizar estado zerado falso enquanto dados ainda carregam.

---

## Correção: tutorial

Problema:
Tutorial reaparecia constantemente.

Decisão final:
Tutorial removido completamente.

---

## Correção: Acentuação/mojibake

Problema:
Textos como `Descri��o`, `N�`, `LanÃ§amento`.

Correção:
Textos corrigidos e proteção permanente criada:
- `.editorconfig`;
- `AGENTS.md`;
- `scripts/check-mojibake.mjs`;
- `npm run check:encoding`.

---

## Correção: Cartões — limite

Problema:
Fatura tinha valor, mas limite usado aparecia como 0%.

Causa:
Compra no cartão marcada como `isPaid = true` estava sendo removida do cálculo de limite.

Correção:
Compra no cartão continua consumindo limite até pagamento/baixa/renegociação da fatura.

---

## Correção: Cartões — UI

Problema:
Tela de Cartões tinha blocos inúteis e poluídos.

Removidos da UI:
- Total lançado;
- Valor pago;
- Diferença a conciliar;
- Gastos;
- Disponível como card separado.

Mantidos:
- limite;
- fatura;
- status;
- lista de lançamentos;
- atalho para Gestão de Contas.

---

## Correção: Orçamentos — categorias acompanhadas

Problema:
Categorias apareciam mesmo com toggle “Acompanhar” desligado.

Correção:
A lista principal mostra somente categorias explicitamente acompanhadas.

Regra:
Acompanhar = visibilidade.
Orçamento = meta.
Movimento = consumo.

---

## Correção: Relatórios — Acordo duplicado

Problema:
Acordo aparecia duplicado na Composição das Despesas.

Causa:
Agrupamento usava key por `debt_id`.

Correção:
Todos os acordos caem em `logical:agreement`.

---

## Correção: Relatórios — Renegociação

Problema:
Renegociação de Pendências aparecia como Não Identificados.

Correção:
Renegociação virou categoria lógica nativa:
`logical:renegotiation`.

---

## Correção: Acordos — entrada

Problema:
Tela de Acordos não permitia entrada.

Correção:
Acordos agora suportam entrada opcional separada das parcelas.

Exemplo:
R$ 79,60 + 11x R$ 90,39 = R$ 1.073,89.

---

## Correção: Acordos — formulário herdava estado

Problema:
Novo Acordo abria com dados do acordo editado anteriormente.

Correção:
Estado de novo acordo e edição foi separado:
- novo abre limpo;
- edição abre preenchida;
- fechamento reseta estado.

---

## Correção: Acordos — relatórios

Problema:
Acordos sem categoria não apareciam corretamente em Relatórios.

Correção:
Transação com `debt_id` e sem categoria cai em Acordo.

---

# PRÓXIMOS PONTOS TÉCNICOS FUTUROS

## Persistir macrocategorias no backend

Hoje macrocategorias usam localStorage.

Futuro:
criar migration oficial para persistir:
- grupos;
- percentual;
- cor;
- ícone;
- vínculo com categorias;
- user_id;
- RLS.

## Campo dedicado para Renegociação

Hoje Renegociação é detectada por sinais estruturados + descrição.

Futuro:
adicionar campo estruturado para identificar renegociação, evitando dependência de texto.

Possíveis campos:
- `system_category`;
- `financial_origin`;
- `transaction_subtype`;
- `is_renegotiation`;
- `renegotiation_group_id`.

## Edição segura de Acordos

Se entrada já foi paga:
- não permitir remover livremente;
- exigir estorno/correção assistida;
- preservar histórico.

## Persistência das categorias acompanhadas

Hoje categorias acompanhadas usam localStorage.

Futuro:
persistir no backend por usuário para sincronizar entre dispositivos.

## Melhorias de recategorização

Criar fluxo para recategorizar em massa:
- parcelas de acordo;
- renegociação;
- transações sem categoria;
- categorias órfãs.

---

# REGRA DE SEGURANÇA — EXCLUSÃO DE CONTA / LGPD

A exclusão de conta deve ser feita pela RPC:

`public.delete_user_data(target_user_id uuid)`

A função deve:

- permitir exclusão apenas do próprio usuário autenticado;
- validar `auth.uid() IS NOT NULL`;
- validar `auth.uid() = target_user_id`;
- usar `SECURITY DEFINER` apenas porque precisa remover o registro final em `auth.users`;
- usar `search_path` seguro;
- qualificar tabelas por schema;
- apagar `auth.users` por último;
- executar `NOTIFY pgrst, 'reload schema'` após criação/alteração;
- revogar execução pública;
- conceder execução apenas para `authenticated`.

A função não deve permitir exclusão cruzada de dados entre usuários.

Antes de aplicar ou testar exclusão real:
- usar somente usuário de teste;
- confirmar existência da função;
- confirmar grants;
- validar que o frontend não retorna `PGRST202`;
- nunca testar primeiro em usuário real.

---

# REGRA DE UX — FILTROS MOBILE EM RELATÓRIOS

No mobile, os controles de Relatórios não podem se sobrepor.

Projetado/Realizado deve ficar em uma linha própria.

Mês/Semestre/Ano deve ficar em outra linha própria.

Os filtros precisam ser tocáveis, legíveis e sem sobreposição em telas pequenas.

---

# REGRA DE DEVTOOLS

TanStack/React Query Devtools não deve aparecer para o usuário.

O Devtools só pode renderizar quando:

- ambiente for DEV;
- e `VITE_ENABLE_QUERY_DEVTOOLS=true`.

Por padrão, ele deve ficar desativado para não atrapalhar web nem mobile.

---

# REGRA TÉCNICA — CONTAS / BANCO

A tabela `accounts` no Supabase usa o campo técnico `bank`.

O app não deve enviar `institution` em inserts ou updates de contas.

`institution` pode existir apenas como fallback legado de leitura em objetos antigos de UI/testes, mas não deve ser persistido no Supabase.

Regra:
- campo visual pode ser “Instituição” ou “Banco”;
- campo técnico persistido deve ser sempre `bank`;
- seletores de conta devem exibir banco + nome, por exemplo: `Itaú — Khendry`.

Não criar migration para adicionar `institution`.
Não renomear `bank`.
Não alterar contas existentes por causa disso.
