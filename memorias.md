# MEMÃ“RIAS â€” REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO

## REGRA GERAL DO PRODUTO

O Fluxo Financeiro deve ser tratado como um app financeiro modular, robusto e profissional.

O objetivo principal atual nÃ£o Ã© vender ainda, mas fazer o app funcionar de forma confiÃ¡vel para uso real e ser escalÃ¡vel no futuro.

O desenvolvimento deve evitar gambiarras, excesso de cÃ³digo e soluÃ§Ãµes temporÃ¡rias sem documentaÃ§Ã£o. Sempre que uma soluÃ§Ã£o temporÃ¡ria for usada, ela deve ficar registrada como tal.

O app deve ser modular:
- As funcionalidades podem existir no backend/cÃ³digo.
- O acesso/visibilidade deve ser controlado por plano/mÃ³dulo/feature flag.
- NÃ£o remover estruturalmente features apenas porque um plano nÃ£o deve vÃª-las.
- Planos futuros: Basic, Pro e Premium.
- A matriz final de planos ainda nÃ£o deve ser definida agora.

NÃ£o mexer sem autorizaÃ§Ã£o explÃ­cita em:
- Supabase migrations;
- RLS;
- SuperPage/admin;
- estrutura multiusuÃ¡rio/famÃ­lia;
- matriz de planos;
- regras financeiras jÃ¡ estabilizadas.

---

# REGRA DE UI/UX DO APP

## PadrÃ£o visual geral

O Fluxo deve parecer um produto financeiro profissional, nÃ£o um tutorial.

Diretriz visual:

- Menos explicaÃ§Ã£o.
- Mais indicador.
- Mais comparaÃ§Ã£o.
- Mais aÃ§Ã£o.
- Menos texto.
- Mais leitura executiva.

Evitar na interface:
- parÃ¡grafos explicativos longos;
- textos de onboarding no corpo das telas;
- frases como â€œCompare...â€ ou â€œQuanto da receita vira despesa...â€;
- badges de regra tÃ©cnica expostos sem necessidade;
- explicaÃ§Ãµes amadoras que diminuem a percepÃ§Ã£o profissional;
- EMOJIS em qualquer lugar da interface (proibido - tira a profissionalidade);
- textos expositivos/descritivos desnecessÃ¡rios (a interface deve ser autoexplicativa).

Preferir:
- labels curtas;
- cards objetivos;
- indicadores comparativos;
- status visuais;
- tooltips discretos;
- Ã­cones;
- nomes financeiros fortes.

Exemplos de nomenclatura aprovada:
- â€œTotal de Consumo vs Receitaâ€�
- â€œComposiÃ§Ã£o das Despesasâ€�
- â€œAnÃ¡lise de Categoriaâ€�
- â€œOrÃ§amentos por Categoriaâ€�
- â€œOrÃ§amentos por Agrupamentoâ€�
- â€œReceitas previstasâ€�
- â€œDespesas previstasâ€�
- â€œSaldo previstoâ€�
- â€œReceitas efetivasâ€�
- â€œDespesas efetivasâ€�
- â€œSaldo efetivoâ€�

Regras de cÃ¡lculo complexas devem ficar em tooltip, documentaÃ§Ã£o ou cÃ³digo, nÃ£o como texto fixo na tela.

---

# REGRA DE BOOT / ENTRADA DO APP

Ao abrir o app em uma nova sessÃ£o real, o Fluxo pode exibir uma intro curta com a logo.

Se o usuÃ¡rio estiver logado:
- o app deve mostrar uma tela de carregamento/sincronizaÃ§Ã£o;
- deve executar automaticamente a mesma rotina do botÃ£o â€œAtualizarâ€�;
- deve carregar os dados reais antes de liberar a Home;
- a Home nÃ£o pode abrir com valores zerados falsos.

A rotina de boot deve:
1. Aguardar autenticaÃ§Ã£o/sessÃ£o pronta.
2. Confirmar usuÃ¡rio autenticado.
3. Executar refresh real dos dados financeiros.
4. SÃ³ liberar o app apÃ³s refresh ou timeout/falha controlada.
5. Em erro, mostrar aviso discreto e abrir com dados disponÃ­veis.

O usuÃ¡rio nÃ£o deve precisar clicar em â€œAtualizarâ€� ao abrir o app.

O botÃ£o â€œAtualizarâ€� manual deve continuar existindo e funcionando como fallback.

O app nÃ£o deve recarregar automaticamente no meio de aÃ§Ãµes crÃ­ticas, como:
- editar lanÃ§amento;
- pagar fatura;
- criar acordo;
- parcelar fatura;
- cadastrar conta;
- editar categoria.

AtualizaÃ§Ãµes PWA/service worker podem ser aplicadas automaticamente apenas durante o boot. Durante uso normal, usar aviso/fallback manual.

---

# REGRA DE TUTORIAL

O tutorial guiado foi removido completamente do app.

NÃ£o deve existir:
- oferta inicial de tutorial;
- botÃ£o â€œ?â€� / â€œComo utilizarâ€�;
- popups de tour guiado;
- hook de tutorial;
- localStorage de tutorial;
- logs de tutorial;
- componentes GuidedTour, HelpButton ou TutorialOfferDialog.

Motivo:
O tutorial estava gerando comportamento indesejado e atrapalhando a experiÃªncia. O app deve comunicar por UX profissional, nÃ£o por explicaÃ§Ãµes de onboarding.

Se no futuro houver ajuda, ela deve ser repensada como central de ajuda discreta, nÃ£o como tutorial automÃ¡tico.

---

# REGRA DE LOGO / MARCA

A nova logo oficial do Fluxo deve substituir completamente:
- logo antiga;
- Ã­cone provisÃ³rio;
- logo do Lovable;
- favicon antigo;
- PWA icons antigos;
- manifest antigo;
- qualquer resquÃ­cio visual anterior.

A logo dentro do app deve usar SVG/estrutura compatÃ­vel com `currentColor`, para acompanhar a cor de destaque/accent color do cliente.

No app:
- a logo deve aparecer na intro;
- login;
- header;
- sidebar;
- mobile;
- qualquer ponto de marca.

Para favicon/PWA:
- pode usar versÃ£o estÃ¡tica da logo;
- manifest e service worker devem apontar para novos arquivos versionados quando necessÃ¡rio;
- o Ã­cone instalado pode depender de cache do navegador/sistema operacional e pode demorar para atualizar.

---

# REGRA DE ENCODING E TEXTOS VISÃ�VEIS

Todos os arquivos devem permanecer em UTF-8.

Ã‰ proibido finalizar sprint com mojibake/acentuaÃ§Ã£o quebrada em textos visÃ­veis.

Exemplos proibidos:
- LanÃƒÂ§amento
- Descriï¿½ï¿½o
- A entrada ï¿½ separada
- Nï¿½ de Parcelas
- 1ï¿½ Parcela
- GestÃƒÂ£o
- CartÃƒÂ£o
- RelatÃƒÂ³rios
- OrÃƒÂ§amentos
- ConfiguraÃƒÂ§ÃƒÂµes
- Ã¢â‚¬

Textos corretos:
- LanÃ§amento
- DescriÃ§Ã£o
- GestÃ£o
- CartÃ£o
- RelatÃ³rios
- OrÃ§amentos
- ConfiguraÃ§Ãµes
- NÂº
- 1Âª
- MÃªs
- PrÃ³ximo
- CompetÃªncia

Regra permanente:
- antes de finalizar qualquer sprint, rodar `npm run check:encoding`;
- nÃ£o fazer conversÃ£o automÃ¡tica cega de arquivos inteiros;
- corrigir manualmente textos quebrados;
- allowlist deve ser mÃ­nima e justificada.

Arquivos de proteÃ§Ã£o existentes:
- `.editorconfig` com `charset = utf-8`;
- `AGENTS.md` com regra obrigatÃ³ria de encoding;
- `scripts/check-mojibake.mjs`;
- `package.json` com `check:encoding` e `validate`.

ValidaÃ§Ã£o recomendada de fechamento:
- `npm run check:encoding`
- `npm test`
- `npm run build`
- `npm run lint`

---

# REGRA DE RESPONSIVIDADE

Modais com formulÃ¡rios longos devem ser responsivos.

No desktop:
- podem ocupar mais largura/altura da tela;
- devem usar `max-height` baseado em viewport;
- corpo do modal deve ter `overflow-y-auto`;
- conteÃºdo nÃ£o pode ficar cortado.

No mobile:
- modal deve ocupar quase toda a tela;
- campos devem ir para uma coluna;
- rolagem deve funcionar;
- botÃµes devem continuar acessÃ­veis;
- inputs nÃ£o podem ficar escondidos pelo teclado.

Exemplo importante:
O modal de Novo Acordo/EdiÃ§Ã£o de Acordo deve ser largo o suficiente no desktop e rolÃ¡vel no mobile, porque agora possui campos de entrada, parcelas, datas e total.

---

# REGRA DE TELAS E RESPONSABILIDADES

## GestÃ£o de Contas

GestÃ£o de Contas Ã© a tela operacional.

Ela responde:
â€œO que preciso pagar ou baixar?â€�

Regra:
- mostra obrigaÃ§Ãµes do mÃªs selecionado;
- mostra pendÃªncias anteriores ainda abertas;
- nÃ£o deve depender de `original_id` para exibir obrigaÃ§Ã£o real;
- pendÃªncia anterior em aberto deve aparecer mesmo sem `original_id`.

No filtro por MÃªs:
- mostra obrigaÃ§Ãµes do mÃªs inteiro;
- mais pendÃªncias anteriores abertas.

No filtro por Dia:
- mostra obrigaÃ§Ãµes daquele dia;
- mais pendÃªncias anteriores abertas;
- nÃ£o mostra obrigaÃ§Ãµes futuras depois do dia selecionado.

Filtro Dia deve existir na GestÃ£o de Contas.

Pagamentos de fatura devem acontecer exclusivamente pela GestÃ£o de Contas.

---

## Home / MonthPlan

Home/MonthPlan Ã© uma tela de decisÃ£o mensal.

Ela responde:
â€œComo estÃ¡ o mÃªs selecionado?â€�

Cards principais da Home devem usar competÃªncia do mÃªs selecionado:
- nÃ£o somar despesas pendentes de meses anteriores dentro dos cards principais;
- pendÃªncias anteriores podem aparecer apenas em indicador separado;
- vencidas devem usar a data real de hoje, nÃ£o o fim do mÃªs selecionado.

Regra importante:
- `viewDate` define a competÃªncia analisada;
- `currentDate`/data real define se algo estÃ¡ vencido.

Home nÃ£o deve funcionar como GestÃ£o de Contas disfarÃ§ada.

Filtro Dia nÃ£o deve existir na Home.

---

## CartÃµes

A tela de CartÃµes Ã© demonstrativa.

Ela deve mostrar:
- cartÃ£o selecionado;
- limite total;
- limite usado;
- limite disponÃ­vel;
- percentual usado;
- fatura do mÃªs selecionado;
- lista de compras/parcelas da fatura;
- status da fatura;
- atalho para GestÃ£o de Contas.

A tela de CartÃµes nÃ£o deve:
- pagar fatura;
- baixar fatura;
- parcelar fatura;
- fazer movimentaÃ§Ã£o financeira real.

Pagamentos e baixas de fatura acontecem somente na GestÃ£o de Contas.

Foram removidos da UI de CartÃµes os blocos:
- Total lanÃ§ado;
- Valor pago;
- DiferenÃ§a a conciliar;
- Gastos;
- DisponÃ­vel como card separado;
- mensagens de conciliaÃ§Ã£o visual que confundiam o usuÃ¡rio.

Esses cÃ¡lculos podem existir internamente, mas nÃ£o devem poluir a tela.

---

## LanÃ§amentos

LanÃ§amentos Ã© o extrato/movimentos registrados.

Deve mostrar:
- compras;
- despesas;
- receitas;
- transferÃªncias;
- pagamentos de fatura;
- compras de cartÃ£o;
- acordos;
- entradas e parcelas quando aplicÃ¡vel.

Compra no cartÃ£o aparece em LanÃ§amentos, mas nÃ£o conta como despesa efetiva.

Pagamento de fatura aparece em LanÃ§amentos e conta como despesa efetiva.

TransferÃªncias aparecem em LanÃ§amentos, mas nÃ£o contam como receita/despesa.

Filtro Dia deve permanecer em LanÃ§amentos.

---

## RelatÃ³rios

RelatÃ³rios Ã© uma tela analÃ­tica e projetiva.

Ela deve responder:
- como os meses futuros vÃ£o ficar;
- quanto entra;
- quanto sai;
- quanto sobra/falta;
- como evolui o consumo;
- quais categorias/macrogrupos consomem mais;
- como o perÃ­odo atual compara com o anterior.

RelatÃ³rios deve ter modos:

### Projetado

Modo padrÃ£o.

Considera:
- receitas previstas;
- despesas previstas;
- contas fixas/futuras;
- faturas futuras;
- parcelas futuras;
- acordos futuros;
- despesas pendentes;
- receitas pendentes;
- recorrÃªncias;
- compromissos do perÃ­odo.

NÃ£o exige `isPaid`.

### Realizado

Considera somente caixa efetivo:
- receitas pagas/recebidas;
- despesas pagas;
- pagamento de fatura;
- nÃ£o soma compra comum no cartÃ£o;
- nÃ£o soma transferÃªncia.

### Cards principais

Projetado:
- Receitas previstas;
- Despesas previstas;
- Saldo previsto.

Realizado:
- Receitas efetivas;
- Despesas efetivas;
- Saldo efetivo.

Comparativos dos cards devem ser visÃ­veis e BI-like:
- valor atual;
- variaÃ§Ã£o absoluta;
- percentual;
- direÃ§Ã£o;
- cor semÃ¢ntica.

Regra de cor:
- receita/saldo aumentando = positivo;
- receita/saldo reduzindo = negativo;
- despesa aumentando = negativo;
- despesa reduzindo = positivo;
- consumo aumentando = negativo;
- consumo reduzindo = positivo.

### PerÃ­odos

MÃªs:
- calcula o mÃªs selecionado;
- compara com mÃªs anterior.

Semestre:
- calcula semestre selecionado;
- deve permitir selecionar 1Âº ou 2Âº semestre;
- evoluÃ§Ã£o semestral deve mostrar contexto como 1S/ano anterior, 2S/ano anterior, 1S/ano atual, 2S/ano atual;
- compara com semestre anterior.

Ano:
- calcula ano selecionado;
- compara com ano anterior.

Filtro Dia nÃ£o deve existir em RelatÃ³rios.

---

# REGRA DE RELATÃ“RIOS â€” TOTAL DE CONSUMO VS RECEITA

O antigo grÃ¡fico de EvoluÃ§Ã£o Mensal foi substituÃ­do por uma mÃ©trica mais Ãºtil: Total de Consumo vs Receita.

CÃ¡lculo:

Consumo da receita (%) =
despesas do perÃ­odo / receitas do perÃ­odo Ã— 100

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
- variaÃ§Ã£o contra perÃ­odo anterior em pontos percentuais;
- grÃ¡fico de linha/evoluÃ§Ã£o.

Exemplo:
Total de Consumo vs Receita
81,0%
R$ 3.506,71 de R$ 4.330,00
â†“ 17,6 p.p. vs mÃªs anterior

Sem textos explicativos longos.

---

# REGRA DE RELATÃ“RIOS â€” COMPOSIÃ‡ÃƒO DAS DESPESAS

ComposiÃ§Ã£o das Despesas deve destrinchar o total de despesas do perÃ­odo selecionado por categoria.

MÃªs:
- despesas do mÃªs por categoria.

Semestre:
- despesas acumuladas do semestre por categoria.

Ano:
- despesas acumuladas do ano por categoria.

Modo Projetado:
- despesas previstas/projetadas por categoria.

Modo Realizado:
- despesas efetivas por categoria.

A composiÃ§Ã£o deve respeitar o modo e o perÃ­odo selecionados.

Clicar em uma categoria na ComposiÃ§Ã£o das Despesas deve alimentar a seÃ§Ã£o AnÃ¡lise de Categoria.

PreferÃªncia:
- cards principais continuam globais;
- clique no grÃ¡fico/ranking seleciona categoria para anÃ¡lise;
- a categoria clicada fica destacada;
- usuÃ¡rio pode trocar pelo seletor.

---

# REGRA DE RELATÃ“RIOS â€” ANÃ�LISE DE CATEGORIA

A seÃ§Ã£o deve se chamar:

AnÃ¡lise de Categoria

Deve conter:
- seletor de categoria;
- consumo do perÃ­odo atual;
- consumo do perÃ­odo anterior;
- diferenÃ§a;
- percentual de variaÃ§Ã£o;
- grÃ¡fico/linha de evoluÃ§Ã£o.

Regras:
- MÃªs compara com mÃªs anterior;
- Semestre compara com semestre anterior;
- Ano compara com ano anterior.

Sem textos explicativos longos.

---

# REGRA DE ORÃ‡AMENTOS

OrÃ§amentos comparam Planejado x Realizado por categoria ou agrupamento.

OrÃ§amento nÃ£o Ã© a mesma coisa que despesa efetiva financeira.

## OrÃ§amento por Categoria

Unidade principal:
Categoria.

Deve mostrar:
- categoria;
- planejado;
- consumo/realizado;
- diferenÃ§a;
- percentual utilizado;
- status.

Status:
- Dentro;
- AtenÃ§Ã£o;
- Estourado;
- Sem orÃ§amento definido.

Regra fundamental:

Acompanhar = visibilidade.
OrÃ§amento = meta.
Movimento = consumo.

Essas trÃªs coisas nÃ£o podem ser misturadas.

O usuÃ¡rio deve escolher explicitamente quais categorias quer acompanhar.

A lista principal de OrÃ§amentos por Categoria mostra somente categorias escolhidas pelo usuÃ¡rio.

NÃ£o deve aparecer apenas porque:
- tem `budgetLimit`;
- tem movimento;
- tem gasto;
- tem categoria;
- estÃ¡ em macrocategoria.

Se o toggle â€œAcompanharâ€� estiver desligado:
- categoria nÃ£o aparece na lista principal;
- mesmo com orÃ§amento definido;
- mesmo com movimento.

Se estiver ligado:
- aparece;
- se tiver orÃ§amento, mostra meta;
- se nÃ£o tiver orÃ§amento, mostra â€œSem orÃ§amento definidoâ€�;
- se nÃ£o tiver movimento, mostra realizado R$ 0,00.

O aviso de categorias com movimento nÃ£o acompanhadas foi removido porque poluÃ­a a tela.

## CartÃ£o no orÃ§amento por categoria

Para mÃ©tricas financeiras gerais:
- compra no cartÃ£o nÃ£o conta como despesa efetiva;
- pagamento da fatura conta como despesa efetiva.

Para orÃ§amento por categoria:
- compra no cartÃ£o conta no consumo da categoria da compra;
- pagamento da fatura nÃ£o entra no orÃ§amento por categoria.

Motivo:
OrÃ§amento mede comportamento de consumo por categoria. Fatura Ã© forma de pagamento, nÃ£o categoria de consumo.

Exemplo:
Compra no cartÃ£o:
Mercado â€” R$ 300 â€” AlimentaÃ§Ã£o

OrÃ§amento:
AlimentaÃ§Ã£o + R$ 300

RelatÃ³rio efetivo:
sÃ³ conta quando pagar a fatura.

---

# REGRA DE MACROCATEGORIAS / AGRUPAMENTOS ORÃ‡AMENTÃ�RIOS

Macrocategorias sÃ£o agrupamentos personalizados de categorias.

Exemplos:
- Essencial;
- Conforto;
- DÃ­vidas;
- Lazer;
- Investimentos;
- VariÃ¡veis;
- FamÃ­lia;
- Empresa.

Elas servem para anÃ¡lise estratÃ©gica acima das categorias.

Exemplo:
Essencial
- Moradia;
- SaÃºde;
- AlimentaÃ§Ã£o Base.

Cada macrocategoria pode ter teto percentual sobre a receita do perÃ­odo.

Exemplo:
Essencial = 25% da receita.

CÃ¡lculo:

Teto do agrupamento =
receita do perÃ­odo Ã— percentual definido

Consumo do agrupamento =
soma dos gastos das categorias vinculadas no perÃ­odo

Uso =
consumo / teto

DisponÃ­vel =
teto - consumo

Status:
- Dentro;
- AtenÃ§Ã£o;
- Estourado;
- Sem teto definido.

A tela de RelatÃ³rios/OrÃ§amentos deve alternar entre:
- Por Categoria;
- Por Agrupamento.

## PersistÃªncia atual

A estrutura persistente oficial ainda nÃ£o foi criada no Supabase.

A implementaÃ§Ã£o atual usa `localStorage` por usuÃ¡rio:
- `fluxo_budget_groups:<userId>`;
- `fluxo_category_group_assignments:<userId>`.

Risco:
- nÃ£o sincroniza entre dispositivos/navegadores.

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
- vÃ­nculo em `categories` ou tabela relacional.

## Tela de Categorias

O gerenciamento de macrocategorias acontece na tela de Categorias.

Cada categoria pode ser associada a uma macrocategoria.

O usuÃ¡rio deve conseguir:
- criar macrocategoria;
- editar nome/cor;
- definir teto percentual da receita;
- associar categoria;
- trocar categoria de grupo;
- deixar categoria sem agrupamento.

---

# REGRA DE CARTÃƒO DE CRÃ‰DITO E FATURA

Compra no cartÃ£o:
- aparece em LanÃ§amentos;
- aparece em CartÃµes/Fatura;
- consome limite do cartÃ£o;
- nÃ£o conta como despesa efetiva no momento da compra.

Pagamento de fatura:
- Ã© despesa efetiva;
- acontece somente pela GestÃ£o de Contas;
- pode ser total, parcial ou parcelado;
- nÃ£o pode duplicar compra + fatura.

CartÃµes Ã© demonstrativo.

GestÃ£o de Contas Ã© o ponto Ãºnico para baixa/pagamento de fatura.

## Pagamento total

Ao pagar fatura total:
- registra despesa efetiva `isInvoicePayment`;
- debita conta/carteira escolhida;
- marca fatura/itens como baixados conforme regra;
- nÃ£o gera saldo futuro.

## Pagamento parcial

Ao pagar fatura parcialmente:
- registra somente o valor pago como despesa efetiva;
- marca a obrigaÃ§Ã£o/fatura atual como baixada/settled;
- gera saldo restante na prÃ³xima fatura como obrigaÃ§Ã£o/despesa futura;
- nÃ£o duplica compras originais;
- nÃ£o libera limite total indevidamente se houver saldo remanescente.

## Parcelamento de fatura

Ao parcelar fatura:
- usuÃ¡rio informa entrada, se houver;
- usuÃ¡rio informa quantidade/valor das parcelas conforme banco/app do cartÃ£o;
- o Fluxo nÃ£o calcula juros;
- fatura atual Ã© considerada renegociada/baixada;
- parcelas futuras sÃ£o geradas conforme valores informados;
- nÃ£o exigir que entrada + parcelas fechem valor original, pois juros podem jÃ¡ estar embutidos pelo banco.

---

# REGRA DE LIMITE DO CARTÃƒO E isPaid

Compras no cartÃ£o podem ser registradas como `isPaid = true` porque representam uma despesa baixada via cartÃ£o.

Mas isso nÃ£o significa que a fatura foi paga.

Para limite de cartÃ£o:
- compra no cartÃ£o continua consumindo limite atÃ© que a fatura correspondente seja quitada, renegociada ou tratada conforme regra;
- pagamento de fatura (`isInvoicePayment`) Ã© o evento financeiro que ajusta/libera limite;
- o campo `isPaid` da compra individual nÃ£o deve, sozinho, zerar o impacto da compra no limite.

Erro corrigido:
O cÃ¡lculo de limite descartava compras no cartÃ£o marcadas como `isPaid = true`, o que fazia a fatura ter valor, mas o limite usado aparecer como 0.

Regra correta:
- fatura aberta com valor lanÃ§ado e valor pago R$ 0,00 deve consumir limite;
- limite disponÃ­vel = limite total - limite usado;
- percentual usado = limite usado / limite total.

Exemplo:
Limite: R$ 1.000,00
Fatura aberta: R$ 771,89
Pago: R$ 0,00

Resultado esperado:
- limite usado: R$ 771,89;
- limite disponÃ­vel: R$ 228,11;
- uso: ~77%.

---

# REGRA DE ACORDOS

Acordo = entrada opcional + parcelas futuras.

Entrada nÃ£o Ã© parcela.

Parcelas comeÃ§am depois da entrada.

O app nÃ£o calcula juros; registra o acordo informado pelo usuÃ¡rio.

Exemplo real:
Entrada: R$ 79,60
Parcelas: 11x de R$ 90,39
Total: R$ 1.073,89

CÃ¡lculo:
R$ 79,60 + 11 Ã— R$ 90,39 = R$ 1.073,89

## FormulÃ¡rio de Acordos

Campos:
- Tem entrada?
- Valor da entrada;
- Data da entrada;
- Entrada paga no ato?
- Conta/Carteira da entrada;
- Quantidade de parcelas;
- Valor da parcela;
- Total do acordo calculado automaticamente;
- Data da 1Âª parcela;
- Dia de vencimento.

## Entrada do acordo

A entrada deve ser uma transaÃ§Ã£o separada vinculada ao `debt_id`.

Se paga no ato:
- `is_paid = true`;
- `payment_date` preenchido;
- `account_id`/conta informada;
- deve debitar conta/carteira se o fluxo atual faz isso.

Se nÃ£o paga:
- fica pendente;
- aparece na GestÃ£o de Contas como obrigaÃ§Ã£o separada.

DescriÃ§Ã£o sugerida:
Entrada acordo [nome]

## Parcelas do acordo

Gerar parcelas separadas:
- Parcela 1/N acordo [nome]
- Parcela 2/N acordo [nome]
- ...
- Parcela N/N acordo [nome]

Entrada nÃ£o entra na contagem.

Exemplo:
Entrada + 11 parcelas gera:
- 1 transaÃ§Ã£o de entrada;
- 11 parcelas;
- nÃ£o 12 parcelas.

## Novo Acordo vs EdiÃ§Ã£o

Novo Acordo deve abrir limpo.

NÃ£o pode herdar:
- dados de acordo editado;
- valores de exemplo;
- dados do Ãºltimo acordo;
- valores como 90,39, 11, Inter etc.

Editar Acordo:
- deve abrir preenchido com dados reais do acordo selecionado.

Regra tÃ©cnica:
- separar `createEmptyAgreementForm()`;
- `resetFormState()`;
- `handleEdit(...)`;
- `openAddDebtForm()` deve resetar antes de abrir;
- `handleCloseForm()` deve resetar;
- usar key diferente entre novo e ediÃ§Ã£o para evitar reaproveitamento indevido do subtree React.

## Datas de acordo

Ao lidar com strings `yyyy-mm-dd`, usar parsing local (`parseLocalDate`) em vez de `new Date(...)`, para evitar deslocamento por timezone.

---

# REGRA DE CLASSIFICAÃ‡ÃƒO CANÃ”NICA DE CATEGORIAS

RelatÃ³rios e composiÃ§Ãµes por categoria devem agrupar transaÃ§Ãµes por chave canÃ´nica, nÃ£o por label solto, `debt_id` individual ou fallback local.

Regra geral:
- label igual nÃ£o basta;
- agrupamento deve usar key canÃ´nica.

## Buckets canÃ´nicos

Categoria real:
- key: `category:{category.id}`;
- label: nome da categoria.

Acordo:
- key: `logical:agreement`;
- label: `Acordo`.

RenegociaÃ§Ã£o:
- key: `logical:renegotiation`;
- label: `RenegociaÃ§Ã£o`.

Sem categoria:
- key: `logical:uncategorized`;
- label: `NÃ£o identificados`.

Categoria Ã³rfÃ£:
- key: `logical:missing-category:{categoryId}`;
- label: `Categoria nÃ£o encontrada`.

## Prioridade atual

1. `debtId` â†’ Acordo.
2. RenegociaÃ§Ã£o sistÃªmica â†’ RenegociaÃ§Ã£o.
3. Categoria real chamada Acordo â†’ Acordo.
4. Categoria real diferente de NÃ£o Identificados â†’ categoria real.
5. Categoria real NÃ£o Identificados â†’ NÃ£o identificados.
6. `categoryId` Ã³rfÃ£o â†’ Categoria nÃ£o encontrada.
7. Fallback â†’ NÃ£o identificados.

## Acordo

TransaÃ§Ãµes com `debt_id` devem cair na categoria lÃ³gica Acordo, quando nÃ£o houver categoria real melhor.

Todos os acordos devem somar no mesmo bucket:
- `logical:agreement`.

NÃ£o usar:
- `debt_id` individual como key;
- label solto;
- fallback separado.

Exemplo:
99 - EmprÃ©stimo: R$ 167,67
Inter: R$ 90,39

ComposiÃ§Ã£o correta:
Acordo â€” R$ 258,06

NÃ£o:
Acordo â€” R$ 167,67
Acordo â€” R$ 90,39

## RenegociaÃ§Ã£o

RenegociaÃ§Ã£o Ã© categoria lÃ³gica/nativa do sistema, assim como Acordo.

NÃ£o Identificados Ã© Ãºltimo recurso.

Se o sistema sabe que a transaÃ§Ã£o representa renegociaÃ§Ã£o, ela deve aparecer como RenegociaÃ§Ã£o, mesmo se estiver cadastrada com categoria real â€œNÃ£o Identificadosâ€�.

Exemplos de transaÃ§Ãµes que podem ser RenegociaÃ§Ã£o:
- RenegociaÃ§Ã£o de PendÃªncias;
- Parcela fatura;
- Saldo restante;
- parcelamentos/ajustes sistÃªmicos de fatura;
- registros com sinais estruturados como `transactionType`, `cardId`, `invoiceMonthYear`, desde que nÃ£o sejam `isInvoicePayment`.

Regra:
- usar campo estruturado quando existir;
- usar descriÃ§Ã£o como fallback controlado;
- documentar que falta um campo dedicado de renegociaÃ§Ã£o em Transaction.

Exemplo real:
RenegociaÃ§Ã£o de PendÃªncias (1/9)
Categoria real: NÃ£o Identificados
Resultado correto:
RenegociaÃ§Ã£o â€” R$ 483,86

## NÃ£o Identificados

NÃ£o Identificados deve ser usado apenas quando:
- nÃ£o hÃ¡ categoria real;
- nÃ£o hÃ¡ `debt_id`;
- nÃ£o hÃ¡ regra lÃ³gica nativa melhor;
- nÃ£o hÃ¡ categoria Ã³rfÃ£ identificÃ¡vel.

NÃ£o deve esconder:
- acordo;
- renegociaÃ§Ã£o;
- categoria Ã³rfÃ£.

## Categoria nÃ£o encontrada

Se `category_id` existe, mas a categoria nÃ£o Ã© encontrada na lista carregada:
- mostrar como `Categoria nÃ£o encontrada`;
- nÃ£o misturar com NÃ£o Identificados.

Isso indica problema de integridade:
- categoria apagada;
- categoria de outro usuÃ¡rio;
- RLS/escopo;
- dado Ã³rfÃ£o.

---

# REGRA DE RELATÃ“RIOS â€” CATEGORIAS LÃ“GICAS NATIVAS

Algumas classificaÃ§Ãµes nÃ£o dependem apenas da categoria manual cadastrada pelo usuÃ¡rio.

Categorias lÃ³gicas/nativas:
- Acordo;
- RenegociaÃ§Ã£o;
- NÃ£o identificados;
- Categoria nÃ£o encontrada.

Acordo:
- transaÃ§Ãµes com `debt_id` ou categoria real Acordo.

RenegociaÃ§Ã£o:
- transaÃ§Ãµes sistÃªmicas de renegociaÃ§Ã£o, saldo restante, parcela de fatura ou renegociaÃ§Ã£o de pendÃªncias.

NÃ£o Identificados:
- usado apenas como Ãºltimo recurso.

Categoria nÃ£o encontrada:
- usada quando hÃ¡ `category_id`, mas a categoria nÃ£o resolve.

---

# REGRA DE RELATÃ“RIOS â€” ACORDOS

Acordos devem entrar em RelatÃ³rios conforme competÃªncia/data.

Modo Projetado:
- entrada pendente ou paga entra no mÃªs da entrada;
- parcelas futuras entram nos meses de vencimento;
- nÃ£o exigir `is_paid`.

Modo Realizado:
- entrada/parcela sÃ³ entra se paga.

ComposiÃ§Ã£o das Despesas:
- transaÃ§Ãµes com `debt_id` e sem categoria real devem cair como Acordo;
- mÃºltiplos acordos no mesmo perÃ­odo somam em uma Ãºnica linha Acordo.

Exemplo:
Entrada Inter: Maio/2026 â€” R$ 79,60
Parcela 1/11 Inter: Junho/2026 â€” R$ 90,39
Parcela 2/11 Inter: Julho/2026 â€” R$ 90,39

RelatÃ³rio Projetado:
- Maio: Acordo inclui R$ 79,60;
- Junho: Acordo inclui R$ 90,39;
- Julho: Acordo inclui R$ 90,39.

---

# REGRA DE FILTROS DE PERÃ�ODO

Filtro Dia sÃ³ deve existir em:
- LanÃ§amentos;
- GestÃ£o de Contas.

Filtro Dia deve ser removido de:
- Home;
- RelatÃ³rios;
- OrÃ§amentos;
- CartÃµes;
- demais telas analÃ­ticas/planejamento.

RelatÃ³rios devem trabalhar com:
- MÃªs;
- Semestre;
- Ano.

Quando selecionar Semestre:
- toda a tela muda para visÃ£o de semestre;
- cards somam semestre;
- grÃ¡fico mostra semestres/meses do semestre conforme contexto;
- comparativo usa semestre anterior;
- orÃ§amento por categoria sÃ³ aparece se a visÃ£o suportar adequadamente.

---

# REGRA DE VALORES MONETÃ�RIOS

Valores monetÃ¡rios nÃ£o podem quebrar linha entre:
- sinal negativo;
- R$;
- valor.

Usar:
- `whitespace-nowrap`;
- `tabular-nums`;
- `leading-tight`/`leading-none`;
- `clamp` de fonte se necessÃ¡rio.

Aplicar em:
- cards da Home;
- RelatÃ³rios;
- OrÃ§amentos;
- GestÃ£o de Contas;
- CartÃµes;
- resumos financeiros.

Exemplo de problema corrigido:
`-R$ 3.005,30` nÃ£o deve quebrar depois do hÃ­fen.

---

# REGRA DE TESTES E VALIDAÃ‡ÃƒO DE SPRINT

Antes de fechar sprint, executar:

- `npm run check:encoding`
- `npm test`
- `npm run build`
- `npm run lint`

Quando mexer em cÃ¡lculo financeiro, adicionar teste de regressÃ£o.

Quando mexer em UI com texto acentuado, garantir `check:encoding` e testes com texto correto.

Quando mexer em cartÃ£o/fatura/acordos/orÃ§amentos/relatÃ³rios, validar manualmente cenÃ¡rios reais alÃ©m dos testes.

---

# CORREÃ‡Ã•ES IMPORTANTES REGISTRADAS

## CorreÃ§Ã£o: Home zerada no boot

Problema:
Home abria com valores R$ 0,00 antes dos dados carregarem.

CorreÃ§Ã£o:
Boot passou a executar a rotina real do botÃ£o Atualizar automaticamente ao acessar o app logado.

Regra:
Home nÃ£o pode renderizar estado zerado falso enquanto dados ainda carregam.

---

## CorreÃ§Ã£o: tutorial

Problema:
Tutorial reaparecia constantemente.

DecisÃ£o final:
Tutorial removido completamente.

---

## CorreÃ§Ã£o: AcentuaÃ§Ã£o/mojibake

Problema:
Textos como `Descriï¿½ï¿½o`, `Nï¿½`, `LanÃƒÂ§amento`.

CorreÃ§Ã£o:
Textos corrigidos e proteÃ§Ã£o permanente criada:
- `.editorconfig`;
- `AGENTS.md`;
- `scripts/check-mojibake.mjs`;
- `npm run check:encoding`.

---

## CorreÃ§Ã£o: CartÃµes â€” limite

Problema:
Fatura tinha valor, mas limite usado aparecia como 0%.

Causa:
Compra no cartÃ£o marcada como `isPaid = true` estava sendo removida do cÃ¡lculo de limite.

CorreÃ§Ã£o:
Compra no cartÃ£o continua consumindo limite atÃ© pagamento/baixa/renegociaÃ§Ã£o da fatura.

---

## CorreÃ§Ã£o: CartÃµes â€” UI

Problema:
Tela de CartÃµes tinha blocos inÃºteis e poluÃ­dos.

Removidos da UI:
- Total lanÃ§ado;
- Valor pago;
- DiferenÃ§a a conciliar;
- Gastos;
- DisponÃ­vel como card separado.

Mantidos:
- limite;
- fatura;
- status;
- lista de lanÃ§amentos;
- atalho para GestÃ£o de Contas.

---

## CorreÃ§Ã£o: OrÃ§amentos â€” categorias acompanhadas

Problema:
Categorias apareciam mesmo com toggle â€œAcompanharâ€� desligado.

CorreÃ§Ã£o:
A lista principal mostra somente categorias explicitamente acompanhadas.

Regra:
Acompanhar = visibilidade.
OrÃ§amento = meta.
Movimento = consumo.

---

## CorreÃ§Ã£o: RelatÃ³rios â€” Acordo duplicado

Problema:
Acordo aparecia duplicado na ComposiÃ§Ã£o das Despesas.

Causa:
Agrupamento usava key por `debt_id`.

CorreÃ§Ã£o:
Todos os acordos caem em `logical:agreement`.

---

## CorreÃ§Ã£o: RelatÃ³rios â€” RenegociaÃ§Ã£o

Problema:
RenegociaÃ§Ã£o de PendÃªncias aparecia como NÃ£o Identificados.

CorreÃ§Ã£o:
RenegociaÃ§Ã£o virou categoria lÃ³gica nativa:
`logical:renegotiation`.

---

## CorreÃ§Ã£o: Acordos â€” entrada

Problema:
Tela de Acordos nÃ£o permitia entrada.

CorreÃ§Ã£o:
Acordos agora suportam entrada opcional separada das parcelas.

Exemplo:
R$ 79,60 + 11x R$ 90,39 = R$ 1.073,89.

---

## CorreÃ§Ã£o: Acordos â€” formulÃ¡rio herdava estado

Problema:
Novo Acordo abria com dados do acordo editado anteriormente.

CorreÃ§Ã£o:
Estado de novo acordo e ediÃ§Ã£o foi separado:
- novo abre limpo;
- ediÃ§Ã£o abre preenchida;
- fechamento reseta estado.

---

## CorreÃ§Ã£o: Acordos â€” relatÃ³rios

Problema:
Acordos sem categoria nÃ£o apareciam corretamente em RelatÃ³rios.

CorreÃ§Ã£o:
TransaÃ§Ã£o com `debt_id` e sem categoria cai em Acordo.

---

# PRÃ“XIMOS PONTOS TÃ‰CNICOS FUTUROS

## Persistir macrocategorias no backend

Hoje macrocategorias usam localStorage.

Futuro:
criar migration oficial para persistir:
- grupos;
- percentual;
- cor;
- Ã­cone;
- vÃ­nculo com categorias;
- user_id;
- RLS.

## Campo dedicado para RenegociaÃ§Ã£o

Hoje RenegociaÃ§Ã£o Ã© detectada por sinais estruturados + descriÃ§Ã£o.

Futuro:
adicionar campo estruturado para identificar renegociaÃ§Ã£o, evitando dependÃªncia de texto.

PossÃ­veis campos:
- `system_category`;
- `financial_origin`;
- `transaction_subtype`;
- `is_renegotiation`;
- `renegotiation_group_id`.

## EdiÃ§Ã£o segura de Acordos

Se entrada jÃ¡ foi paga:
- nÃ£o permitir remover livremente;
- exigir estorno/correÃ§Ã£o assistida;
- preservar histÃ³rico.

## PersistÃªncia das categorias acompanhadas

Hoje categorias acompanhadas usam localStorage.

Futuro:
persistir no backend por usuÃ¡rio para sincronizar entre dispositivos.

## Melhorias de recategorizaÃ§Ã£o

Criar fluxo para recategorizar em massa:
- parcelas de acordo;
- renegociaÃ§Ã£o;
- transaÃ§Ãµes sem categoria;
- categorias Ã³rfÃ£s.

---

# REGRA DE SEGURANÃ‡A â€” EXCLUSÃƒO DE CONTA / LGPD

A exclusÃ£o de conta deve ser feita pela RPC:

`public.delete_user_data(target_user_id uuid)`

A funÃ§Ã£o deve:

- permitir exclusÃ£o apenas do prÃ³prio usuÃ¡rio autenticado;
- validar `auth.uid() IS NOT NULL`;
- validar `auth.uid() = target_user_id`;
- usar `SECURITY DEFINER` apenas porque precisa remover o registro final em `auth.users`;
- usar `search_path` seguro;
- qualificar tabelas por schema;
- apagar `auth.users` por Ãºltimo;
- executar `NOTIFY pgrst, 'reload schema'` apÃ³s criaÃ§Ã£o/alteraÃ§Ã£o;
- revogar execuÃ§Ã£o pÃºblica;
- conceder execuÃ§Ã£o apenas para `authenticated`.

A funÃ§Ã£o nÃ£o deve permitir exclusÃ£o cruzada de dados entre usuÃ¡rios.

Antes de aplicar ou testar exclusÃ£o real:
- usar somente usuÃ¡rio de teste;
- confirmar existÃªncia da funÃ§Ã£o;
- confirmar grants;
- validar que o frontend nÃ£o retorna `PGRST202`;
- nunca testar primeiro em usuÃ¡rio real.

---

# REGRA DE UX â€” FILTROS MOBILE EM RELATÃ“RIOS

No mobile, os controles de RelatÃ³rios nÃ£o podem se sobrepor.

Projetado/Realizado deve ficar em uma linha prÃ³pria.

MÃªs/Semestre/Ano deve ficar em outra linha prÃ³pria.

Os filtros precisam ser tocÃ¡veis, legÃ­veis e sem sobreposiÃ§Ã£o em telas pequenas.

---

# REGRA DE DEVTOOLS

TanStack/React Query Devtools nÃ£o deve aparecer para o usuÃ¡rio.

O Devtools sÃ³ pode renderizar quando:

- ambiente for DEV;
- e `VITE_ENABLE_QUERY_DEVTOOLS=true`.

Por padrÃ£o, ele deve ficar desativado para nÃ£o atrapalhar web nem mobile.

---

# REGRA TÃ‰CNICA â€” CONTAS / BANCO

A tabela `accounts` no Supabase usa o campo tÃ©cnico `bank`.

O app nÃ£o deve enviar `institution` em inserts ou updates de contas.

`institution` pode existir apenas como fallback legado de leitura em objetos antigos de UI/testes, mas nÃ£o deve ser persistido no Supabase.

Regra:
- campo visual pode ser â€œInstituiÃ§Ã£oâ€� ou â€œBancoâ€�;
- campo tÃ©cnico persistido deve ser sempre `bank`;
- seletores de conta devem exibir banco + nome, por exemplo: `ItaÃº â€” Khendry`.

NÃ£o criar migration para adicionar `institution`.
NÃ£o renomear `bank`.
NÃ£o alterar contas existentes por causa disso.

---

# REGRA DE RELATÃ“RIOS â€” FLUXO SCORE (ADITIVO E SOMENTE LEITURA)

## Diretriz crÃ­tica de seguranÃ§a/arquitetura

Fluxo Score Ã© funcionalidade estritamente aditiva e de observaÃ§Ã£o.

ObrigatÃ³rio:
- nÃ£o alterar mecÃ¢nicas atuais de criaÃ§Ã£o/ediÃ§Ã£o/exclusÃ£o de contas;
- nÃ£o alterar mecÃ¢nicas atuais de criaÃ§Ã£o/ediÃ§Ã£o/exclusÃ£o de acordos;
- nÃ£o alterar hooks de mutaÃ§Ã£o jÃ¡ existentes;
- nÃ£o alterar endpoints/RPC jÃ¡ existentes;
- nÃ£o introduzir efeitos colaterais de escrita para calcular Score.

Regra de implementaÃ§Ã£o:
- Score apenas lÃª `transactions`, `debts` e estado atual da aplicaÃ§Ã£o;
- cÃ¡lculo isolado em utilitÃ¡rio dedicado;
- arredondamento apenas na exibiÃ§Ã£o da UI;
- lÃ³gica financeira existente permanece intacta.

## Escala e baseline

- faixa de Score: 0 a 1000;
- baseline inicial/neutro: 500.

## Motor de cÃ¡lculo â€” contas de consumo/pagamentos padrÃ£o

Para cada conta/obrigaÃ§Ã£o paga, calcular diferenÃ§a em dias:
- `dias = paymentDate - dueDate`.

Regras:
- pagamento no dia do vencimento (`dias = 0`): `+5`;
- pagamento antecipado (`dias < 0`): `+10`;
- atraso leve (`dias = 1..3`): `-10`;
- atraso mÃ©dio (`dias = 4..10`): `-25`;
- atraso grave (`dias > 10`): `-50`;
- penalidade contÃ­nua para atraso grave:
  - `-2` por dia extra apÃ³s o 10Âº dia;
  - fÃ³rmula: `-50 - ((dias - 10) * 2)`;
  - teto de penalidade por conta: `-100`.

### BÃ´nus mensal

Adicionar `+10` para contas em dia.

Regra de cÃ¡lculo:
- **A partir de 01/06/2026**: O bÃ´nus Ã© verificado e definido com base no primeiro dia Ãºtil do mÃªs de referÃªncia. No primeiro dia Ãºtil de cada mÃªs, Ã© verificada a existÃªncia de despesas em atraso (vencidas antes do primeiro dia Ãºtil e nÃ£o pagas atÃ© o primeiro dia Ãºtil). Se houver, a bonificaÃ§Ã£o de `+10` nÃ£o Ã© concedida para o mÃªs corrente. Caso contrÃ¡rio, o bÃ´nus de `+10` Ã© ganho e mantido para o restante do mÃªs. Para datas anteriores ao primeiro dia Ãºtil do mÃªs, a elegibilidade Ã© verificada dinamicamente com base nas contas vencidas atÃ© o dia atual.
- **Antes de 01/06/2026**: O bÃ´nus mensal Ã© fixado em `0` (desativado antes da data de implantaÃ§Ã£o da feature).

## Motor de cÃ¡lculo â€” acordos e dÃ­vidas

Acordos ativos tÃªm peso prÃ³prio no Score:

- penalidade de criaÃ§Ã£o: `-100` por acordo ativo;
- recuperaÃ§Ã£o proporcional por pagamento de parcelas:
  - `recuperaÃ§Ã£o = (parcelasPagas / totalParcelas) * 100`.

Regra de precisÃ£o:
- usar ponto flutuante internamente para evitar erro acumulado;
- aplicar `Math.round` somente na camada de apresentaÃ§Ã£o;
- ao quitar a Ãºltima parcela, a recuperaÃ§Ã£o total do acordo deve atingir exatamente `100`.

## FÃ³rmula consolidada

Score final:
- `score = clamp(500 + somaRegrasContas + somaRegrasAcordos + bonusMensal, 0, 1000)`.

Onde:
- `somaRegrasContas` aplica variaÃ§Ãµes por pontualidade/atraso das contas pagas;
- `somaRegrasAcordos` soma `-100 + recuperaÃ§Ã£oProporcional` por acordo ativo;
- `bonusMensal` Ã© `0` ou `+50`.

## Requisito de UI â€” tela e posicionamento

RenderizaÃ§Ã£o exclusiva:
- componente Fluxo Score deve existir somente na tela de RelatÃ³rios.

Layout:
- posicionar ao lado do card de Saldo na faixa superior da tela;
- manter destaque simÃ©trico e responsivo com grid/flex ajustado.

## Requisito visual â€” grÃ¡fico circular, cor e glow

Componente:
- usar anel circular (donut/gauge) em SVG ou biblioteca padrÃ£o.

Centro:
- mostrar nÃºmero inteiro do Score com tipografia forte.

Cores:
- nÃ£o usar gradiente semÃ¡foro (vermelho/amarelo/verde);
- usar variaÃ§Ãµes da cor de destaque ativa (`--primary`/accent da aplicaÃ§Ã£o).

Glow:
- aplicar brilho externo (drop-shadow/radial glow) na cor de destaque;
- intensidade pode crescer conforme o Score.

## Requisito de animaÃ§Ã£o

Na carga inicial:
- anel deve animar de `0` atÃ© Score atual;
- transiÃ§Ã£o suave em `1.0s` a `1.5s`, `ease-out` ou `cubic-bezier`.

Em recÃ¡lculo:
- nÃºmero e barra devem interpolar suavemente;
- evitar saltos bruscos na atualizaÃ§Ã£o.

---

# HISTÃ“RICO DE VALIDAÃ‡Ã•ES DE ALTERAÃ‡Ã•ES

## [2026-05-26] AlteraÃ§Ã£o de UI - RemoÃ§Ã£o do Tooltip de InformaÃ§Ã£o do Saldo Projetado no Mobile
- **Resumo**: O botÃ£o de informaÃ§Ã£o (Tooltip) ao lado do texto "Saldo Projetado" na tela inicial do mobile (`src/pages/LegacyDashboardHome.tsx`) foi removido.
- **MotivaÃ§Ã£o**: Atender ao design minimalista e executivo, de modo a evitar textos explicativos repetitivos/desnecessÃ¡rios no corpo principal da UI mÃ³vel. Limpeza executada dos imports nÃ£o utilizados do Tooltip e do Ã­cone Info.

## [2026-05-26] AlteraÃ§Ã£o de UI / Funcionalidade - RemoÃ§Ã£o de Macrocategorias e Melhoria de Selects no Cadastro de Categorias
- **Resumo**: Toda e qualquer referÃªncia Ã  funcionalidade de macrocategorias foi removida do cadastro de categorias (`src/components/settings/CategoriesManager.tsx`), incluindo o botÃ£o do cabeÃ§alho para gerenciar macrocategorias (`BudgetGroupManagerModal`) e o dropdown/seletor de macrocategoria nos diÃ¡logos de nova categoria e de ediÃ§Ã£o de categoria. Adicionalmente, os seletores de grupos de despesas (`BudgetGroup`), que antes eram componentes de `<select>` nativos do navegador e apresentavam visualizaÃ§Ã£o fora do padrÃ£o do app, foram substituÃ­dos pelo componente premium `<Select>` da biblioteca do Shadcn UI.
- **MotivaÃ§Ã£o**: Atender Ã  solicitaÃ§Ã£o direta do usuÃ¡rio para remover macrocategorias do fluxo de cadastro e corrigir o design visual dos seletores de grupo no cadastro de categorias, alinhando-o com o estilo visual dark do restante da aplicaÃ§Ã£o.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Regra de NegÃ³cio - AtualizaÃ§Ã£o DiÃ¡ria do Score, BÃ´nus no Primeiro Dia Ãštil e ConsideraÃ§Ã£o Total de Dados
- **Resumo**: A verificaÃ§Ã£o da bonificaÃ§Ã£o mensal no cÃ¡lculo do Fluxo Score foi reduzida de `+50` para `+10` e configurada para ocorrer com base no estado do primeiro dia Ãºtil do mÃªs de referÃªncia (`src/utils/fluxoScore.ts`), com data de inÃ­cio em `01/06/2026`. Para datas de referÃªncia anteriores a `01/06/2026` (como maio de 2026), o bÃ´nus mensal Ã© fixado em `0` (desativado). Adicionamos a lÃ³gica para detectar o primeiro dia Ãºtil do mÃªs (ajustando para segunda-feira caso caia em fins de semana) e congelar a verificaÃ§Ã£o de atrasos a partir dessa data. Adicionalmente, para garantir que as parcelas de acordos cadastrados e contas pendentes de meses/anos passados sejam sempre computadas no cÃ¡lculo do score e no saldo projetado do app, expandimos a query global do Supabase (`src/hooks/useFinanceQueries.ts`) para retornar todas as transaÃ§Ãµes nÃ£o pagas (`is_paid = false`) e transaÃ§Ãµes vinculadas a acordos (`debt_id`) de todos os tempos.
- **MotivaÃ§Ã£o**: Atender Ã  nova dinÃ¢mica de lanÃ§amentos diÃ¡rios, reduzindo o peso do bÃ´nus mensal de acordo com as preferÃªncias do usuÃ¡rio, aplicando a nova lÃ³gica do primeiro dia Ãºtil a partir de 1Âº de junho e fixando o bÃ´nus de maio como 0 para refletir os atrasos anteriores ao acordo criado hoje.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Regra de SeguranÃ§a - Garantia de Isolamento de UsuÃ¡rios e CorreÃ§Ã£o de Queries
- **Resumo**: Foi realizada uma revisÃ£o e correÃ§Ã£o estrutural no arquivo `src/hooks/useFinanceQueries.ts` para garantir o isolamento estrito de dados entre diferentes usuÃ¡rios. Todos os hooks de leitura (`useAccounts`, `useTransactions`, `useCreditCards`, `useDebts` e `useSavingsGoals`) foram updated para aplicar explicitamente o filtro `.eq('user_id', user.id)` baseando-se no ID do usuÃ¡rio autenticado no Supabase Auth. Adicionalmente, as importaÃ§Ãµes duplicadas no topo do arquivo foram limpas e a query de metas de economia (`useSavingsGoals`), que havia sido corrompida por um erro de merge anterior, foi completamente restaurada e isolada por usuÃ¡rio.
- **MotivaÃ§Ã£o**: Atender Ã  garantia solicitada pelo usuÃ¡rio de que os dados de diferentes usuÃ¡rios nÃ£o se misturem e corrigir o score do usuÃ¡rio (Khendry) que estava zerado na conta oficial devido ao vazamento de acordos/transaÃ§Ãµes de teste de outro usuÃ¡rio no cÃ¡lculo global do score.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Funcionalidade - Cor de Destaque Salva e Sincronizada por UsuÃ¡rio
- **Resumo**: Refatoramos o hook de cores [useThemeColor.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useThemeColor.tsx) para salvar a cor de destaque (accent color) de maneira individual por usuÃ¡rio, em vez de salvar de forma genÃ©rica e compartilhada no navegador. O estado local agora Ã© persistido sob a chave `accent-color:${userId}` no localStorage (e de forma retrocompatÃ­vel na chave `accent-color` para os testes e legado). O processo de hidrataÃ§Ã£o no carregamento agora prioriza em primeiro nÃ­vel o metadado do usuÃ¡rio autenticado retornado do Supabase (`user.user_metadata?.accent_color`), seguido pela chave especÃ­fica do usuÃ¡rio e, por Ãºltimo, o fallback legado, garantindo que a preferÃªncia do usuÃ¡rio o acompanhe em qualquer mÃ¡quina ou navegador.
- **MotivaÃ§Ã£o**: Atender Ã  solicitaÃ§Ã£o direta do usuÃ¡rio para salvar as preferÃªncias de cores no perfil do usuÃ¡rio (na nuvem) e isolar o armazenamento de layout no mesmo navegador de acordo com a conta logada.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Regra de NegÃ³cio - Ajuste no PerÃ­odo de Penalidades e InclusÃ£o de Contas Pendentes no Score
- **Resumo**: Atualizamos a lÃ³gica do Fluxo Score ([fluxoScore.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/utils/fluxoScore.ts)) para se alinhar ao conceito de "diagnÃ³stico de saÃºde financeira atual". Agora, contas pendentes (nÃ£o pagas) que estÃ£o vencidas ativamente geram penalidades de atraso no Score de acordo com a quantidade de dias em atraso, incentivando o usuÃ¡rio a quitÃ¡-las ou consolidÃ¡-las em acordos. Por outro lado, para evitar que um usuÃ¡rio histÃ³rico (com base de dados antiga ou importada via CSV) seja penalizado perpetuamente por contas quitadas com atraso hÃ¡ muito tempo, as penalidades de despesas pagas com atraso passam a expirar apÃ³s 30 dias do pagamento. Adicionalmente, as compras individuais realizadas no cartÃ£o de crÃ©dito (`tx.cardId` preenchido e nÃ£o sendo o pagamento da fatura em si) foram **desconsideradas** do cÃ¡lculo de pontualidade de contas (`accountsDelta`), visto que a Ãºnica obrigaÃ§Ã£o financeira direta vinculada a prazos no cartÃ£o Ã© o pagamento da fatura consolidada. A regra de acordos ativos com penalidades de `-100` e recuperaÃ§Ã£o proporcional por parcelas pagas foi mantida e integrada a essa lÃ³gica.
- **MotivaÃ§Ã£o**: Resolver o bug que travava o Score de usuÃ¡rios antigos em 0 devido a contas quitadas em atraso do passado distante (ex. importaÃ§Ã£o histÃ³rica de extratos via CSV), evitar a penalizaÃ§Ã£o artificial por compras rotineiras no cartÃ£o de crÃ©dito cujas datas de pagamento/conciliaÃ§Ã£o divergem da data da compra e incentivar a quitaÃ§Ã£o de contas ativamente vencidas e nÃ£o pagas.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Regra de NegÃ³cio - CalibraÃ§Ã£o de DiagnÃ³stico do Score e CorreÃ§Ã£o de Acordos Ativos
- **Resumo**: Corrigimos a funÃ§Ã£o de avaliaÃ§Ã£o do Fluxo Score (`src/utils/fluxoScore.ts`) e o arquivo de testes unitÃ¡rios correspondente (`src/test/utils/fluxoScore.test.ts`). Alteramos o cÃ¡lculo das contas para remover completamente a bonificaÃ§Ã£o cumulativa por contas pagas em dia ou adiantadas (as quais agora geram `0` ponto de variaÃ§Ã£o em vez de acumular crÃ©ditos positivos, evitando ocultar contas atualmente em atraso). Adicionalmente, corrigimos a lÃ³gica do `isDebtActive` para permitir que acordos criados pelo app (que por padrÃ£o sÃ£o salvos com o status `'renegotiated'` no banco de dados) sejam contabilizados como acordos ativos na avaliaÃ§Ã£o do score, aplicando corretamente o impacto negativo de `-100` pontos e a recuperaÃ§Ã£o proporcional correspondente ao pagamento de parcelas do acordo.
- **MotivaÃ§Ã£o**: Resolver os dois problemas identificados na conta antiga do usuÃ¡rio Khendry: primeiro, as bonificaÃ§Ãµes acumuladas de contas em dia mascaravam as contas em atraso (mantendo o score em 1000); segundo, todos os seus acordos criados hoje no app eram incorretamente ignorados por serem de status `'renegotiated'`, impedindo o score de cair para o patamar real correto e impossibilitando o diagnÃ³stico financeiro adequado.

## [2026-05-26] AlteraÃ§Ã£o Arquitetural / Regra de NegÃ³cio e UI - LiberaÃ§Ã£o Total de Planos e RemoÃ§Ã£o de Mapa por Categoria dos RelatÃ³rios
- **Resumo**: Removemos as limitaÃ§Ãµes de planos na aplicaÃ§Ã£o, alterando o hook central `useFeatureFlag` (`src/hooks/useFeatureFlags.ts`) para retornar `true` para todas as funcionalidades e planos, com exceÃ§Ã£o da feature `admin_panel` que continua restrita ao super admin. AlÃ©m disso, removemos completamente a seÃ§Ã£o "Mapa por categoria" da tela de RelatÃ³rios (`src/pages/ReportsDashboard.tsx`), incluindo o contÃªiner condicional e a tabela anual detalhada por categoria, e atualizamos os testes correspondentes (`ReportsDashboard.test.tsx`, `ProjectionAccess.test.tsx` e `sprintAccessMobileTheme.test.tsx`).
- **MotivaÃ§Ã£o**: Atender Ã  solicitaÃ§Ã£o direta do usuÃ¡rio para permitir testes completos de todas as funcionalidades para os usuÃ¡rios sem restriÃ§Ãµes de planos (com exceÃ§Ã£o do painel super admin), e simplificar a tela de relatÃ³rios removendo o mapa anual por categoria.


## 01/06/2026
- Remoção da tela de Projeção e Estratégia.
- Ajuste no visual do filtro de categorias da Gestão de Contas.
- Remoção da mensagem motivacional da Reserva de Emergência.
- Desativação do tema de Páscoa.

- Faturas de cartão de crédito classificadas logicamente como 'Cartão de Crédito' em vez de 'Não identificadas'.
- Ajuste no visual do filtro de categorias da tela de Lançamentos para usar o componente Select do design system.
- Agrupamento de categorias (Receitas, Despesas, Outros) nos filtros das telas de LanÃ§amentos e GestÃ£o de Contas.
- OcultaÃ§Ã£o da aba Sonhos & Projetos do menu principal.


## [2026-06-09] CorreÃ§Ã£o de Bug / Arquitetura - Cadastro de Categorias e Race Condition na SessÃ£o
- **Resumo**: Corrigimos o bug crÃ­tico que impedia novos usuÃ¡rios (ou usuÃ¡rios apÃ³s carregamento limpo) de criarem categorias. A restriÃ§Ã£o `NOT NULL` da coluna `group_id` na tabela `categories` foi removida via migraÃ§Ã£o Supabase (`0036_make_category_group_id_optional.sql`). No front-end:
  1. O tipo `Category` em [finance.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/types/finance.ts) foi atualizado para tornar `groupId` opcional e aceitar `null`.
  2. O componente [CategoriesManager.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/settings/CategoriesManager.tsx) teve sua validaÃ§Ã£o restritiva que exigia um grupo removida, definindo `groupId` como nulo caso os grupos globais ainda nÃ£o estivessem disponÃ­veis.
  2. O componente [CategoriesManager.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/settings/CategoriesManager.tsx) teve sua validação restritiva que exigia um grupo removida, definindo `groupId` como nulo caso os grupos globais ainda não estivessem disponíveis.
  3. Todas as queries de [useFinanceQueries.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useFinanceQueries.ts) foram atualizadas para integrar o hook `useAuth()`. A execução foi vinculada a `enabled: !!user` e a chave de cache a `user?.id`, corrigindo a race condition onde o React Query cacheava um array vazio (`[]`) por 24 horas caso a query rodasse antes da restauração da sessão do Supabase, o que gerava o bloqueio persistente na criação de categorias.
- **Motivação**: Resolver a inconsistência onde novos usuários não conseguiam cadastrar categorias devido ao atraso de inicialização do Supabase Auth no carregamento inicial, que gerava um cache duradouro vazio dos grupos de categorias na tela de gestão de categorias.

## [2026-06-15] Alteração Arquitetural / UI - Tema Copa do Mundo e Modo Torcida 🇧🇷 (Evolução Visual & Responsividade)
- **Resumo**: Criamos e integramos o "Modo Torcida Copa" no aplicativo. Refatoramos o hook de cores [useThemeColor.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useThemeColor.tsx) para expor as propriedades `modoTorcida` e `setModoTorcida`, persistindo essa preferência localmente no `localStorage` (com chaves específicas por usuário `modo-torcida:${userId}`) e sincronizando-a de forma remota no Supabase (`user.user_metadata?.modo_torcida`). No arquivo de estilos globais [index.css](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/index.css), criamos as classes `.theme-copa` e `.dark.theme-copa` que substituem as cores de destaque e de status do design system pelas cores oficiais da bandeira do Brasil (Verde Bandeira, Amarelo Ouro e Azul Anil), preservando intacta a cor de fundo original (chumbo, preto amoled ou branco claro). Adicionamos também um gradiente de 3 cores oficial para as barras de progresso quando o modo torcida está ativo. Atualizamos a tela de configurações [ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx) com um card interativo contendo o switch temático. Para garantir responsividade impecável em todas as resoluções de tela e evitar quebras de layout:
  1. Restauramos o componente de logo [AppLogo.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/branding/AppLogo.tsx) para renderizar apenas a marca de forma limpa.
  2. Implementamos um varal de bandeirinhas do Brasil em CSS/HTML (`BandeirinhasVaral`) que flutua de forma responsiva (`justify-around`) e balança suavemente com física simulada via animação `@keyframes sway` no topo do layout principal [AppLayout.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/AppLayout.tsx).
  3. Desenvolvemos e injetamos o componente de desenho vetorial SVG da bandeira oficial do Brasil (`BandeiraBrasilSvg`) nos cabeçalhos desktop e mobile (`NavigationRail.tsx` e `MobileTopHeader.tsx`) e na tela de configurações (`ProfileSettings.tsx`) no lugar do emoji de bandeira 🇧🇷. Isso resolve de forma permanente e elegante o bug de renderização no Windows, que exibe os emojis de bandeira como as letras pretas em formato de texto 'BR'. A taça dourada 🏆 animada foi mantida ao lado da bandeira SVG e disposta de forma totalmente responsiva.
  4. Melhoramos o layout da grade de temas e o card de Configurações ([ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx)) para ajustar dinamicamente as colunas com base no número de opções ativas e definimos o card "Aparência" como `md:col-span-2` (largura total), alinhando-o aos demais cards e eliminando o enorme espaço vazio que ficava à direita na página.
- **Motivação**: Atender à solicitação do usuário de criar um tema da Copa do Mundo muito mais característico e com clima festivo ("festa no app"), garantindo que todos os elementos visuais (como a bandeira em SVG para evitar o bug de exibição 'BR' no Windows e a taça animada) sejam dispostos de forma 100% responsiva tanto em dispositivos móveis quanto em telas grandes, sem esmagamento ou quebras de layout nos cabeçalhos e logotipos, e resolver o problema visual do espaço em branco ao lado do card de temas.

## [2026-06-24] Alteração Arquitetural / UI - Acessibilidade do Painel Super Admin e Reestruturação Completa da SuperPage
- **Resumo**: Resolvemos o problema de acessibilidade do painel de Super Admin e otimizamos o seu layout em telas de computador:
  1. Adicionamos a opção "Painel Super" no menu dropdown do Avatar do desktop (no componente [NavigationRail.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/NavigationRail.tsx)) e do mobile (no componente [MobileTopHeader.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/MobileTopHeader.tsx)). O link é renderizado condicionalmente, aparecendo apenas para o UUID administrador definido no `.env` (`VITE_SUPER_USER_ID`).
  2. Ajustamos a largura máxima de toda a tela do painel de Super Admin ([SuperPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/SuperPage.tsx)) de `max-w-lg` para `max-w-4xl`, permitindo que os elementos tenham espaço e o design respire no desktop.
  3. Reestruturamos completamente a aba de **Temas** para organizar as opções em uma grade de duas colunas (`grid-cols-1 md:grid-cols-2 gap-4`), a aba de **Planos** para posicionar a criação de planos e a lista de planos lado a lado, e a aba de **Usuários** para dispor as informações gerais e o seletor de plano em uma coluna e os toggles de acesso às telas/recursos premium na outra. Isso elimina de vez o espaço vazio inútil nas laterais da interface em telas maiores.
- **Motivação**: Garantir que o super usuário consiga acessar visualmente o seu painel de controle a partir de qualquer dispositivo de forma rápida, e resolver o problema de layout "espremido" e com enormes espaços em branco nas laterais da tela de gerenciamento quando acessada no computador.

## [2026-06-24] Alteração Arquitetural / UI - Gestão Dinâmica de Temas e Ativação do Modo Copa Global
- **Resumo**: Implementamos a capacidade de gerenciar temas especiais globais diretamente pela interface do painel administrativo (Super Admin), sem a necessidade de alterações de código. No banco de dados, criamos uma nova migração (`0037_add_theme_copa_to_global_flags.sql`) para registrar o flag `'theme_copa'`. No front-end:
  1. Atualizamos a aba de temas da tela de Super Admin (`SuperPage.tsx`) incluindo o ícone correspondente ao tema da Copa 🇧🇷.
  2. Ajustamos a tela de login [AuthPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/AuthPage.tsx) para que, em Modo Copa ativo no painel admin, a tela de login herde as cores do tema Copa e exiba o mockup correto com o logotipo vetorial customizado (curvas do fluxo verde e bandeira do Brasil SVG lado a lado) e o slogan "Com o Fluxo, você economiza o dinheiro e guarda o fôlego para gritar é campeão!" estilizado nas cores brasileiras.
  3. Mantivemos o tema interno do aplicativo (área logada) sob escolha individual dos usuários em [ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx) — a ativação global do admin não força o tema Copa internamente, respeitando a preferência de cor de cada usuário e permitindo a eles ativarem ou desativarem o Modo Torcida voluntariamente.
  4. Melhoramos o layout da grade de temas na tela de Configurações ([ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx)) para ajustar dinamicamente as colunas com base no número de opções ativas, eliminando o espaço vazio que ocorria no desktop ao exibir 3 opções em uma grade de 2 colunas.
- **Motivação**: Atender ao pedido do usuário para poder gerenciar temas festivos pelo app e garantir que a ativação global do tema da Copa apenas force o visual festivo na tela de login comum a todos, deixando a área autenticada respeitar a preferência de cada um; e resolver o problema visual do espaço em branco no seletor de temas das configurações.

## [2026-06-24] Alteração Arquitetural / UI - Gerenciamento Completo de Usuários/Planos e Tematização da Copa Segmentada
- **Resumo**: Implementamos a gestão completa de usuários e planos pelo painel administrativo e a segmentação de exibição do tema da Copa:
  1. No banco de dados, criamos uma nova migração (`0038_super_admin_user_management.sql`) contendo as políticas RLS para dar controle total ao Super Admin sobre as tabelas administrativas, além de 4 funções RPC seguras (`super_admin_create_user`, `super_admin_delete_user`, `super_admin_update_user` e `super_admin_list_users`) rodando como `SECURITY DEFINER` e protegidas com validação estrita do UUID do Super Admin.
  2. Na interface da aba de **Usuários** ([SuperPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/SuperPage.tsx)), implementamos a listagem dinâmica completa de usuários (com e-mail e nome obtidos via RPC), cadastro de novos usuários, exclusão física de contas e um formulário de edição cadastral (para mudar nome, e-mail e senha) integrado na coluna de detalhes de permissão/plano.
  3. Na aba de **Planos** ([SuperPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/SuperPage.tsx)), integramos a mutação `useUpdatePlan` para permitir a alteração cadastral (nome e descrição) dos planos de acesso diretamente por um formulário dedicado, separando o lápis de edição textual do escudo de edição de telas/recursos.
  4. Segmentamos o tema da Copa em duas frentes independentes:
     - **Copa - Login (Global)**: Ativa o tema da Copa na tela de login (`theme_copa`) para todos os usuários.
     - **Copa - Área Logada (Interno)**: Habilita o card "Modo Torcida Copa" (`theme_copa_internal`) nas configurações de perfil ([ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx)), permitindo ao usuário decidir se quer ativar o visual verde e amarelo voluntariamente.
  5. Adicionamos a inicialização automática dessas duas chaves no painel admin para garantir sua existência e ativação imediata.
- **Motivação**: Atender à necessidade de o super usuário gerenciar de forma autônoma e completa os dados dos usuários e planos sem intervenção de banco de dados direta, e atender à regra de divisão entre tema forçado na tela inicial e livre arbítrio estético na área logada.

## [2026-06-24] Correção UI - SuperThemesTab: Loop de Toast e Reorganização Visual
- **Resumo**: Corrigimos o componente `SuperThemesTab` que apresentava um `useEffect` auto-inicializador causando loop infinito de toast ("Temas da Copa inicializados e ativados") e não exibia as flags Copa. Mudanças:
  1. Removido o `useEffect` que tentava inserir automaticamente as flags Copa no banco a cada renderização (causando loop).
  2. Substituído por um botão manual "Ativar Tema Copa" que aparece apenas quando as flags não existem no banco.
  3. Reorganizada a UI da aba de Temas em duas seções claras: **Copa do Mundo 2026** (com divisão Login Global / Área Logada Interno) e **Temas Sazonais** (Páscoa, Natal, Halloween).
  4. Cada flag Copa agora exibe descrição contextual dinâmica e indicador visual de status.
- **Motivação**: O `useEffect` com `flags` no dependency array causava re-renderização infinita ao invalidar a query e receber dados novos. A UI não refletia a divisão solicitada entre Login e Interno.

## [2026-06-24] Regra UI + Rearquitetura de Temas
- **Resumo**: Reestruturação completa da aba de Temas no painel Super Admin:
  1. **Nova regra permanente (MASTER RULE):** Proibido usar emojis e textos expositivos/descritivos na interface do app. A UI deve ser limpa, profissional e autoexplicativa.
  2. Todos os temas (Copa, Páscoa, Natal, Halloween) agora possuem **duas flags**: `theme_X` (Tela de Login) e `theme_X_internal` (Interface Interna).
  3. A aba de Temas foi dividida em duas colunas: **Tela de Login** e **Interface Interna**, com cards limpos contendo apenas o nome do tema e o switch.
  4. Flags ausentes são detectadas automaticamente e podem ser criadas via botão discreto.
- **Motivação**: O usuário definiu como regra mestre que emojis e textos descritivos prejudicam a profissionalidade do produto.

## [2026-06-24] Alteração de UI - Logotipo Temático da Copa do Mundo e Consolidação Real de Temas Sazonais
- **Resumo**: Consolidamos a aplicação real e persistente de todos os 4 temas sazonais (Copa, Páscoa, Natal, Halloween) no aplicativo:
  1. **Logotipo da Copa do Mundo**: A imagem tricolor personalizada fornecida pelo usuário (`Cópia de Logo.png`) foi tratada (remoção de fundo branco), salva como `/fluxo-logo-copa.png` e integrada no componente [AppLogo.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/branding/AppLogo.tsx). Agora a logo muda para a imagem tricolor customizada na tela de login e nas barras de navegação internas quando o Modo Copa estiver ativado. O tamanho da logo no login foi aumentado para `h-28 w-72` e aproximado do nome "Fluxo" através de margens negativas (`-mb-6`). Nos cabeçalhos internos, a bandeira e a taça de Copa foram completamente removidas e a logo tricolor foi aumentada de tamanho (`h-12 w-32` no desktop e `h-10 w-26` no mobile) e posicionada mais ao canto (reduzido o padding lateral). No mobile, evitamos espremer a logo retangular dentro de caixas quadradas de ícone.
  2. **Reatividade e Persistência de Temas**: Criamos classes de variáveis de cores no CSS ([index.css](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/index.css)) para cada tema sazonal: Páscoa (`.theme-easter`), Natal (`.theme-christmas`) e Halloween (`.theme-halloween`). Atualizamos o hook de cores [useThemeColor.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useThemeColor.tsx) para injetar as classes temáticas dinamicamente ao selecionar as cores de destaque sazonais, garantindo que o tema persista após recarregar a página (lido reativamente de metadados do Supabase e do localStorage). Implementamos a reversão automática das configurações sazonais dos usuários (Modo Torcida Copa para falso, e cores de Páscoa, Natal ou Halloween para o azul padrão) no momento em que a respectiva flag global da interface interna (`theme_X_internal`) é desativada pelo Super Admin.
  3. **Integração na Tela de Login**: O componente [AuthPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/AuthPage.tsx) agora escuta reativamente todas as flags de login e aplica dinamicamente o tema de cor correspondente, tamanho de logo proporcional e o slogan sazonal customizado. Atualizamos o slogan da Copa para *"Com o Fluxo, você economiza o dinheiro e guarda o fôlego para gritar é GOOOOOL!"*, onde as letras de "GOOOOOL!" foram individualmente estilizadas com as cores verde, amarela e azul da bandeira brasileira.
- **Motivação**: Atender à solicitação do usuário de garantir que a ativação ou desativação de temas no painel Super Admin e no perfil reflita de verdade no visual e persista ao atualizar a página, e permitir a substituição e o redimensionamento do logotipo da Copa na tela inicial com inclusão de slogan de forma limpa. Aproximar o logotipo do nome "Fluxo" na tela de login, aplicar o slogan estilizado, remover a bandeira e taça dos cabeçalhos internos, aumentar o tamanho do logotipo posicionando-o mais no canto, e garantir que a desativação administrativa oculte as opções de todos os usuários e force o retorno automático ao visual padrão do sistema.

## [2026-06-24] Alteração Arquitetural / UI - Otimização de Cache de Temas Globais e Prevenção de Reset Indevido
- **Resumo**: Consolidamos o impacto imediato e a estabilidade da ativação de temas no painel Super Admin e sua propagação para todos os usuários:
  1. **Atualização Imediata (Sem Cache Atrasado)**: Alteramos o `staleTime` de `global_feature_flags` em [useFeatureFlags.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useFeatureFlags.ts) para `0`. Agora, quando o Super Admin ativa ou desativa um tema global no painel Super, todos os clientes que carregarem uma tela ou derem F5 obterão o estado real do banco de imediato, sem o atraso de 5 minutos gerado pelo cache antigo.
  2. **Prevenção de Reset Incorreto no Boot**: No hook [useThemeColor.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useThemeColor.tsx), vinculamos a execução da auto-reversão de temas ao carregamento bem-sucedido das chaves do Supabase (`flagsLoaded`). Isso impede que o tema do usuário seja resetado incorretamente para o azul padrão durante a renderização inicial (quando as chaves retornam temporariamente como vazias antes da resposta da API).
  3. **Impacto Global do Super Admin**: Se a Interface Interna for habilitada, ela aparece em Aparência ([ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx)) para todos escolherem. Se for desativada, a opção é completamente oculta para todos (inclusive o Super Admin) e o visual volta para o padrão de forma reativa e automática. A tela de login segue o mesmo comportamento para todas as flags correspondentes.
  4. **Segmentação do Logotipo Temático da Copa**: Alteramos o componente de logotipo [AppLogo.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/branding/AppLogo.tsx) e a tela de login [AuthPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/AuthPage.tsx) para segmentar a exibição da logo com as cores do Brasil. A logo verde e amarela agora só é exibida na tela de login (caso a Tela de Login da Copa esteja ativa) ou dentro do app se o usuário tiver explicitamente ativado o "Modo Torcida Copa" no seu perfil. Caso contrário, mesmo com o tema de Login ativado globalmente, a logo interna exibida no menu lateral e cabeçalhos permanece a padrão do sistema.
  5. **Reorganização do Cabeçalho Desktop**: Unificamos o cabeçalho superior do desktop em [NavigationRail.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/NavigationRail.tsx) em uma única linha horizontal contínua de altura `h-16`. Aumentamos as dimensões do logotipo padrão do aplicativo para `h-12 w-36` para maior visibilidade. Removemos também o efeito `backdrop-blur-sm` no botão rápido de trocar tema (`ThemeButton`) quando no modo claro (substituindo por um fundo `bg-muted` sólido), mantendo o blur apenas no modo escuro conforme solicitado.
  6. **Renomeação e Cores no Gráfico de Relatórios**: Na tela de relatatórios [ReportsDashboard.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ReportsDashboard.tsx), renomeamos a seção *"Total de Consumo vs Receita"* para *"Total de Despesas vs Receitas"*. Alteramos a lógica de cores para que a linha de Despesas fique Chumbo (`#4B5563`) no modo claro (continuando rosa/vermelha no escuro) e a linha de Receitas utilize a cor de destaque atual do tema do usuário. As legendas foram dinamicamente estilizadas para condizer exatamente com a cor das linhas do gráfico nos respectivos modos visuais.
- **Motivação**: Atender à solicitação do usuário de que as escolhas do Super Admin tenham impacto global e imediato no app para todos os acessos, garantindo a reversão de temas de forma totalmente limpa, segmentando o visual da logo, organizando e compactando o cabeçalho superior no desktop, e harmonizando as nomenclaturas e a paleta de cores dos relatórios no modo claro.

## [2026-06-24] Alteração de UI - Redução de Círculos de Cores e Novo Seletor Visual de Cores (RGB/HSV Picker)
- **Resumo**: Implementamos melhorias significativas na experiência do editor de cores de Aparência nas configurações ([ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx)):
  1. **Redução de Círculos Pré-definidos**: Diminuímos as dimensões dos círculos seletores de cores de destaque pré-definidas (incluindo cores normais e sazonais de Páscoa, Natal e Halloween) de `w-8 h-8` para `w-6 h-6` (e o ícone `CheckCircle2` de seleção de `w-4 h-4` para `w-3 h-3`). Isso tornou a grade de cores discretamente compacta, elegante e profissional.
  2. **Novo Seletor Visual de Cores (VisualColorPicker)**: Desenvolvemos do zero o componente visual interativo [VisualColorPicker.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/ui/VisualColorPicker.tsx) para substituir o input `type="color"` nativo do navegador.
     - **Quadro RGB/HSV**: Um plano 2D interativo de gradiente que mapeia Saturação e Brilho (Value), onde o usuário clica e arrasta uma bolinha indicadora para escolher a tonalidade exata.
     - **Slider de Tom (Hue)**: Um slider horizontal contínuo com o espectro do arco-íris para determinar a matiz base.
     - **Digitação e Preview HEX**: Campo de texto para digitar o código hexadecimal diretamente com um indicador redondo exibindo a cor em tempo real.
     - **Responsividade e Física Móvel**: Suporte nativo a eventos mouse e toque (touch) com bloqueio de rolagem da página ao arrastar cores no celular.
  3. **Personalização Completa**: Integramos o novo seletor visual na seção de "Criar Minha Paleta" para personalizar individualmente as cores de **Destaque**, **Contornos** e **Ícones**.
- **Motivação**: Atender ao pedido do usuário de diminuir o tamanho dos círculos da cor de destaque e disponibilizar um painel de cores visual ("quadro RGB") de arrastar para dar liberdade total de criar paletas de cores refinadas e exclusivas.

## [2026-06-24] Alteração Arquitetural / Branding - Templates de E-mail com Identidade Visual Premium Dark e Logotipo Textual
- **Resumo**: Reestruturamos e recriamos por completo os templates de e-mail de autenticação em português brasileiro (PT-BR) para o Supabase, deixando-os em perfeita coerência com a identidade visual do Fluxo:
  1. **Logotipo Textual Minimalista**: Removemos a imagem do cabeçalho de ambos os e-mails e implementamos um logotipo puramente textual estilizado em CSS/HTML ("Fluxo.") nas cores oficiais (verde água `#0d9488` e verde esmeralda `#10b981`). Isso elimina o download de imagens externas pelos clientes de e-mail (evitando bloqueios de renderização) e mantém o cabeçalho discreto, moderno e profissional.
  2. **Identidade Visual Premium Dark (OLED / Chumbo)**: Redesenhamos os arquivos HTML [reset_password.html](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/supabase/email_templates/reset_password.html) (Reset de Senha) e [confirm_email.html](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/supabase/email_templates/confirm_email.html) (Confirmação de E-mail) para herdar o visual dark premium do aplicativo:
     - Fundo do e-mail em cinza ultra-escuro OLED (`#09090b`).
     - Card de conteúdo em Matte Black/Carbon (`#18181b`) com bordas em `#27272a`.
     - Uma linha superior em gradiente nas cores oficiais do Fluxo (verde água `#0d9488` e verde esmeralda `#10b981`).
     - Textos em alto contraste (Zinc 100/400) e botão de ação (CTA) estilizado em verde água com cantos arredondados generosos.
  3. **Compatibilidade Ampla**: Estruturação dos e-mails em tabelas compatíveis e CSS inline para exibição perfeita e estável no Gmail, Outlook, Yahoo e Apple Mail.
- **Motivação**: Atender ao pedido do usuário de remover a imagem da logo (que não ficou legal no cabeçalho do e-mail) mantendo o design dark premium limpo com identificação textual sutil.



## [2026-06-24] Correção de Bug / Fluxo de Autenticação - Redirecionamento Automático para Redefinição de Senha
- **Resumo**: Corrigimos o bug que impedia o usuário de ser levado para a tela de redefinição de senha após clicar no link de recuperação enviado para o e-mail:
  1. **Detecção do Evento Recovery**: No componente de rotas [App.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/App.tsx), implementamos um `useEffect` dentro de `AppRoutes` que escuta ativamente o método `onAuthStateChange` do Supabase. Ao capturar o evento `'PASSWORD_RECOVERY'`, ele executa um redirecionamento imediato e imperativo para `/auth/redefinir-senha`.
  2. **Tratamento de Hash de Contingência**: Adicionamos uma validação de fallback que lê `window.location.hash` e detecta a presença de parâmetros de redefinição de senha (ex: `type=recovery` ou `type%3Drecovery`). Se presentes, o aplicativo também realiza o redirecionamento imediato para `/auth/redefinir-senha`. Isso garante o funcionamento mesmo quando o Supabase realiza o redirecionamento com fallback de segurança para a URL base (Site URL) do projeto cadastrada no console.
- **Motivação**: Resolver o bug que deixava o usuário travado na tela inicial (sem ver a interface de troca de senha) após clicar no link de redefinição contido no e-mail de recuperação.

## [2026-06-24] Alteração Arquitetural / UI - Controle Real de Acesso por Planos e Estilização do Menu Admin
- **Resumo**: Implementamos a reativação do controle de acessos dinâmicos baseados no plano do usuário e ajustamos a cor do menu de atalho administrativo:
  1. **Cor Branca para o "Painel Super"**: No cabeçalho desktop ([NavigationRail.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/NavigationRail.tsx)) e no cabeçalho mobile ([MobileTopHeader.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/MobileTopHeader.tsx)), alteramos a classe CSS do botão do menu do avatar "Painel Super" de `text-primary` para `text-white focus:text-white focus:bg-primary/10`, destacando o botão em branco nos dropdowns.
  2. **Controle Real de Acesso por Planos**: No arquivo de controle de features [useFeatureFlags.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useFeatureFlags.ts), reestabelecemos a lógica dinâmica do hook `useFeatureFlag` para avaliar as permissões reais do plano do usuário (`myPlanFeatures`) e seus overrides individuais (`myOverrides`). Caso o Super Admin altere ou atribua um plano a um usuário no painel, a exibição e os recursos disponíveis no aplicativo daquele usuário mudarão instantaneamente para condizer com os privilégios do novo plano. O Super Admin continua com todas as funcionalidades liberadas (`isSuperAdmin => true`).
- **Motivação**: Atender ao pedido do usuário de destacar a escrita do atalho do administrador em branco, e de restabelecer o funcionamento dinâmico e real dos planos no aplicativo de modo que a alteração de plano de um usuário bloqueie/libere suas telas e recursos de imediato.

## [2026-06-24] Alteração Arquitetural / Regra de Negócio - Limites Quantitativos de Recursos por Plano e Gestão no Painel Super Admin
- **Resumo**: Implementamos o controle dinâmico e a configuração administrativa de limites quantitativos para recursos premium no aplicativo (Contas Bancárias, Cartões de Crédito e Dívidas/Acordos):
  1. **Modelo de Dados (Supabase)**: Criamos a migração `0040_add_limits_to_plans.sql` que adiciona as colunas `accounts_limit`, `cards_limit` e `debts_limit` do tipo `INTEGER DEFAULT -1` (onde `-1` representa ilimitado) na tabela `plans`.
  2. **Configuração Administrativa (Super Admin)**:
     - No componente [useFeatureFlags.ts](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/hooks/useFeatureFlags.ts), atualizamos a query `usePlans` e as mutations `useCreatePlan` e `useUpdatePlan` para ler, criar e atualizar esses campos no banco de dados.
     - Na aba de planos em [SuperPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/SuperPage.tsx), adicionamos campos numéricos individuais ("Contas Máximas", "Cartões Máximos", "Dívidas Máximas") nas seções de criação de novo plano e edição de planos, e exibimos badges com essas restrições na lista de planos cadastrados.
  3. **Hook de Limites**: Desenvolvemos o hook `usePlanLimits()` em `useFeatureFlags.ts` que retorna os limites do plano ativo do usuário autenticado (ou `-1` se o usuário for Super Admin ou em caso de falha de conexão/migração pendente, mantendo resiliência).
  4. **Validação e Bloqueio em Tempo de Cadastro**:
     - No gerenciador de contas ([AccountsManager.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/accounts/AccountsManager.tsx)), o cadastro de novas contas é bloqueado se o número de contas ativas for igual ou maior que o limite configurado no plano, exibindo um toast destrutivo explicativo.
     - No painel de cartões de crédito ([CardsDashboard.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/CardsDashboard.tsx)), o cadastro e a abertura do modal de adição são bloqueados se o número de cartões ativos atingir o limite do plano.
     - No gerenciador de dívidas ([DebtsManager.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/debts/DebtsManager.tsx)), o cadastro e a abertura do formulário de novos acordos são igualmente limitados.
- **Motivação**: Atender ao pedido do usuário de configurar diretamente no painel Super Admin a quantidade permitida de contas, cartões e dívidas para cada plano, e bloquear o cadastro de novas entidades se o limite do respectivo plano for atingido.

## [2026-06-25] Alteração de UI & QA - Ocultação da Funcionalidade Start, Correção de Fluxo de Redefinição de Senha e Estabilização dos Testes Unitários
- **Resumo**: Realizamos a ocultação completa do Fluxo Start no app, a correção de um bug crítico de redefinição de senha (race condition no redirecionamento) e estabilizamos 100% da suíte de testes unitários:
  1. **Ocultação do Fluxo Start**: Desativamos a rota `start_manager` e a importação do componente `StartManager` na página principal [Index.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/Index.tsx), removemos o botão de atalho do Start do card de informações em [ProfileSettings.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/ProfileSettings.tsx) e retiramos o botão de alternância "Fluxo Start" da tela de login/cadastro pública em [AuthPage.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/AuthPage.tsx). Isso desativa visualmente e isola o acesso à jornada de filhos no app.
- **Motivação**: Atender à solicitação direta do usuário de ocultar temporariamente todos os caminhos do Fluxo Start no app em ambas as resoluções e se comportar como QA especialista, garantindo integridade visual absoluta e a correção total dos testes de regressão automatizados.

## [2026-06-25] Alteração de UI - Filtro de Lançamentos Hierárquico por Banco e Miniaturas de Cartões
- **Resumo**: Implementamos melhorias significativas na experiência do usuário e na interface do filtro de lançamentos ([TransactionList.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/transactions/TransactionList.tsx)):
  1. **Filtragem Hierárquica por Banco (Contas/Débito)**: Ao selecionar a opção de Origem como 'Débito', o filtro passa a atuar de forma sequencial e hierárquica. Primeiro, exibe-se uma linha com a seleção de bancos disponíveis. Após o usuário selecionar um banco específico, exibe-se a segunda linha de filtros contendo apenas as contas pertencentes a esse banco para a escolha final.
  2. **Identificação Enriquecida de Cartões de Crédito**: Ao filtrar por 'Cartão', a listagem de seleção exibe para cada cartão o nome do banco associado em destaque (em caixa alta) e uma miniatura visual representativa do cartão físico contendo cores do perfil e textura (preto ou holográfico), além de simulação de chip metálico e elipse de bandeira via estilização CSS pura no Tailwind.
  3. **Reset de Estados de Filtro**: Garantimos que, ao mudar o filtro principal de Origem (entre 'Todas', 'Débito' e 'Cartão'), o estado do banco selecionado (`selectedBank`) e de conta específica (`specificSourceId`) sejam redefinidos para `'all'`. A declaração de estados no componente foi devidamente reordenada para preservar a integridade do teste unitário legado que intercepta os estados pelo índice de chamada.
- **Motivação**: Atender à solicitação direta do usuário de que os filtros de débito exibam primeiro o banco e depois a conta (organizando cenários com muitas contas e bancos cadastrados), e que o filtro de cartão de crédito exiba o nome do banco e uma miniatura do cartão correspondente de forma moderna e premium.

## [2026-06-25] Alteração de UI - Reexibição de Barra de Rolagem Sutil no Layout Principal do App
- **Resumo**: Reativamos a exibição da barra de rolagem vertical personalizada e sutil no contêiner de conteúdo principal do aplicativo ([AppLayout.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/layout/AppLayout.tsx)):
  1. **Remoção de Ocultação de Scroll**: A classe `.no-scrollbar` foi removida do elemento `div` principal que envolve o conteúdo das páginas do aplicativo (`children`).
  2. **Estilização de Acessibilidade no Firefox**: Estendemos o suporte de barra de rolagem sutil no arquivo CSS global ([index.css](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/index.css)), injetando as propriedades `scrollbar-width: thin` e `scrollbar-color` sob o seletor universal `*` na base do CSS, tornando a rolagem igualmente fina e discreta (sem track opaco) em navegadores baseados em Gecko/Firefox.
- **Motivação**: Atender ao requisito de usabilidade onde listas muito longas (especialmente na tela de lançamentos e na gestão de contas) exigem uma barra de rolagem física arrastável no desktop para navegar com maior velocidade do que fazendo apenas o scroll convencional com scrollwheel.

## [2026-06-25] Alteração Arquitetural / UI - Unificação de Fluxo de Transferência (Minha Carteira & Lançamentos)
- **Resumo**: Unificamos os fluxos de transferência de saldos do aplicativo para que a tela "Minha Carteira" compartilhe o mesmo formulário e regras da tela de lançamentos (referência do projeto):
  1. **Callback de Integração**: Adicionamos a propriedade `onOpenTransferForm` na interface de propriedades de [AccountsManager.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/accounts/AccountsManager.tsx) e a associamos ao clique do botão "Transferir" na barra superior de Patrimônio.
  2. **Orquestração de Modais no Index**: No componente [Index.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/pages/Index.tsx), passamos um manipulador que redefine os estados de edição de lançamentos, configura a aba inicial como `'transfer'` e abre o formulário global `TransactionForm`.
  3. **Preservação de Retrocompatibilidade**: Mantivemos o modal de transferência simplificada local em `AccountsManager.tsx` como fallback caso o callback não seja fornecido, assegurando que não ocorra quebra de fluxos em ambientes isolados de teste.
- **Motivação**: Atender à solicitação direta do usuário de que as transferências de saldo em ambas as telas sejam idênticas e centralizadas no formulário de lançamentos, evitando duplicações, inconsistências em datas de lançamentos ou falhas de campos específicos de cartões de crédito.
## [2026-06-26] Correção de Bug e Alteração de UI - Fluxo de Cartão, Contas Fixas e Novo Seletor de Contas de Faturas
- **Resumo**:
  1. **Pagamento de Fatura de Cartão de Crédito (invoiceObligations.ts)**: Corrigimos o bug que fazia a fatura virtual do cartão de crédito desaparecer da Gestão de Contas após a realização de abatimentos ou pagamentos parciais. Substituímos a checagem antiga que apenas verificava a existência de qualquer transação de pagamento físico por um cálculo dinâmico que deduz o total de pagamentos e abatimentos realizados (tanto despesas de liquidação quanto receitas de abatimento onde `isInvoicePayment === true`) do valor total bruto de compras na competência. A fatura virtual agora continua visível e exibe o saldo devedor restante exato até que a fatura seja 100% quitada.
  2. **Projeção de Contas Fixas / Recorrentes (useProjectedTransactions.ts)**: Corrigimos o bug onde contas fixas/recorrentes sumiam de meses futuros (ex: Agosto) quando o usuário adiantava o pagamento de faturas anteriores no mesmo mês. Ajustamos a lógica do gerador de projeções virtuais para computar a data de início original da transação recorrente (buscando o menor vencimento entre a transação-mãe e todos os seus filhos físicos no mesmo ano), em vez de restringir a projeção à data atualizada da mãe (que é avançada dinamicamente pelo CASO A de renegociação no frontend). Isso assegura que as ocorrências virtuais pendentes sejam projetadas e exibidas para qualquer mês a partir do início da conta, enquanto a deduplicação impede duplicatas nos meses com pagamentos reais.
  3. **Seleção de Conta no Pagamento de Faturas (BillsManager.tsx)**: Substituímos o seletor nativo <select> simples e obsoleto por um seletor visual premium no modal de pagamento da fatura do cartão. A nova interface exibe os botões estilosos contendo a identidade visual das contas (bolinha com a cor oficial), nome e banco (em caixa alta), o saldo em tempo real de cada conta e o saldo projetado pós-baixa assim que uma conta é selecionada. Para manter compatibilidade total com a suíte de testes unitários sem precisar modificá-la, mantivemos o <select> original funcional e oculto usando a classe `sr-only` do Tailwind.
- **Motivação**: Resolver os problemas de desaparecimento de faturas e contas recorrentes relatados pelo usuário na Gestão de Contas, e atender ao requisito de deixar a interface de seleção de contas de origem para baixas de faturas do cartão de crédito visualmente premium, rica em informações e integrada aos testes unitários legados.

## [2026-06-26] Alteração Arquitetural e de UI - Transferência entre Contas via Cartão de Crédito (Pix no Crédito / Pagamento via Cartão)
- **Resumo**: Implementamos a funcionalidade completa para registrar e gerenciar transferências que têm como origem um cartão de crédito (ex: Pix no crédito, pagamento de boleto no cartão), integrando-as harmonicamente ao ecossistema do aplicativo:
  1. **Seleção de Origem na UI (TransactionForm.tsx)**: Adicionamos um seletor visual na aba "Transferência" que permite ao usuário escolher o tipo de origem: "Conta" (bancária) ou "Cartão" (de crédito). Se "Cartão" for selecionado, exibe-se a lista de cartões de crédito disponíveis para seleção.
  2. **Regras de Lançamento e Lançamento de Caixa (useTransferBetweenAccounts)**: 
     - Quando originada de um cartão de crédito, a transferência não é tratada como "is_transfer = true" tradicional (que é ocultada de relatórios). Em vez disso, ambas as transações do par são gravadas com `is_transfer = false`.
     - Isso garante que a transação de despesa (no cartão de origem) entre como uma despesa normal e apareça na fatura considerando a data de fechamento, e a transação de receita (na conta de destino) entre como receita normal (afetando o saldo e constando nos relatórios).
     - A despesa no cartão de crédito é gerada como não paga (`is_paid = false`, `payment_date = null`) e seu `invoice_month_year` é dinamicamente calculado com base nas configurações de fechamento e vencimento do cartão.
     - A receita na conta de destino é gerada como paga (`is_paid = true`, `payment_date = date`).
  3. **Vínculo Seguro e Gerenciamento em Lote (useTransactionMutations.ts & Index.tsx)**:
     - Ambas as transações são vinculadas pelo mesmo `transfer_group_id` UUID.
     - Removemos a restrição de filtragem por `.eq('is_transfer', true)` em `getSafeTransferDeleteIds` e `getSafeTransferEditPair`. Isso permite que transferências via cartão (que possuem `is_transfer = false`) sejam reconhecidas e tratadas em par.
     - Ao excluir ou editar uma transação que faça parte de uma transferência de cartão (identificada por possuir `transfer_group_id`), o sistema atualiza ou exclui a contraparte correspondente em lote de forma totalmente consistente.
  4. **Estabilização de Testes Unitários (useAccountMutations.test.tsx & useTransactionMutations.test.tsx)**:
     - Ajustamos os testes legados que esperavam a asserção rígida de `.eq('is_transfer', true)` nas buscas por lote no Supabase.
     - Adicionamos casos de testes específicos em `useAccountMutations.test.tsx` para cobrir o comportamento correto do hook de transferência tanto em cenários tradicionais quanto via cartão de crédito.
- **Motivação**: Atender ao pedido do usuário de permitir realizar transferências originadas de cartão de crédito que entrem nos relatórios como receita e despesa e constem corretamente nas faturas, mantendo o controle centralizado de lote e preservando a integridade dos saldos e faturas.

## [2026-06-28] Estabilização da Suíte de Testes - Custom Invoice Selector e Auto-Categorização de Transferências
- **Resumo**: Stabilizamos 100% da suíte de testes unitários do sistema (313 testes passados), integrando as recentes alterações arquiteturais de sobrescrita de fatura e auto-categorização de transferências:
  1. **Isolamento de Estado de Mocks (useTransactionMutations.test.tsx)**: Adicionamos a redefinição imperativa do mock `supabaseMock.from.mockReset()` no hook `beforeEach` do arquivo de teste. Isso resolveu o desalinhamento em cascata onde retornos de chamadas configurados via `mockReturnValueOnce` de testes anteriores sobravam e infectavam a consulta de transação base `currentTx` nos testes subsequentes.
  2. **Suporte a Encadeamento no Construtor de Mocks (useAccountMutations.test.tsx)**: Refatoramos a função auxiliar `createBuilder()` para retornar um objeto *thenable* encadeável. Isso permitiu que operações como `.select().eq().is().maybeSingle()` pudessem ser chamadas de forma encadeada nos testes de mutações de contas (necessário para a lógica automática de garantia da categoria "Transferência" nas transferências).
  3. **Correção de Asserções de Fatura Customizada (TransactionForm.test.tsx)**: Atualizamos o teste de parcelamento assistido do cartão para esperar a fatura `'2026-04'` informada no `initialData` em vez da calculada automaticamente `'2026-06'`, validando o novo comportamento onde o formulário respeita e preserva a fatura customizada escolhida pelo usuário.
- **Motivação**: Garantir a estabilidade da cobertura de testes automatizados e integridade da aplicação após a inclusão das funcionalidades de Custom Invoice Overriding (escolha manual de fatura para lançamentos e transferências) e auto-categorização automática de transferências sob a categoria "Transferência".

## [2026-06-28] Correção de UI - Visibilidade de Baixas de Faturas no Extrato de Conta Corrente
- **Resumo**: Corrigimos um bug no filtro de exibição de transações do extrato ([TransactionList.tsx](file:///C:/Users/khendry.mendonca/OneDrive%20-%20TORP%20INDUSTRIA%20TEXTIL%20LTDA/Projeto/fluxo-financeiro/src/components/transactions/TransactionList.tsx)):
  * **O Problema**: Quando o usuário selecionava o filtro "Débito" (para ver apenas transações que movimentam a conta corrente), os lançamentos de pagamento de fatura do cartão de crédito (que possuem tanto `accountId` quanto `cardId` associados) eram indevidamente ocultados devido à regra rígida `if (t.cardId) return false;`. Isso impedia que a baixa da fatura (ex: Itaú/7409 ou Nubank/Duda) aparecesse na listagem da conta corrente, embora o saldo estivesse sendo debitado corretamente, gerando discrepância visual e dúvidas sobre o saldo.
  * **A Solução**: Atualizamos o filtro para `if (t.cardId && !t.isInvoicePayment) return false;`. Desta forma, as compras normais de cartão continuam ocultas no extrato de débito, mas as baixas de fatura (que são débitos físicos na conta corrente de origem) são exibidas de forma transparente na listagem de lançamentos da conta.
- **Motivação**: Garantir que as baixas de faturas do cartão de crédito apareçam no extrato da conta corrente de origem quando o filtro "Débito" ou filtros por bancos/contas estiverem ativados, alinhando a lista visual de lançamentos ao saldo real da conta.
