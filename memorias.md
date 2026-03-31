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

Texturas Premium: Cartões suportam acabamentos visuais (texture: solid, metallic, carbon, holographic, black) aplicados via CSS (mix-blend-mode e gradientes) sobre a cor base.

3. Navegação Mobile Customizável
Bottom Nav Dinâmica: O usuário pode escolher quais atalhos aparecem na barra inferior mobile através das Configurações (limite de 5 itens). Se ele desmarcar todos, a barra desaparece completamente.

Menu Lateral (Drawer): O menu lateral esquerdo atua como 'cofre de segurança' da navegação, contendo SEMPRE todas as rotas do aplicativo, imune à personalização da barra inferior.

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
Nota do Tech Lead: Este documento deve ser usado como contexto base em todos os prompts futuros que envolvam UI ou regras de negócio.
