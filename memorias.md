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

---

# REGRA DE RELATÓRIOS — FLUXO SCORE (ADITIVO E SOMENTE LEITURA)

## Diretriz crítica de segurança/arquitetura

Fluxo Score é funcionalidade estritamente aditiva e de observação.

Obrigatório:
- não alterar mecânicas atuais de criação/edição/exclusão de contas;
- não alterar mecânicas atuais de criação/edição/exclusão de acordos;
- não alterar hooks de mutação já existentes;
- não alterar endpoints/RPC já existentes;
- não introduzir efeitos colaterais de escrita para calcular Score.

Regra de implementação:
- Score apenas lê `transactions`, `debts` e estado atual da aplicação;
- cálculo isolado em utilitário dedicado;
- arredondamento apenas na exibição da UI;
- lógica financeira existente permanece intacta.

## Escala e baseline

- faixa de Score: 0 a 1000;
- baseline inicial/neutro: 500.

## Motor de cálculo — contas de consumo/pagamentos padrão

Para cada conta/obrigação paga, calcular diferença em dias:
- `dias = paymentDate - dueDate`.

Regras:
- pagamento no dia do vencimento (`dias = 0`): `+5`;
- pagamento antecipado (`dias < 0`): `+10`;
- atraso leve (`dias = 1..3`): `-10`;
- atraso médio (`dias = 4..10`): `-25`;
- atraso grave (`dias > 10`): `-50`;
- penalidade contínua para atraso grave:
  - `-2` por dia extra após o 10º dia;
  - fórmula: `-50 - ((dias - 10) * 2)`;
  - teto de penalidade por conta: `-100`.

### Bônus mensal

Adicionar `+10` para contas em dia.

Regra de cálculo:
- **A partir de 01/06/2026**: O bônus é verificado e definido com base no primeiro dia útil do mês de referência. No primeiro dia útil de cada mês, é verificada a existência de despesas em atraso (vencidas antes do primeiro dia útil e não pagas até o primeiro dia útil). Se houver, a bonificação de `+10` não é concedida para o mês corrente. Caso contrário, o bônus de `+10` é ganho e mantido para o restante do mês. Para datas anteriores ao primeiro dia útil do mês, a elegibilidade é verificada dinamicamente com base nas contas vencidas até o dia atual.
- **Antes de 01/06/2026**: O bônus mensal é fixado em `0` (desativado antes da data de implantação da feature).

## Motor de cálculo — acordos e dívidas

Acordos ativos têm peso próprio no Score:

- penalidade de criação: `-100` por acordo ativo;
- recuperação proporcional por pagamento de parcelas:
  - `recuperação = (parcelasPagas / totalParcelas) * 100`.

Regra de precisão:
- usar ponto flutuante internamente para evitar erro acumulado;
- aplicar `Math.round` somente na camada de apresentação;
- ao quitar a última parcela, a recuperação total do acordo deve atingir exatamente `100`.

## Fórmula consolidada

Score final:
- `score = clamp(500 + somaRegrasContas + somaRegrasAcordos + bonusMensal, 0, 1000)`.

Onde:
- `somaRegrasContas` aplica variações por pontualidade/atraso das contas pagas;
- `somaRegrasAcordos` soma `-100 + recuperaçãoProporcional` por acordo ativo;
- `bonusMensal` é `0` ou `+50`.

## Requisito de UI — tela e posicionamento

Renderização exclusiva:
- componente Fluxo Score deve existir somente na tela de Relatórios.

Layout:
- posicionar ao lado do card de Saldo na faixa superior da tela;
- manter destaque simétrico e responsivo com grid/flex ajustado.

## Requisito visual — gráfico circular, cor e glow

Componente:
- usar anel circular (donut/gauge) em SVG ou biblioteca padrão.

Centro:
- mostrar número inteiro do Score com tipografia forte.

Cores:
- não usar gradiente semáforo (vermelho/amarelo/verde);
- usar variações da cor de destaque ativa (`--primary`/accent da aplicação).

Glow:
- aplicar brilho externo (drop-shadow/radial glow) na cor de destaque;
- intensidade pode crescer conforme o Score.

## Requisito de animação

Na carga inicial:
- anel deve animar de `0` até Score atual;
- transição suave em `1.0s` a `1.5s`, `ease-out` ou `cubic-bezier`.

Em recálculo:
- número e barra devem interpolar suavemente;
- evitar saltos bruscos na atualização.

---

# HISTÓRICO DE VALIDAÇÕES DE ALTERAÇÕES

## [2026-05-26] Alteração de UI - Remoção do Tooltip de Informação do Saldo Projetado no Mobile
- **Resumo**: O botão de informação (Tooltip) ao lado do texto "Saldo Projetado" na tela inicial do mobile (`src/pages/LegacyDashboardHome.tsx`) foi removido.
- **Motivação**: Atender ao design minimalista e executivo, de modo a evitar textos explicativos repetitivos/desnecessários no corpo principal da UI móvel. Limpeza executada dos imports não utilizados do Tooltip e do ícone Info.

## [2026-05-26] Alteração de UI / Funcionalidade - Remoção de Macrocategorias e Melhoria de Selects no Cadastro de Categorias
- **Resumo**: Toda e qualquer referência à funcionalidade de macrocategorias foi removida do cadastro de categorias (`src/components/settings/CategoriesManager.tsx`), incluindo o botão do cabeçalho para gerenciar macrocategorias (`BudgetGroupManagerModal`) e o dropdown/seletor de macrocategoria nos diálogos de nova categoria e de edição de categoria. Adicionalmente, os seletores de grupos de despesas (`BudgetGroup`), que antes eram componentes de `<select>` nativos do navegador e apresentavam visualização fora do padrão do app, foram substituídos pelo componente premium `<Select>` da biblioteca do Shadcn UI.
- **Motivação**: Atender à solicitação direta do usuário para remover macrocategorias do fluxo de cadastro e corrigir o design visual dos seletores de grupo no cadastro de categorias, alinhando-o com o estilo visual dark do restante da aplicação.

## [2026-05-26] Alteração Arquitetural / Regra de Negócio - Atualização Diária do Score, Bônus no Primeiro Dia Útil e Consideração Total de Dados
- **Resumo**: A verificação da bonificação mensal no cálculo do Fluxo Score foi reduzida de `+50` para `+10` e configurada para ocorrer com base no estado do primeiro dia útil do mês de referência (`src/utils/fluxoScore.ts`), com data de início em `01/06/2026`. Para datas de referência anteriores a `01/06/2026` (como maio de 2026), o bônus mensal é fixado em `0` (desativado). Adicionamos a lógica para detectar o primeiro dia útil do mês (ajustando para segunda-feira caso caia em fins de semana) e congelar a verificação de atrasos a partir dessa data. Adicionalmente, para garantir que as parcelas de acordos cadastrados e contas pendentes de meses/anos passados sejam sempre computadas no cálculo do score e no saldo projetado do app, expandimos a query global do Supabase (`src/hooks/useFinanceQueries.ts`) para retornar todas as transações não pagas (`is_paid = false`) e transações vinculadas a acordos (`debt_id`) de todos os tempos.
- **Motivação**: Atender à nova dinâmica de lançamentos diários, reduzindo o peso do bônus mensal de acordo com as preferências do usuário, aplicando a nova lógica do primeiro dia útil a partir de 1º de junho e fixando o bônus de maio como 0 para refletir os atrasos anteriores ao acordo criado hoje.

## [2026-05-26] Alteração Arquitetural / Regra de Segurança - Garantia de Isolamento de Usuários e Correção de Queries
- **Resumo**: Foi realizada uma revisão e correção estrutural no arquivo `src/hooks/useFinanceQueries.ts` para garantir o isolamento estrito de dados entre diferentes usuários. Todos os hooks de leitura (`useAccounts`, `useTransactions`, `useCreditCards`, `useDebts` e `useSavingsGoals`) foram updated para aplicar explicitamente o filtro `.eq('user_id', user.id)` baseando-se no ID do usuário autenticado no Supabase Auth. Adicionalmente, as importações duplicadas no topo do arquivo foram limpas e a query de metas de economia (`useSavingsGoals`), que havia sido corrompida por um erro de merge anterior, foi completamente restaurada e isolada por usuário.
- **Motivação**: Atender à garantia solicitada pelo usuário de que os dados de diferentes usuários não se misturem e corrigir o score do usuário (Khendry) que estava zerado na conta oficial devido ao vazamento de acordos/transações de teste de outro usuário no cálculo global do score.

## [2026-05-26] Alteração Arquitetural / Funcionalidade - Cor de Destaque Salva e Sincronizada por Usuário
- **Resumo**: Refatoramos o hook de cores [useThemeColor.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useThemeColor.tsx) para salvar a cor de destaque (accent color) de maneira individual por usuário, em vez de salvar de forma genérica e compartilhada no navegador. O estado local agora é persistido sob a chave `accent-color:${userId}` no localStorage (e de forma retrocompatível na chave `accent-color` para os testes e legado). O processo de hidratação no carregamento agora prioriza em primeiro nível o metadado do usuário autenticado retornado do Supabase (`user.user_metadata?.accent_color`), seguido pela chave específica do usuário e, por último, o fallback legado, garantindo que a preferência do usuário o acompanhe em qualquer máquina ou navegador.
- **Motivação**: Atender à solicitação direta do usuário para salvar as preferências de cores no perfil do usuário (na nuvem) e isolar o armazenamento de layout no mesmo navegador de acordo com a conta logada.

## [2026-05-26] Alteração Arquitetural / Regra de Negócio - Ajuste no Período de Penalidades e Inclusão de Contas Pendentes no Score
- **Resumo**: Atualizamos a lógica do Fluxo Score ([fluxoScore.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/utils/fluxoScore.ts)) para se alinhar ao conceito de "diagnóstico de saúde financeira atual". Agora, contas pendentes (não pagas) que estão vencidas ativamente geram penalidades de atraso no Score de acordo com a quantidade de dias em atraso, incentivando o usuário a quitá-las ou consolidá-las em acordos. Por outro lado, para evitar que um usuário histórico (com base de dados antiga ou importada via CSV) seja penalizado perpetuamente por contas quitadas com atraso há muito tempo, as penalidades de despesas pagas com atraso passam a expirar após 30 dias do pagamento. Adicionalmente, as compras individuais realizadas no cartão de crédito (`tx.cardId` preenchido e não sendo o pagamento da fatura em si) foram **desconsideradas** do cálculo de pontualidade de contas (`accountsDelta`), visto que a única obrigação financeira direta vinculada a prazos no cartão é o pagamento da fatura consolidada. A regra de acordos ativos com penalidades de `-100` e recuperação proporcional por parcelas pagas foi mantida e integrada a essa lógica.
- **Motivação**: Resolver o bug que travava o Score de usuários antigos em 0 devido a contas quitadas em atraso do passado distante (ex. importação histórica de extratos via CSV), evitar a penalização artificial por compras rotineiras no cartão de crédito cujas datas de pagamento/conciliação divergem da data da compra e incentivar a quitação de contas ativamente vencidas e não pagas.

## [2026-05-26] Alteração Arquitetural / Regra de Negócio - Calibração de Diagnóstico do Score e Correção de Acordos Ativos
- **Resumo**: Corrigimos a função de avaliação do Fluxo Score (`src/utils/fluxoScore.ts`) e o arquivo de testes unitários correspondente (`src/test/utils/fluxoScore.test.ts`). Alteramos o cálculo das contas para remover completamente a bonificação cumulativa por contas pagas em dia ou adiantadas (as quais agora geram `0` ponto de variação em vez de acumular créditos positivos, evitando ocultar contas atualmente em atraso). Adicionalmente, corrigimos a lógica do `isDebtActive` para permitir que acordos criados pelo app (que por padrão são salvos com o status `'renegotiated'` no banco de dados) sejam contabilizados como acordos ativos na avaliação do score, aplicando corretamente o impacto negativo de `-100` pontos e a recuperação proporcional correspondente ao pagamento de parcelas do acordo.
- **Motivação**: Resolver os dois problemas identificados na conta antiga do usuário Khendry: primeiro, as bonificações acumuladas de contas em dia mascaravam as contas em atraso (mantendo o score em 1000); segundo, todos os seus acordos criados hoje no app eram incorretamente ignorados por serem de status `'renegotiated'`, impedindo o score de cair para o patamar real correto e impossibilitando o diagnóstico financeiro adequado.

## [2026-05-26] Alteração Arquitetural / Regra de Negócio e UI - Liberação Total de Planos e Remoção de Mapa por Categoria dos Relatórios
- **Resumo**: Removemos as limitações de planos na aplicação, alterando o hook central `useFeatureFlag` (`src/hooks/useFeatureFlags.ts`) para retornar `true` para todas as funcionalidades e planos, com exceção da feature `admin_panel` que continua restrita ao super admin. Além disso, removemos completamente a seção "Mapa por categoria" da tela de Relatórios (`src/pages/ReportsDashboard.tsx`), incluindo o contêiner condicional e a tabela anual detalhada por categoria, e atualizamos os testes correspondentes (`ReportsDashboard.test.tsx`, `ProjectionAccess.test.tsx` e `sprintAccessMobileTheme.test.tsx`).
- **Motivação**: Atender à solicitação direta do usuário para permitir testes completos de todas as funcionalidades para os usuários sem restrições de planos (com exceção do painel super admin), e simplificar a tela de relatórios removendo o mapa anual por categoria.

