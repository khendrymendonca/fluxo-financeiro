# Fluxo - Gestão Financeira Inteligente

## Sobre o Aplicativo
O **Fluxo** é uma plataforma de gestão financeira pessoal e empresarial focada em simplicidade, velocidade e inteligência. Construído com as tecnologias mais modernas do ecossistema Web, o aplicativo oferece controle total sobre contas bancárias, cartões de crédito, metas de economia e dívidas.

## Tecnologias Utilizadas
- **Vite** & **React** (Frontend)
- **TypeScript** (Segurança de tipos)
- **Supabase** (Backend as a Service & Auth)
- **shadcn/ui** & **Tailwind CSS** (Interface Premium)
- **TanStack Query** (Sincronização de dados)
- **Lucide React** (Iconografia)

## Como Iniciar o Projeto Localmente

1. **Clonar o repositório**:
   ```sh
   git clone <REPO_URL>
   ```

2. **Instalar dependências**:
   ```sh
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz com suas chaves do Supabase:
   ```
   VITE_SUPABASE_URL=sua_url
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   ```

4. **Rodar em desenvolvimento**:
   ```sh
   npm run dev
   ```

## Deploy
O projeto está configurado para deploy automático na **Vercel**. Cada push para a branch `main` dispara um novo build.

---
**Fluxo** &copy; 2026 - Controle seu dinheiro, conquiste sua liberdade.
