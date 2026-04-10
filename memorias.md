Memórias e Decisões de Arquitetura - Fluxo
Este documento serve como a fonte da verdade para decisões de UI/UX, regras de negócio e correções de bugs críticos. ASSISTENTE DE IA: Leia este arquivo antes de sugerir refatorações estruturais ou criar novas telas.

1. Padrões de UI/UX e Design System
Bifurcação Web vs Mobile (Cartões): O layout não deve ser unificado.

Mobile: Usa um carrossel horizontal (snap-mandatory), com o cartão centralizado (aprox. 300px), sem ocupar a largura total da tela. Atualização de dados via swipe-to-update (sincronizado no scroll).

Web (Desktop): Usa arquitetura Master-Detail (Grid 12 colunas). Cartões empilhados em lista na esquerda (col-span-4), e detalhes completos na direita (col-span-8).

Luxo Silencioso (Cores e Dark Mode): Proibido o uso de cores 'Neon' chapadas na versão Web. Textos de valores usam tons suaves (rose-400, emerald-400). Proibido usar 'glow' ou fundos coloridos (ex: verde neon) para indicar itens ativos. O foco de itens ativos no mobile é feito exclusivamente por opacity e scale.

Dashboard Web: Hierarquia rígida. Últimos lançamentos ocupam mais espaço que o gráfico de distribuição (que deve ser contido/esmagado). Valores financeiros nunca devem ser truncados (uso de text-2xl no máximo e formatação inteligente para valores acima de 100k).

2. Regras de Negócio de Cartões de Crédito
Privacidade Absoluta: Os cartões NÃO devem exibir números fictícios (como '0000 0000...'). O design é focado apenas no Banco, Bandeira, Limite e Apelido do Cartão centralizado em destaque.

Texturas Premium: Cartões suportam acabamentos visuais (texture: solid, black) aplicados via CSS (mix-blend-mode e gradientes) sobre a cor base.

3. Navegação Mobile Customizável
Menu Orbital Semicircular (FAB): Substitui a barra linear inferior. Utiliza geometria de arco superior (160° a 20°), mantendo os itens sempre visíveis na área útil da tela. Ícone gatilho unificado (LayoutGrid) com indicador de status. Design baseado em glassmorphism dark e animações de escala com stagger.

Botão Home Estratégico: Retorno à Dashboard via botão fixo no Header Mobile (visível em todas as telas exceto Home).

Menu Lateral (Drawer): Fonte da verdade absoluta de navegação, contendo todas as rotas do app.

4. Motor de Lançamentos e Projeções
Segregação de Responsabilidades (Pagamentos): A tela de 'Lançamentos' funciona apenas como um Extrato (Read-only para status). É estritamente proibido dar baixa (pagar) em contas fixas ou projeções por esta tela. A alteração do status isPaid de contas recorrentes/parceladas é exclusividade da tela 'Gestão de Contas'.

Mapeamento DTO e Timezone: Conversão rigorosa de camelCase para snake_case no envio ao Supabase (ex: isRecurring → is_recurring, subcategoryId → subcategory_id). Uso obrigatório de parseLocalDate() em vez de new Date() para evitar bugs de fuso horário (UTC-3) que deslocam transações de mês.

Projeção Cíclica: A query principal de transações deve sempre usar um .or() para buscar transações do mês atual OU transações com is_recurring = true OU parcelamentos (installment_group_id), garantindo que o useProjectedTransactions tenha dados do passado para projetar as contas pendentes nos meses futuros.

Deduplicação de Projeções — REGRA CRÍTICA: A deduplicação no useProjectedTransactions deve usar exclusivamente vínculos explícitos de ID (originalId ou id). É proibido usar comparação por description + Math.abs(amount) como critério de deduplicação — isso causa falsos positivos que bloqueiam projeções legítimas de transações com mesma descrição e valor em meses diferentes.

ts
// ✅ CORRETO
const hasRealEquivalent = realTransactions.some(real =>
  real.originalId === tx.id ||
  real.id === tx.id
);

// ❌ PROIBIDO — causa falsos positivos
// real.description === tx.description && Math.abs(real.amount) === Math.abs(tx.amount)
Query de Transações — Filtro de Data nas Recorrentes: O `.filter('date', 'lte', end)` não deve ser aplicado globalmente. Transações com `is_recurring = true` e parcelamentos (`installment_group_id`) não têm teto de data — o filtro de período se aplica apenas a transações pontuais via `and(date.gte.${start},date.lte.${end})` dentro do `.or()`. Aplicar o `.filter` globalmente corta os dados históricos que o `useProjectedTransactions` precisa para gerar projeções de meses futuros.

ts
supabase
  .from('transactions')
  .select('*')
  .is('deleted_at', null)
  .or(
    `and(date.gte.${start},date.lte.${end}),` +          // pontuais do mês
    `is_recurring.eq.true,` +                             // fixas: SEM filtro de data
    `installment_group_id.not.is.null`                    // parceladas: sem filtro de data
  )
Exclusão de Transações — Soft Delete Obrigatório: Transações nunca devem ser deletadas com .delete() direto. O padrão é soft delete via .update({ deleted_at: now }). O escopo da exclusão (this / future / all) determina o filtro adicional:

'this' → .eq('id', id)

'future' → .eq('installment_group_id', groupId).gte('date', date)

'all' → .eq('installment_group_id', groupId)

Cache Otimista Escopo-Aware (onMutate): O onMutate do useDeleteTransaction (e de qualquer mutation com applyScope) deve filtrar o cache local respeitando o escopo, não apenas pelo id da transação clicada. Isso garante que a UI reaja instantaneamente sem depender do invalidateQueries.

ts
// Padrão obrigatório no onMutate de operações com applyScope:
return oldData.filter((tx) => {
  if (applyScope === 'this' || !installmentGroupId) return tx.id !== id;
  if (applyScope === 'all') return tx.installmentGroupId !== installmentGroupId;
  if (applyScope === 'future') return tx.installmentGroupId !== installmentGroupId || tx.date < date;
  return true;
});
⚠️ O mesmo padrão deve ser aplicado no onMutate do useUpdateTransaction quando ele suportar applyScope.

Payload do TransactionForm — Regras de Envio:

subcategoryId deve ser enviado como null quando vazio, nunca como string vazia (''): subcategoryId: subcategoryId || null

isRecurring deve ser sempre um booleano derivado da activeTab, nunca de estado intermediário: isRecurring: Boolean(activeTab === 'fixo' || activeTab === 'renda_fixa')

Nunca incluir chaves duplicadas no objeto payload — TypeScript ignora duplicatas silenciosamente, mas é fonte de confusão e bugs.

Regra do Extrato vs Gestão de Contas:
Transações Recorrentes (Fixas) e Parcelamentos só devem ser visíveis na tela de 'Lançamentos' (Extrato) após serem marcadas como pagas (`isPaid: true`). Enquanto pendentes, elas residem exclusivamente na 'Gestão de Contas'. Isso evita poluição visual no extrato com itens que ainda não afetaram o saldo real.

Gestão de Contas — Inclusão de Atrasados:
A tela de 'Gestão de Contas' deve obrigatoriamente incluir todos os lançamentos pendentes de meses anteriores (`isBefore(date, startOfMonth(viewDate)) && !isPaid`). Isso garante que o usuário visualize dívidas acumuladas que ainda precisam de atenção.

### Contas Fixas — Forma de Pagamento
Contas fixas (is_recurring: true) NÃO possuem vínculo de pagamento no cadastro. account_id e card_id são sempre null al criar.
A forma de pagamento (débito em conta ou cartão) é escolhida exclusivamente no ato da baixa pelo BillsManager.
Isso permite que uma mesma conta fixa (ex: internet) seja paga no débito em um mês e no crédito em outro.

### Baixa de Conta Fixa no Cartão — invoiceMonthYear
Quando uma conta fixa é paga via cartão de crédito no BillsManager, o sistema calcula automaticamente em qual fatura o valor entra:
- Se dia_pagamento <= closing_day do cartão → fatura do mês atual
- Se dia_pagamento > closing_day do cartão → fatura do mês seguinte

Isso consome o limite do cartão no mês correto via getCardUsedLimit (que já filtra por invoiceMonthYear). Nunca definir invoice_month_year manualmente fora dessa lógica.

### Controle de Versão (Build)
Convenção Alfabética Cíclica: Todas as atualizações de build devem conter uma letra do alfabeto ao final do código da versão (ex: 3007082612K). A sequência segue de A a Z e reinicia em A (A -> B -> ... -> Z -> A). Isso permite o controle visual imediato da build ativa no dispositivo do usuário.

### Proteção de Integridade — Extrato (Lançamentos)
Lançamentos originados na Gestão de Contas (recorrentes, parcelados, pagamentos de fatura ou materializados) são protegidos na aba 'Lançamentos'.
- Cópia e Edição: Proibidas para estes itens nesta tela.
- Ação Permitida: Apenas o "Estorno" (Desfazer Pagamento) é permitido.
- Motivo: Garantir que a lógica de recorrência e competência de faturas não seja quebrada por edições manuais isoladas no extrato.

### Cálculo de Limite Global de Cartão — Solução de Inconsistência
- **Regra de Ouro:** Compras no cartão (avulsas ou parcelas) sempre nascem com `is_paid = false`. O status só muda para `true` quando a **FATURA** inteira (ou parte dela) é quitada no BillsManager.
- **Cálculo:** `getCardUsedLimit` utiliza `rawTransactions` para varrer todo o histórico. Ele ignora transações onde `is_invoice_payment: true` para evitar bitributação do limite.
- **Disponível vs Gastos:** No painel de detalhes, "Gastos" refere-se à fatura do mês, enquanto "Disponível" refere-se ao limite real do cartão (global).

### Pagamento de Fatura do Cartão
- Fatura sempre paga via CONTA BANCÁRIA — nunca com outro cartão.
- Pagamento parcial: cria transação de saldo remanescente (transaction_type: 'invoice_remainder') na fatura do mês seguinte com is_paid: false. As compras originais NÃO são marcadas como pagas em pagamento parcial.
- Pagamento total: todas as compras do mês são marcadas is_paid: true via bulk update.


5. Histórico de Mudanças Críticas
Data	Arquivo	Mudança
31/03/2026	useProjectedTransactions.ts	Refatoração do motor de projeções. Query .or() encadeada para suporte a projeções cíclicas sem duplicidade.
31/03/2026	TransactionForm.tsx	Padronização rigorosa do DTO (is_recurring, subcategory_id: null, toISOString). Remoção de chave isRecurring duplicada. Blindagem contra edição estrutural de projeções virtuais.
31/03/2026	useProjectedTransactions.ts	Deduplicação refatorada para usar apenas vínculos explícitos de ID (originalId / id). Removida comparação por description + amount que causava falsos positivos.
31/03/2026	useDeleteTransaction.ts	onMutate refatorado para ser escopo-aware. Cache local agora reflete corretamente applyScope: 'this' / 'all' / 'future' de forma instantânea.
31/03/2026	useFinanceQueries.ts	Removido .filter('date', 'lte', end) global. Filtro de data movido para dentro do .or() afetando apenas transações pontuais. Raiz do bug de projeções em branco em meses futuros.
31/03/2026	TransactionList.tsx	Implementada regra de visibilidade: recorrentes e parcelamentos pendentes são ocultados do extrato até que o pagamento seja confirmado.
31/03/2026	BillsManager.tsx    Refatorado filtro principal para incluir lançamentos atrasados (meses anteriores não pagos) de forma automática.
31/03/2026	CardsDashboard.tsx  Reconstrução total da página de cartões com layout Master-Detail (Desktop) e Snap-Carousel (Mobile). Integração com Recharts para visualização de evolução de gastos.
31/03/2026	tailwind.config.ts  Adicionado plugin utilitário `.no-scrollbar` para refinamento estético de containers roláveis.
31/03/2026	CardsDashboard.tsx	Refinamento estético das barras de limite (progressColor dinâmica suportada no banco de dados), agrupamento no Hero da fatura e atenuamento da escala de foco (uso de shadow-lg em vez de box rings) alinhado ao princípio do Luxo Silencioso.
31/03/2026	CategoriesManager.tsx	Refatoração estrutural (CSS Grid responsivo de 3 colunas separando Receitas/Objetivos) e limpa visual completa extirpando excessos de cores (bordas grossas e ícones saturados), optando por superfícies neutras em tons de zinco.
31/03/2026	CardsDashboard.tsx	Tema Claro suportado dinamicamente no Dashboard (substituição de fundos AMOLED hardcoded #111118) e substituição de ring lines pelo Efeito Apple no foco (shadow-2xl, scale).
31/03/2026	EditCardDialog.tsx	Corrigido Exception de banco de dados (HTTP 400) via expurgo de chave não tabulada 'history' do payload.
31/03/2026	CardsDashboard.tsx	Correção de Shadow Clipping no Master-Detail alterando para overflow-x-visible + margens laterais. Seletor de meses convertido para background reativo do tema (bg-card).
31/03/2026	App.tsx	Otimização radical de tráfego de API desabilitando o refetchOnWindowFocus do ReactQuery, impedindo Loop Infinito e Exception 429 via Supabase de usuários ociosos.
31/03/2026	cardTextures.ts	Refinamento material de Blend Modes e Texturas Premium (migração de color-dodge para composições balanceadas overlay, soft-light e multiply) + adição global de Animação Holográfica contínua.
31/03/2026	Dashboard (Componentes)	As listas RecentTransactions e PendingPayments tiveram sua lógica de getSourceLabel expandida. Injeção de tipografia analítica do formato 'Banco - Apelido' junto ao fallback nativo.
31/03/2026	CreditCardVisual.tsx	Implementada ramificação condicional 'overrideColor' atrelada ao repositório CARD_TEXTURES. A engine domina a renderização estrita base em texturas opacas (ex: Metálico) anulando camadas children transparentes (otimização de render e bugfix de overlays sobrepostos).
31/03/2026	CardsDashboard.tsx / CreditCardVisual.tsx	Refatorada a engine geométrica de iluminação do seletor mobile de cartões. Substituído o filter: 'drop-shadow' vulnerável à stacking context pelos injetores reativos de 'boxShadow' CSS strict. Removida a barreira de clip do container do CardsDashboard injetando 'overflowX: auto' e 'overflowY: visible' mitigando o shadow-clipping para o snap.
31/03/2026	CardsDashboard.tsx	Implementação de UseMemo (sortedCards) para ordenação lexográfica estável (localeCompare via ID) de instâncias React. Preveniu repaginação em tela e flickering de cartões durante invalidações de cache transitórias vindas de useMutations do TanStack.
31/03/2026	cardTextures.ts	Alterada Flag overrideColor do modo 'Metálico' de true para false, devolvendo a cor original a cartões de banco institucionais em exibição React. A Textura passa a entregar iluminação (verniz rgba com mix-blend) em vez de coloração primária base sólida.
31/03/2026	Limpeza Estética Universal	Remoção completa de texturas satélites ('holographic', 'metallic', 'comic') de 'cardTextures.ts' e 'finance.ts'. Estabelecido novo padrão minimalista: fundos de cartão translúcidos (hex 18-08 limit color) e UI silenciada em CategoriesManager (destituição de borders e bg coloridos de containers pro background raw 'bg-card' e botões flat muted).
31/03/2026	10-Point Mega Refactor	Implementação de bloqueios Lazy Load (try/catch) no LocalStorage para os reducers de UX `useFinanceStore` e `useEmergencyFund`, imunizando falhas de quota em Navegador Privado.
31/03/2026	useProjectedTransactions.ts	Extensão lógica da engine para suportar Projeção Cíclica Infinita de parcelamentos reais do banco. Faturas parceladas contínuas espelham instâncias virtuais até o deadline caso não existam fixas reais detectadas.
31/03/2026	useTransactionMutations.ts	Estorno de Acordos delegado p/ Supabase e Mutação Mestra robustecida: o `useUpdateTransaction` agora entrega ApplyScope reativo no Frontend aplicando Cache Otimista p/ UX instantânea em repetições ('future' e 'all'). Redundâncias de payload SnakeCase debeladas.
31/03/2026	User Interface / UX	Layout `MobileNav.tsx` deletado + CSS do Vite nativo purgado. Cartões Mobile `CardsDashboard.tsx` recodificados para deslize horizontal via Intersection matemática fluida. Correção global na `BillsManager` inibindo despesas isoladas de sujarem o pool de competências de cartão.
31/03/2026	Otimização PWA e Componentes	Implementada Modal `Dialog` nativa em CategoriesManager (substituindo .confirm() para compliance PWA Mobile). Tema primário atualizado meta-tags Teal (`#0d9488`). Variáveis raízes de CSS duplicadas em `App.css` expurgadas em prol do tailwind base.
31/03/2026	UI/UX e Responsividade Mobile	Gestor de Instituições blindado com truncamento `min-w-0` evitando quebra de Viewport. CategoriaManager migrado de accordion complexo vertical para `Grid Flat Responsivo` sem isolamento visual excessivo. Design System text-2xl padronizado no Dashboard. Readequação semântica do Fallback do `CreditCardVisual` resgatando cartões com texturas mortas de telas brancas nulas.
01/04/2026	CategoriesManager.tsx	Refatoração estrutural (Tabs para Despesas/Receitas) e uso do Accordion com suporte a Subcategorias in-line.
01/04/2026	Competência de Cartão	Inversão de lógica: Extrato/Dashboard priorizam `date` (data da compra). Gerenciador de Contas (`BillsManager`) prioriza `invoiceMonthYear` para liquidação de fatura. Refatorados `useFinanceQueries`, `useFinanceStore` e `useProjectedTransactions`.
01/04/2026	useFinanceQueries.ts	Padronização do formato de data para `yyyy-MM-dd` (evitando UTC drift) e remoção do filtro redundante `is_paid.eq.false` no hook `useTransactions`.
01/04/2026	Index.tsx	Correção de erro crítico (ReferenceError: parseLocalDate is not defined) que impedia o carregamento da página principal. Adicionada importação de `@/utils/dateUtils`.
01/04/2026	TransactionForm.tsx	Atualizado placeholder do campo descrição para "Ex: Salário" em todos os lançamentos de receita.
01/04/2026	PWA / UpdatePrompt	Implementado sistema de notificação de nova versão (UpdatePrompt). Alterado VitePWA para modo 'prompt', permitindo que usuários atualizem o app manualmente para ver novas versões/temas sem perder o login.
01/04/2026	Regra de Negócio	Apenas lançamentos do tipo "Pontual" podem ser duplicados/copiados. Lançamentos fixos ou parcelados devem ser gerenciados via edição ou novos fluxos para evitar inconsistências de recorrência.
01/04/2026	useThemeColor.tsx	Ajuste da cor de Páscoa para tom Matte (HSL 267 60% 72%) alinhado ao princípio de Luxo Silencioso, removendo efeito neon no modo escuro.
01/04/2026	useFinanceStore.tsx	Corrigida filtragem de transações virtuais em currentMonthTransactions, garantindo que projeções apareçam corretamente nas telas de destino (Gestão de Contas) respeitando a data visualizada.
01/04/2026	CardsDashboard.tsx	Corrigido bug de abatimentos: Filtro de transações da fatura ajustado para incluir créditos/estornos (income) mesmo se marcados como isInvoicePayment, garantindo o cálculo correto do total da fatura.
06/04/2026	Projeto Global	Correção Estrutural de Abatimentos: Refatorados `CardsDashboard.tsx`, `useCreditCardMetrics.ts`, `useFinanceStore.tsx`, `TransactionList.tsx` e `AccountEvolution.tsx`. A nova regra global garante que transações de "Crédito/Estorno" (tipo `income`) não sejam excluídas dos cálculos de fatura e limite (mesmo se marcadas como `isInvoicePayment`), permitindo que abatimentos reduzam corretamente os totais de gastos e o limite consumido.
07/04/2026	Projeto Global	Substituição global de tamanhos de fonte críticos (8px, 9px, 10px) por padrões legíveis (11px e text-xs/12px) em todo o diretório `src/` para conformidade com acessibilidade e legibilidade mínima.
08/04/2026	ProfileSettings.tsx / FloatingNavMenu.tsx	Remoção do item "Início" do menu de escolha de atalhos mobile. Novo limite estrito de 4 atalhos simultâneos. Refatoração geométrica do FAB orbital (arco 180° a 0°) com alinhamento vertical absoluto (offset -46px no bottom) para que o centro dos ícones coincida com o centro do gatilho Plus. Troca do ícone gatilho para Plus com rotação de 45°. Adicionado sufixo "K" na versão do app para validação de build.
08/04/2026	Projeto Global	Limpeza de código morto (remoção do BottomNavigation.tsx), implementação da feature de Limite de Orçamento por Categoria (migration SQL, edição no CategoriesManager, novo componente BudgetAlerts), criação da suite de testes unitários reais com Vitest para utilitários e regras de deduplicação (26 assertions passing), e migração rigorosa do TypeScript para strict: true em utilitários, tipos e hooks (0 errors type check). Build da aplicação avançou para a versão 'L'.
08/04/2026	Projeto Global	Padronização do uso de `todayLocalString()` em substituição a chamadas nativas de data nos arquivos `useGoalMutations.ts`, `GoalAportModal.tsx` e `EmergencyFund.tsx`, eliminando riscos de drift de fuso horário em aportes e transferências. Build da aplicação avançou para a versão 'M'.
08/04/2026	Projeto Global	Implementação do Plano de Patches de Escalabilidade: Remoção de log sensível (URL do banco), otimização de pagamento de fatura em lote (bulk update), adição de `staleTime: 5min` em todas as queries principais para reduzir carga no banco e criação de índices compostos via migration SQL. Build da aplicação avançou para a versão 'N'.
08/04/2026	Projeto Global	Remoção visual completa do sistema de notificações (Card em ProfileSettings, ícones de sino e estados de permissão push), conforme decisão estratégica de adiar a implementação. Build da aplicação avançou para a versão 'O'.
08/04/2026	Projeto Global	Restrição do tema AMOLED exclusivamente para a version Mobile. Em dispositivos Web/Desktop (viewport >= 1024px), a opção foi removida da UI e o hook `useTheme` agora realiza downgrade automático para 'dark' caso o AMOLED esteja selecionado, mantendo a consistência visual. Build da aplicação avançou para a versão 'P'.
09/04/2026	Supabase / migrations	Fase 1 de Segurança: RLS completo habilitado em todas as tabelas (transactions, accounts, categories, subcategories, credit_cards, debts, savings_goals, budget_rules). Políticas de SELECT/INSERT/UPDATE/DELETE criadas com isolamento por auth.uid() = user_id. Subcategories validadas via JOIN com a tabela categories. Trigger spawn_next_recurring_transaction atualizado para SECURITY DEFINER. Build da aplicação avançou para a versão 'Q'.
09/04/2026	ProfileSettings.tsx	Bugfix: Correção de `ReferenceError: isMobile is not defined` via chamada do hook `useIsMobile()` no corpo do componente. Build da aplicação avançou para a versão 'R'.
09/04/2026	Projeto Global	Fase 2 de Segurança: Criado helper `logSafeError` em `supabase.ts` para evitar vazamento de dados sensíveis em produção. Substituídos todos os `console.error` com dados brutos por `logSafeError` em 6 arquivos de hooks. Tipagem estrita de payloads (`CreditCardDbPayload`, `DebtDbPayload`) eliminando `any`. Sanitização de inputs de texto livre (`trim().slice()`) implementada em transações, contas, categorias, metas e dívidas. Adicionadas `future` flags do React Router v7 no `BrowserRouter`. Build da aplicação avançou para a versão 'S'.
09/04/2026 | LGPD — Fase 3 (Completa) | Migration SQL 0016_delete_user_data.sql criada e executada no Supabase. Função delete_user_data() SECURITY DEFINER apaga em cascata transactions, subcategories, categories, accounts, credit_cards, debts, goals, budget_rules e auth.users. Hook useDeleteUserAccount adicionado em useAccountMutations.ts. Seção "Zona de Perigo" com confirmação por digitação de "EXCLUIR" adicionada em ProfileSettings.tsx. Checkbox de consentimento LGPD adicionado no formulário de cadastro em AuthPage.tsx com bloqueio do botão submit. robots.txt atualizado para Disallow: /. Build permanece na versão T.
09/04/2026 | Fase 4 — Super | Sistema de controle de acesso por usuário. Migration 0017_super_system.sql: tabelas profiles (código FLX-XXXX automático) e user_feature_overrides (overrides individuais sem tabela de features no banco — lista hardcoded em src/config/features.ts). Hook useFeatureFlags.ts criado. Página SuperPage.tsx em /super — acesso exclusivo via VITE_SUPER_USER_ID. Super admin vê acesso irrestrito a tudo sem consulta ao banco. theme_customization desabilitada por padrão — usuários sem flag veem apenas o verde água #0d9488. Código do usuário exibido em ProfileSettings. Build avança para versão U.
09/04/2026 | Fase 5 — Proteção de Rotas | ProtectedRoute criado em components/layout/ProtectedRoute.tsx. Rotas de cards, reports, emergency, debts, goals e simulator protegidas em App.tsx. Views internas do Index.tsx protegidas via ViewGuard com fallback para /?view=dashboard. NavigationRail, FloatingNavMenu e AppLayout Drawer ocultam automaticamente itens sem featureKey ativa via NavItemGuard. Link /super adicionado no Drawer — visível apenas para o super admin. Proteção do seletor de cores (theme_customization) confirmada em ProfileSettings.tsx. Build avança para versão V.
09/04/2026 | Fase 6 — Super Mobile + Bugfixes | Botão Super adicionado no header mobile do Index.tsx (visível só para super admin via useIsSuperAdmin). Bug de ciclagem de tema corrigido em useTheme.tsx — implementada função `cycleTheme` que lê classes do DOM para evitar stale closure. Bug de click-through do EasterWelcome corrigido com z-200, stopPropagation e estrutura de overlay personalizada. Tema de Páscoa movido de disparo automático por data para feature flag `theme_easter` controlada na tela Super — nova seção "Temas Especiais" adicionada na SuperPage.tsx com visual roxo. Build avança para versão W.
09/04/2026 | Bugfix Encoding | Corrigidos labels com caracteres UTF-8 corrompidos no formulário de Novo Acordo em DebtsManager.tsx. Substituídos caracteres quebrados (º, ª, ç, ã) por UTF-8 direto. Varredura global aplicada em BillsManager, ProfileSettings e TransactionForm. Build avança para versão X.
09/04/2026 | Hotfix Index.tsx | Correção de `ReferenceError: isMobile is not defined` no componente Index. A variável foi restaurada via hook `useIsMobile()`.
09/04/2026 | Fase 7 — Planos + Temas Globais | Migrations 0018_plans_system.sql (tabelas plans, plan_features, plan_id em profiles) e 0019_global_flags.sql (global_feature_flags com páscoa, natal e halloween). Hook useFeatureFlags.ts refatorado com cascata: override individual > plano > default. SuperPage.tsx refatorado em 3 abas: Usuários (com seletor de plano), Planos (CRUD completo + editor de features), Temas Globais (liga/desliga para todos). Temas globais controlados por global_feature_flags — não por user_feature_overrides. theme_easter removido de features.ts. EasterWelcome controlado por useGlobalFlag('theme_easter') no AppLayout.tsx. Build avança para versão Y.
10/04/2026 | Bugfix Geral — Build Z | 8 correções aplicadas: (1) Delete future/all de recorrentes corrigido em `useTransactionMutations.ts` — recorrentes agora usam `or(id, original_id)` em vez de `installment_group_id`. `onMutate` de delete e update também corrigidos com mesma lógica. (2) `transaction_type: 'adjustment'` corrigido em `useGoalMutations.ts`. (3) Import CSV corrigido em `ExportManager.tsx` — resolve `categoryId` por nome (case-insensitive) e `accountId` por nome ou null. (4) Stub `getEmergencyFundData` e no-ops `fetchInitialData`/`seedCoach` removidos do `useFinanceStore.tsx`. (5) `BalanceEvolutionChart.tsx` deletado — componente morto sem referências. (6) `monthlyYieldRate` removido da UI (`EmergencyReserve`, `AccountsManager`), dos payloads (`useAccountMutations.ts`) e dos types (`finance.ts`) — campo permanece no banco sem uso. (7) `EmergencyFund.tsx` migrada para usar `useEmergencyFund` como única fonte de verdade — lógica duplicada removida da página, hook expandido com fallback duplo (groupe essencial → isFixed → recorrentes). Build avança para versão Z.

Nota do Tech Lead: Este documento deve ser usado como contexto base em todos os prompts futuros que envolvam UI ou regras de negócio. Evitar refatorações gráficas e preservar filosofia de "Quiet Luxury" minimalista sem ruídos em cores ou blocos de grid.
