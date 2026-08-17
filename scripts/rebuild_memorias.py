import os
import sys
import re

def fix_garbled_strings(text):
    # Dictionary of all known garbled character sequences in memorias.md
    replacements = [
        ('MEMÃƒâ€œRIAS', 'MEMÓRIAS'),
        ('REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO', 'REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO'),
        ('REGRA DE RELATÔœRIOS', 'REGRA DE RELATÓRIOS'),
        ('REGRA DE RELATÔœRIOS — CATEGORIAS LÔœGICAS NATIVAS', 'REGRA DE RELATÓRIOS — CATEGORIAS LÓGICAS NATIVAS'),
        ('REGRA DE RELATÔœRIOS — ACORDOS', 'REGRA DE RELATÓRIOS — ACORDOS'),
        ('REGRA DE RELATÔœRIOS — FLUXO SCORE', 'REGRA DE RELATÓRIOS — FLUXO SCORE'),
        ('PRÔœXIMOS PONTOS TÔ°CNICOS FUTUROS', 'PRÓXIMOS PONTOS TÉCNICOS FUTUROS'),
        ('CORREÔ¡Ô¢ES IMPORTANTES REGISTRADAS', 'CORREÇÕES IMPORTANTES REGISTRADAS'),
        ('REGRA DE SEGURANÔ¡A', 'REGRA DE SEGURANÇA'),
        ('HISTÔœRICO DE VALIDAÔ¡Ô¢ES DE ALTERAÔ¡Ô¢ES', 'HISTÓRICO DE VALIDAÇÕES DE ALTERAÇÕES'),
        ('REGRA DE CLASSIFICAÔ¡àƒÆ’à‚§ÔƒO CANÔ NICA DE CATEGORIAS', 'REGRA DE CLASSIFICAÇÃO CANÔNICA DE CATEGORIAS'),
        ('REGRA DE CLASSIFICAÔ¡àƒÆ’à‚§', 'REGRA DE CLASSIFICAÇÃO'),
        ('CANÔ NICOS', 'CANÔNICOS'),
        ('CANÔ NICA', 'CANÔNICA'),
        ('REGRA DE FILTROS DE PERàƒODO', 'REGRA DE FILTROS DE PERÍODO'),
        ('REGRA DE VALORES MONETàƒRIOS', 'REGRA DE VALORES MONETÁRIOS'),
        ('REGRA DE TESTES E VALIDAÔ¡àƒÆ’O DE SPRINT', 'REGRA DE TESTES E VALIDAÇÃO DE SPRINT'),
        ('REGRA DE UX — FILTROS MOBILE EM RELATÔœRIOS', 'REGRA DE UX — FILTROS MOBILE EM RELATÓRIOS'),
        ('REGRA TÔ°CNICA — CONTAS / BANCO', 'REGRA TÉCNICA — CONTAS / BANCO'),
        ('REGRA DE RELATÔœRIOS — FLUXO SCORE (ADITIVO E SOMENTE LEITURA)', 'REGRA DE RELATÓRIOS — FLUXO SCORE (ADITIVO E SOMENTE LEITURA)'),
        ('Diretriz crí­tica', 'Diretriz crítica'),
        ('Motor de cálculo — contas de consumo/pagamentos padrão', 'Motor de cálculo — contas de consumo/pagamentos padrão'),
        ('Bí´nus mensal', 'Bônus mensal'),
        ('Motor de cálculo — acordos e dí­vidas', 'Motor de cálculo — acordos e dívidas'),
        ('Fórmula consolidada', 'Fórmula consolidada'),
        ('Requisito de UI — tela e posicionamento', 'Requisito de UI — tela e posicionamento'),
        ('Requisito visual — gráfico circular, cor e glow', 'Requisito visual — gráfico circular, cor e glow'),
        ('Requisito de animação', 'Requisito de animação'),
        ('àƒÆ’à‚§', 'ç'),
        ('àƒÆ’à‚£', 'ã'),
        ('àƒÆ’à‚³', 'ó'),
        ('àƒÅ¡', 'ú'),
        ('Ô¡Ô¢ES', 'ÇÕES'),
        ('Ô¡Ô¢es', 'ções'),
        ('Ô¡A', 'ÇA'),
        ('Ô¡a', 'ça'),
        ('Ôœ', 'Ó'),
        ('Ô°', 'É'),
        ('Ô”', 'Ô'),
        ('ââ€\xa0â€™', '→'),
        ('ââ€\xa0â€œ', '↓'),
        ('í¢ââ€š¬', '-'),
        ('Descrià¯¿½à¯¿½o', 'Descrição'),
        ('LanàƒÆ’à‚§amento', 'Lançamento'),
        ('Nà¯¿½ de Parcelas', 'Nº de Parcelas'),
        ('1à¯¿½ Parcela', '1ª Parcela'),
        ('â€—\x9d', '—'),
        ('—\x9d', '—'),
        ('Ô\x9d', ''),
        ('Ã¢â‚¬â€', '—'),
        ('Ã¢â‚¬Å“', '“'),
        ('Ã¢â‚¬ï¿½', '”'),
        ('Ã¢â‚¬â„¢', '’'),
        ('Ã¢â‚¬', '–'),
        ('ÃƒÂ©', 'é'),
        ('ÃƒÂ¡', 'á'),
        ('ÃƒÂ£', 'ã'),
        ('ÃƒÂ§', 'ç'),
        ('ÃƒÂ³', 'ó'),
        ('ÃƒÂº', 'ú'),
        ('ÃƒÂª', 'ê'),
        ('ÃƒÂ\x8d', 'Í'),
        ('ÃƒÂ', 'í'),
        ('Ãƒâ€', 'Ô'),
        ('Ãƒâ€œ', 'Ó'),
        ('Ãƒâ€ ', 'À'),
        ('ÃƒÂ§ÃƒÂ£o', 'ção'),
        ('ÃƒÂ§ÃƒÂµes', 'ções'),
        ('Ã§Ã£o', 'ção'),
        ('Ã§Ãµes', 'ções'),
        ('Ã§a', 'ça'),
        ('Ã§o', 'ço'),
        ('Ã§u', 'çu'),
        ('Ã¡', 'á'),
        ('Ã©', 'é'),
        ('Ã\xad', 'í'),
        ('Ã³', 'ó'),
        ('Ãº', 'ú'),
        ('Ã£', 'ã'),
        ('Ãµ', 'õ'),
        ('Ã¢', 'â'),
        ('Ãª', 'ê'),
        ('Ã´', 'ô'),
        ('Ã§', 'ç'),
        ('Ã€', 'À'),
        ('Ã\x81', 'Á'),
        ('Ã\x89', 'É'),
        ('Ã\x8d', 'Í'),
        ('Ã\x93', 'Ó'),
        ('Ã\x9a', 'Ú'),
        ('Ã\x83', 'Ã'),
        ('Ã\x95', 'Õ'),
        ('Ã‡', 'Ç'),
        ('Âº', 'º'),
        ('Âª', 'ª'),
        ('ðŸ‡§ðŸ‡·', '🇧🇷'),
        ('ï¿½', ''),
        ('à¯¿½', ''),
        ('à\xa0', ''),
        ('í\xa0', ''),
        ('íµ', ''),
        ('í´', ''),
        ('çíµes', 'ções'),
        ('çíµ', 'ção'),
    ]

    for old, new in replacements:
        text = text.replace(old, new)
        
    return text

def rebuild():
    path = 'memorias.md'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_text = f.read()

    cleaned = fix_garbled_strings(raw_text)

    # Make sure header starts cleanly with AI System Directive
    if not cleaned.startswith("# MEMÓRIAS — FONTE ÚNICA DE VERDADE"):
        header_block = (
            "# MEMÓRIAS — FONTE ÚNICA DE VERDADE (SSOT) E REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO\n\n"
            "> [!IMPORTANT]\n"
            "> **DIRETRIZ OBRIGATÓRIA PARA AGENTES E MODELOS DE IA:**\n"
            "> Este arquivo representa a **Fonte Única de Verdade (Single Source of Truth - SSOT)** do projeto **Fluxo Financeiro**.\n"
            "> Todas as decisões arquiteturais, regras de negócio, diretrizes de UI/UX, tratamentos de banco de dados e históricos descritos neste documento devem ser rigorosamente respeitados por qualquer assistente de IA antes de realizar alterações no código.\n"
            ">\n"
            "> **Regras Primordiais:**\n"
            "> 1. **Regime de Caixa Estrito**: Liquidações normais contabilizam por `payment_date`. Cartões de crédito contabilizam ao pagar a fatura do mês correspondente (`invoiceMonthYear`). Transferências utilizam `transfer_group_id` sem inflar receita/despesa.\n"
            "> 2. **UI Executiva & Sem Emojis**: O app segue o padrão visual *Apple Minimalist*. É estritamente PROIBIDO o uso de emojis na interface visual; utilize exclusivamente ícones vetoriais `Lucide React`.\n"
            "> 3. **Boot Inteligente**: O app deve sincronizar previamente com o Supabase no boot sem exibir valores zerados falsos.\n"
            "> 4. **Isolamento de Dados & RLS**: Todas as consultas e mutações respeitam o UUID do usuário autenticado (`auth.uid()`). A exclusão de conta utiliza a RPC `delete_user_data` (LGPD).\n"
            "> 5. **Atualização Contínua**: Sempre que uma mudança arquitetural, de banco ou de UI for aprovada e validada, este arquivo DEVE ser atualizado com a data e um resumo no Histórico (Seção 6).\n\n"
            "---\n\n"
        )
        
        # Remove old garbled top title if present
        lines = cleaned.splitlines()
        start_idx = 0
        for idx, line in enumerate(lines[:10]):
            if line.startswith("# MEMÓRIAS") or line.startswith("# MEM"):
                start_idx = idx + 1
                break
        
        body = "\n".join(lines[start_idx:])
        cleaned = header_block + body

    with open(path, 'w', encoding='utf-8') as f:
        f.write(cleaned)

    print("REBUILD_SUCCESSFUL")

if __name__ == "__main__":
    rebuild()
