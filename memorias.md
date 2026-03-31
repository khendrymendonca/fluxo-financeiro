# Memórias e Decisões de Arquitetura - Fluxo

Este documento serve como a fonte da verdade para decisões de UI/UX, regras de negócio e correções de bugs críticos. **ASSISTENTE DE IA: Leia este arquivo antes de sugerir refatorações estruturais ou criar novas telas.**

## 1. Padrões de UI/UX e Design System
* **Bifurcação Web vs Mobile (Cartões):** O layout não deve ser unificado. 
  * *Mobile:* Usa um carrossel horizontal (snap-mandatory), com o cartão centralizado (aprox. 300px), sem ocupar a largura total da tela. Atualização de dados via `swipe-to-update` (sincronizado no scroll).
  * *Web (Desktop):* Usa arquitetura Master-Detail (Grid 12 colunas). Cartões empilhados em lista na esquerda (`col-span-4`), e detalhes completos na direita (`col-span-8`).
* **Luxo Silencioso (Cores e Dark Mode):** Proibido o uso de cores 'Neon' chapadas na versão Web. Textos de valores usam tons suaves (`rose-400`, `emerald-400`). Proibido usar 'glow' ou fundos coloridos (ex: verde neon) para indicar itens ativos. O foco de itens ativos no mobile é feito exclusivamente por `opacity` e `scale`.
* **Dashboard Web:** Hierarquia rígida. Últimos lançamentos ocupam mais espaço que o gráfico de distribuição (que deve ser contido/esmagado). Valores financeiros nunca devem ser truncados (uso de `text-2xl` no máximo e formatação inteligente para valores acima de 100k).

## 2. Regras de Negócio de Cartões de Crédito
* **Privacidade Absoluta:** Os cartões NÃO devem exibir números fictícios (como '0000 0000...'). O design é focado apenas no Banco, Bandeira, Limite e **Apelido do Cartão** centralizado em destaque.
* **Texturas Premium:** Cartões suportam acabamentos visuais (`texture`: solid, metallic, carbon, holographic, black) aplicados via CSS (`mix-blend-mode` e gradientes) sobre a cor base.

## 3. Navegação Mobile Customizável
* **Bottom Nav Dinâmica:** O usuário pode escolher quais atalhos aparecem na barra inferior mobile através das Configurações (limite de 5 itens). Se ele desmarcar todos, a barra desaparece completamente.
* **Menu Lateral (Drawer):** O menu lateral esquerdo atua como 'cofre de segurança' da navegação, contendo SEMPRE todas as rotas do aplicativo, imune à personalização da barra inferior.

## 4. Motor de Lançamentos e Projeções
* **Segregação de Responsabilidades (Pagamentos):** A tela de 'Lançamentos' funciona apenas como um Extrato (Read-only para status). É estritamente proibido dar baixa (pagar) em contas fixas ou projeções por esta tela. A alteração do status `isPaid` de contas recorrentes/parceladas é exclusividade da tela 'Gestão de Contas'.
* **Mapeamento DTO e Timezone:** Conversão rigorosa de camelCase para snake_case no envio ao Supabase (ex: `isRecurring` para `is_recurring`, `subcategoryId` para `subcategory_id`). Uso obrigatório de `parseLocalDate()` em vez de `new Date()` para evitar bugs de fuso horário (UTC-3) que deslocam transações de mês.
* **Projeção Cíclica:** A query principal de transações deve sempre usar um `.or()` para buscar transações do mês atual OU transações com `is_recurring = true` OU parcelamentos (`installment_group_id`), garantindo que o `useProjectedTransactions` tenha dados do passado para projetar as contas pendentes nos meses futuros.
* **Deduplicação de Projeções:** O sistema depende do campo `original_id` mapeado do banco de dados para evitar que contas fixas recém-criadas no mês atual apareçam duplicadas (como reais e projetadas ao mesmo tempo).

---
*Nota do Tech Lead: Este documento deve ser usado como contexto base em todos os prompts futuros que envolvam UI ou regras de negócio.*
