const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'fluxo-logo-v2.svg');
const outputPath = path.join(__dirname, '..', 'public', 'fluxo-logo-v2.png');

console.log('Lendo o arquivo SVG...');
const svgContent = fs.readFileSync(svgPath, 'utf8');

console.log('Procurando imagem base64 no SVG...');
const match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);

if (match && match[1]) {
    console.log('Imagem encontrada! Decodificando...');
    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`Logo salva com sucesso em: ${outputPath}`);
} else {
    console.error('Não foi possível encontrar a imagem base64 embutida no SVG.');
}
