import os
import sys
import re

def clean_mojibake(text):
    # Multi-pass decoding and string replacements for double-encoded UTF-8 / Windows-1252 text
    
    # Specific multi-byte sequences created by repeated double UTF-8 / CP1252 encoding
    replacements = [
        ('MEMÃƒâ€œRIAS', 'MEMÓRIAS'),
        ('REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO', 'REGRAS CONSOLIDADAS DO FLUXO FINANCEIRO'),
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
    ]
    
    for bad, good in replacements:
        text = text.replace(bad, good)
        
    # Second pass for residual single mojibake characters
    text = text.replace('Ã©', 'é')
    text = text.replace('Ã¡', 'á')
    text = text.replace('Ã£', 'ã')
    text = text.replace('Ã§', 'ç')
    text = text.replace('Ã³', 'ó')
    text = text.replace('Ãº', 'ú')
    text = text.replace('Ã\xad', 'í')
    text = text.replace('Ãª', 'ê')
    text = text.replace('Ã´', 'ô')
    text = text.replace('Ã¢', 'â')
    text = text.replace('Ã', 'à') # residual single accent
    text = text.replace('Â', '')
    
    return text

def main():
    file_path = 'memorias.md'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    cleaned = clean_mojibake(content)
    
    # Save cleaned file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned)

    print("MEMORIAS_CLEANED_SUCCESSFULLY")

if __name__ == "__main__":
    main()
