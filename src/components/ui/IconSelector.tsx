import React, { useState, useMemo, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input } from './input';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { BRAND_ICONS, BrandIconRenderer } from './BrandIcons';

export interface IconItem {
  name: string;
  label: string;
  category: string;
  keywords?: string[];
}

export interface IconCategoryGroup {
  id: string;
  name: string;
}

export const ICON_GROUPS: IconCategoryGroup[] = [
  { id: 'all', name: 'Todos' },
  { id: 'brands', name: 'Marcas' },
  { id: 'finance', name: 'Financeiro' },
  { id: 'housing', name: 'Moradia' },
  { id: 'food', name: 'Alimentação' },
  { id: 'transport', name: 'Transporte' },
  { id: 'health', name: 'Saúde' },
  { id: 'education', name: 'Educação' },
  { id: 'lifestyle', name: 'Lazer' },
  { id: 'family', name: 'Família' },
  { id: 'faith', name: 'Fé' },
  { id: 'services', name: 'Serviços' },
];

export const CATEGORY_ICONS: IconItem[] = [
  // ─── FINANCEIRO ───
  { name: 'Banknote', label: 'Dinheiro / Cédula', category: 'finance', keywords: ['dinheiro', 'nota', 'pagamento', 'salario', 'renda', 'receita', 'cash'] },
  { name: 'CreditCard', label: 'Cartão de Crédito', category: 'finance', keywords: ['cartao', 'credito', 'debito', 'banco', 'fatura', 'pagamento'] },
  { name: 'Wallet', label: 'Carteira / Saldo', category: 'finance', keywords: ['carteira', 'saldo', 'dinheiro', 'conta'] },
  { name: 'PiggyBank', label: 'Cofrinho / Poupança', category: 'finance', keywords: ['poupanca', 'guardar', 'reserva', 'economia', 'moeda'] },
  { name: 'TrendingUp', label: 'Investimentos', category: 'finance', keywords: ['investimento', 'acoes', 'rendimento', 'lucro', 'cdb', 'bolsa'] },
  { name: 'TrendingDown', label: 'Despesas / Queda', category: 'finance', keywords: ['prejuizo', 'queda', 'corte'] },
  { name: 'DollarSign', label: 'Cifrão / Moeda', category: 'finance', keywords: ['dolar', 'dinheiro', 'moeda', 'financeiro'] },
  { name: 'Coins', label: 'Moedas / Troco', category: 'finance', keywords: ['moeda', 'troco', 'centavos'] },
  { name: 'Receipt', label: 'Comprovante / Recibo', category: 'finance', keywords: ['nota', 'fiscal', 'recibo', 'fatura', 'comprovante'] },
  { name: 'Landmark', label: 'Banco / Instituição', category: 'finance', keywords: ['banco', 'governo', 'instituicao', 'agencia'] },
  { name: 'CircleDollarSign', label: 'Receita / Renda', category: 'finance', keywords: ['salario', 'renda', 'prolabore', 'comissao'] },
  { name: 'BadgePercent', label: 'Desconto / Juros', category: 'finance', keywords: ['taxa', 'juros', 'desconto', 'porcentagem', 'imposto'] },
  { name: 'ArrowLeftRight', label: 'Transferências / Pix', category: 'finance', keywords: ['pix', 'ted', 'doc', 'transferencia', 'envio'] },
  { name: 'Scale', label: 'Jurídico / Impostos', category: 'finance', keywords: ['justica', 'advogado', 'tributo', 'imposto', 'darf'] },
  { name: 'HandCoins', label: 'Empréstimo / Doação', category: 'finance', keywords: ['divida', 'emprestimo', 'financiamento', 'doacao', 'ajuda'] },
  { name: 'Vault', label: 'Cofre / Reserva de Emergência', category: 'finance', keywords: ['reserva', 'emergencia', 'cofre', 'guardar'] },
  { name: 'Percent', label: 'Percentual / Taxas', category: 'finance', keywords: ['taxa', 'porcentagem', 'juros', 'rendimento'] },
  { name: 'ReceiptText', label: 'Extrato Detalhado', category: 'finance', keywords: ['extrato', 'fatura', 'detalhe', 'comprovante'] },
  { name: 'BarChart3', label: 'Relatórios / Gráficos', category: 'finance', keywords: ['relatorio', 'grafico', 'analise', 'desempenho'] },
  { name: 'PieChart', label: 'Distribuição de Gastos', category: 'finance', keywords: ['orcamento', 'divisao', 'categoria', 'proporcao'] },
  { name: 'Target', label: 'Metas Financeiras', category: 'finance', keywords: ['meta', 'objetivo', 'planejamento'] },
  { name: 'WalletCards', label: 'Cartões / Carteira Digital', category: 'finance', keywords: ['cartoes', 'carteira', 'multiplos cartoes'] },
  { name: 'BadgeDollarSign', label: 'Bônus / Comissão', category: 'finance', keywords: ['bonus', 'comissao', 'premiacao', 'renda extra'] },

  // ─── MORADIA & CASA ───
  { name: 'Home', label: 'Moradia / Aluguel', category: 'housing', keywords: ['casa', 'apartamento', 'aluguel', 'condominio', 'iptu', 'lar'] },
  { name: 'Building', label: 'Condomínio / Prédio', category: 'housing', keywords: ['predio', 'condominio', 'edificio', 'apartamento'] },
  { name: 'Building2', label: 'Imóvel / Habitação', category: 'housing', keywords: ['imovel', 'bens', 'patrimonio'] },
  { name: 'Bed', label: 'Móveis / Quarto', category: 'housing', keywords: ['cama', 'dormitorio', 'hotel', 'descanso'] },
  { name: 'Sofa', label: 'Decoração / Sala', category: 'housing', keywords: ['movel', 'mobilia', 'decoracao', 'sala', 'conforto'] },
  { name: 'Tv', label: 'Televisão / Aparelhos', category: 'housing', keywords: ['eletronicos', 'aparelho', 'smart tv', 'equipamento'] },
  { name: 'Wifi', label: 'Internet / Wi-Fi', category: 'housing', keywords: ['banda larga', 'fibra', 'conexao', 'rede', 'modem'] },
  { name: 'Zap', label: 'Energia Elétrica', category: 'housing', keywords: ['luz', 'eletricidade', 'energia', 'conta de luz', 'enel', 'cemig'] },
  { name: 'Droplets', label: 'Água e Esgoto', category: 'housing', keywords: ['agua', 'saneamento', 'sabesp', 'copasa', 'hidrometro'] },
  { name: 'Flame', label: 'Gás de Cozinha', category: 'housing', keywords: ['gas', 'botijao', 'aquecimento', 'fogao', 'encanado'] },
  { name: 'Key', label: 'Chaves / Portaria', category: 'housing', keywords: ['chaveiro', 'mudanca', 'chave', 'seguranca'] },
  { name: 'Hammer', label: 'Reformas / Obras', category: 'housing', keywords: ['construcao', 'pedreiro', 'obra', 'reparo', 'manutencao'] },
  { name: 'Wrench', label: 'Manutenção / Reparos', category: 'housing', keywords: ['conserto', 'ferramenta', 'encanador', 'eletricista'] },
  { name: 'Paintbrush', label: 'Pintura & Acabamento', category: 'housing', keywords: ['tinta', 'decoracao', 'pintura', 'verniz'] },
  { name: 'Trash2', label: 'Limpeza & Lixo', category: 'housing', keywords: ['limpeza', 'faxina', 'descarte', 'diarista'] },
  { name: 'Lightbulb', label: 'Iluminação & Utilidades', category: 'housing', keywords: ['lampada', 'instalacao', 'ideia'] },
  { name: 'Bath', label: 'Banheiro & Higiene Casa', category: 'housing', keywords: ['banho', 'chuveiro', 'encanamento'] },
  { name: 'Warehouse', label: 'Depósito / Armazém', category: 'housing', keywords: ['estoque', 'garagem', 'guarda moveis'] },
  { name: 'DoorOpen', label: 'Acesso / Mudança', category: 'housing', keywords: ['porta', 'entrada', 'mudanca'] },
  { name: 'Shield', label: 'Seguro Residencial', category: 'housing', keywords: ['seguro', 'protecao', 'alarme', 'cameras'] },
  { name: 'Sparkles', label: 'Organização / Cuidados', category: 'housing', keywords: ['faxina', 'organizacao', 'brilho'] },
  { name: 'Router', label: 'Roteador / Rede Wi-Fi', category: 'housing', keywords: ['roteador', 'rede', 'internet', 'modem'] },
  { name: 'Bug', label: 'Dedetização / Pragas', category: 'housing', keywords: ['dedetizacao', 'praga', 'inseto', 'controle'] },
  { name: 'Snowflake', label: 'Ar-Condicionado / Climatização', category: 'housing', keywords: ['ar condicionado', 'climatizacao', 'refrigeracao', 'ventilador'] },

  // ─── ALIMENTAÇÃO & BEBIDAS ───
  { name: 'ShoppingCart', label: 'Supermercado', category: 'food', keywords: ['mercado', 'compras', 'feira', 'hortifruti', 'mercearia', 'compras do mes'] },
  { name: 'Utensils', label: 'Restaurante / Refeição', category: 'food', keywords: ['comida', 'almoco', 'jantar', 'prato feito', 'restaurante', 'ifood'] },
  { name: 'UtensilsCrossed', label: 'Gastronomia / Jantares', category: 'food', keywords: ['culinaria', 'alta gastronomia', 'chef', 'bistro'] },
  { name: 'Coffee', label: 'Café & Padaria', category: 'food', keywords: ['cafe', 'padaria', 'pao', 'lanche', 'cafeteria', 'starbucks'] },
  { name: 'Wine', label: 'Vinhos & Adega', category: 'food', keywords: ['vinho', 'bebida', 'adega', 'bar', 'drinques'] },
  { name: 'Beer', label: 'Cerveja & Happy Hour', category: 'food', keywords: ['cerveja', 'chope', 'happy hour', 'bar', 'social', 'balada'] },
  { name: 'Pizza', label: 'Pizzaria & Delivery', category: 'food', keywords: ['pizza', 'delivery', 'ifood', 'lanche', 'delivery'] },
  { name: 'Apple', label: 'Feira / Frutas / Saudável', category: 'food', keywords: ['fruta', 'feira', 'hortifruti', 'saudavel', 'verduras', 'legumes'] },
  { name: 'Sandwich', label: 'Lanches & Fast Food', category: 'food', keywords: ['hamburguer', 'sanduiche', 'fast food', 'mcdonalds', 'burguer king'] },
  { name: 'Beef', label: 'Açougue & Carnes', category: 'food', keywords: ['carne', 'acougue', 'churrasco', 'proteina'] },
  { name: 'Cookie', label: 'Doces & Sobremesas', category: 'food', keywords: ['biscoito', 'bolacha', 'sobremesa', 'confeitaria'] },
  { name: 'Cake', label: 'Bolos & Festas', category: 'food', keywords: ['bolo', 'aniversario', 'festa', 'confeitaria', 'torta'] },
  { name: 'IceCream2', label: 'Sorveteria & Açaí', category: 'food', keywords: ['sorvete', 'acai', 'picole', 'gelato'] },
  { name: 'Salad', label: 'Alimentação Saudável', category: 'food', keywords: ['salada', 'dieta', 'fit', 'nutricionista', 'verde'] },
  { name: 'CupSoda', label: 'Bebidas & Refrigerantes', category: 'food', keywords: ['refrigerante', 'suco', 'agua', 'bebida'] },
  { name: 'Egg', label: 'Café da Manhã & Ovos', category: 'food', keywords: ['ovo', 'cafe da manha', 'proteina'] },
  { name: 'Fish', label: 'Peixes & Frutos do Mar', category: 'food', keywords: ['peixaria', 'sushi', 'frutos do mar', 'salmao'] },
  { name: 'Soup', label: 'Sopas & Caldos', category: 'food', keywords: ['sopa', 'caldo', 'restaurante'] },
  { name: 'Cherry', label: 'Hortifruti & Doces', category: 'food', keywords: ['cereja', 'frutas', 'doces'] },
  { name: 'Candy', label: 'Guloseimas & Bomboniere', category: 'food', keywords: ['doce', 'bala', 'chocolate', 'bomboniere'] },
  { name: 'ChefHat', label: 'Chef & Alta Gastronomia', category: 'food', keywords: ['chef', 'culinaria', 'cozinha gourmet', 'aulas de culinaria'] },
  { name: 'Croissant', label: 'Confeitaria Fina', category: 'food', keywords: ['padaria fina', 'confeitaria', 'croissant', 'boulangerie'] },
  { name: 'Drumstick', label: 'Churrasco & Aves', category: 'food', keywords: ['churrasco', 'frango', 'aves', 'churrascaria'] },
  { name: 'Milk', label: 'Laticínios', category: 'food', keywords: ['leite', 'queijo', 'iogurte', 'laticinios'] },
  { name: 'Popcorn', label: 'Pipoca & Cinema em Casa', category: 'food', keywords: ['pipoca', 'lanche cinema', 'snacks'] },
  { name: 'Martini', label: 'Drinks & Coquetéis', category: 'food', keywords: ['drink', 'coquetel', 'bar', 'happy hour'] },

  // ─── TRANSPORTE & VEÍCULOS ───
  { name: 'Car', label: 'Carro / Automóvel', category: 'transport', keywords: ['carro', 'veiculo', 'automovel', 'ipva', 'seguro auto', 'mecanico'] },
  { name: 'Fuel', label: 'Combustível / Posto', category: 'transport', keywords: ['gasolina', 'etanol', 'alcool', 'diesel', 'gnv', 'posto', 'abastecer'] },
  { name: 'Bus', label: 'Ônibus / Transporte Público', category: 'transport', keywords: ['onibus', 'tarifa', 'passagem', 'bilhete unico', 'conducao'] },
  { name: 'Train', label: 'Metrô / Trem', category: 'transport', keywords: ['metro', 'trem', 'cptm', 'trilhos', 'transporte publico'] },
  { name: 'Plane', label: 'Viagens & Passagens Aéreas', category: 'transport', keywords: ['aviao', 'voo', 'passagem aerea', 'turismo', 'viagem'] },
  { name: 'Bike', label: 'Bicicleta / Ciclovia', category: 'transport', keywords: ['bike', 'bicicleta', 'patinete', 'ciclismo', 'manutencao bike'] },
  { name: 'Truck', label: 'Frete & Mudanças', category: 'transport', keywords: ['caminhao', 'frete', 'entrega', 'mudanca', 'transporte'] },
  { name: 'Navigation', label: 'Aplicativos (Uber / 99)', category: 'transport', keywords: ['uber', '99', 'corrida', 'taxi', 'corrida app', 'gps'] },
  { name: 'MapPin', label: 'Estacionamento & Pedágio', category: 'transport', keywords: ['estacionamento', 'valet', 'pedagio', 'sem parar', 'veloe'] },
  { name: 'Gauge', label: 'Revisão & Mecânica', category: 'transport', keywords: ['mecanico', 'revisao', 'oleo', 'pneu', 'balanceamento', 'oficina'] },
  { name: 'Compass', label: 'Passeios & Rotas', category: 'transport', keywords: ['estrada', 'pedagio', 'roteiro', 'viagem'] },
  { name: 'Ship', label: 'Barco / Balsa / Cruzeiro', category: 'transport', keywords: ['balsa', 'barco', 'navio', 'cruzeiro'] },
  { name: 'CarFront', label: 'Vistoria & Documentação Veicular', category: 'transport', keywords: ['vistoria', 'licenciamento', 'documento carro', 'detran'] },
  { name: 'Luggage', label: 'Bagagem & Malas', category: 'transport', keywords: ['bagagem', 'mala', 'viagem', 'despacho'] },
  { name: 'ParkingCircle', label: 'Estacionamento Mensal', category: 'transport', keywords: ['estacionamento', 'vaga', 'mensalista', 'garagem'] },
  { name: 'TrainFront', label: 'Trem Urbano / VLT', category: 'transport', keywords: ['trem urbano', 'vlt', 'monotrilho', 'transporte publico'] },
  { name: 'Anchor', label: 'Náutica / Ancoragem', category: 'transport', keywords: ['nautica', 'marina', 'ancoragem', 'lancha'] },

  // ─── SAÚDE, CUIDADOS & BEM-ESTAR ───
  { name: 'Stethoscope', label: 'Médico & Consultas', category: 'health', keywords: ['medico', 'consulta', 'clinica', 'doutor', 'exame'] },
  { name: 'Heart', label: 'Saúde & Plano de Saúde', category: 'health', keywords: ['plano de saude', 'unimed', 'bradesco', 'amil', 'convenio'] },
  { name: 'HeartPulse', label: 'Cardiologia & Exames', category: 'health', keywords: ['exame', 'laboratorio', 'checkup', 'sangue'] },
  { name: 'Activity', label: 'Tratamentos & Terapia', category: 'health', keywords: ['terapia', 'psicologo', 'fisioterapia', 'bem estar'] },
  { name: 'Pill', label: 'Farmácia & Medicamentos', category: 'health', keywords: ['farmacia', 'remedio', 'medicamento', 'drogaria', 'droga raia', 'pacheco'] },
  { name: 'Syringe', label: 'Vacinas & Injetáveis', category: 'health', keywords: ['vacina', 'injecao', 'laboratorio', 'imunizacao'] },
  { name: 'Dumbbell', label: 'Academia & Esportes', category: 'health', keywords: ['academia', 'smart fit', 'musculacao', 'crossfit', 'personal', 'esporte', 'treino'] },
  { name: 'Smile', label: 'Odontologia / Dentista', category: 'health', keywords: ['dentista', 'dente', 'aparelho', 'odontologia', 'clareamento'] },
  { name: 'Scissors', label: 'Barbearia & Salão', category: 'health', keywords: ['barba', 'cabelo', 'cabeleireiro', 'salao de beleza', 'manicure', 'estetica', 'corte'] },
  { name: 'Eye', label: 'Ótica & Oftalmologia', category: 'health', keywords: ['oculos', 'lente de contato', 'oftalmologista', 'otica', 'grau'] },
  { name: 'Hospital', label: 'Hospital & Emergência', category: 'health', keywords: ['pronto socorro', 'internacao', 'cirurgia', 'hospital'] },
  { name: 'Bandage', label: 'Curativos & Primeiros Socorros', category: 'health', keywords: ['curativo', 'primeiros socorros', 'farmacia basica'] },
  { name: 'ShieldPlus', label: 'Seguro Saúde / Plano', category: 'health', keywords: ['seguro saude', 'plano de saude', 'protecao'] },

  // ─── EDUCAÇÃO & TRABALHO ───
  { name: 'GraduationCap', label: 'Faculdade & Graduação', category: 'education', keywords: ['faculdade', 'universidade', 'pos graduacao', 'mba', 'diploma', 'mensalidade'] },
  { name: 'BookOpen', label: 'Cursos & Estudos', category: 'education', keywords: ['curso', 'escola', 'treinamento', 'workshop', 'idiomas', 'ingles'] },
  { name: 'Book', label: 'Livros & Material Didático', category: 'education', keywords: ['livro', 'apostila', 'leitura', 'livraria', 'amazon', 'kindle'] },
  { name: 'Briefcase', label: 'Trabalho & Negócios', category: 'education', keywords: ['escritorio', 'empresa', 'negocio', 'mei', 'cnpj', 'trabalho'] },
  { name: 'Laptop', label: 'Tecnologia & Softwares', category: 'education', keywords: ['computador', 'notebook', 'software', 'licenca', 'tecnologia'] },
  { name: 'Folder', label: 'Documentos & Gestão', category: 'education', keywords: ['pasta', 'arquivos', 'organizacao', 'contabilidade'] },
  { name: 'FileText', label: 'Contratos & Certificados', category: 'education', keywords: ['contrato', 'cartorio', 'documento', 'autenticacao'] },
  { name: 'PenTool', label: 'Design & Criatividade', category: 'education', keywords: ['design', 'arte', 'ferramentas', 'adobe', 'canva'] },
  { name: 'Award', label: 'Certificações & Conquistas', category: 'education', keywords: ['certificacao', 'premio', 'conquista', 'licenca'] },
  { name: 'Library', label: 'Biblioteca & Pesquisa', category: 'education', keywords: ['biblioteca', 'acervo', 'pesquisa', 'academico'] },
  { name: 'Newspaper', label: 'Notícias & Assinaturas', category: 'education', keywords: ['jornal', 'revista', 'noticias', 'periodico'] },
  { name: 'Calculator', label: 'Contabilidade & Cálculos', category: 'education', keywords: ['contador', 'honorarios', 'calculadora', 'planejamento'] },
  { name: 'Presentation', label: 'Palestras & Eventos', category: 'education', keywords: ['congresso', 'seminario', 'apresentacao', 'palestra'] },
  { name: 'Backpack', label: 'Material Escolar', category: 'education', keywords: ['mochila', 'material escolar', 'volta as aulas'] },
  { name: 'School', label: 'Escola / Educação Infantil', category: 'education', keywords: ['escola', 'colegio', 'creche', 'educacao infantil'] },
  { name: 'NotebookPen', label: 'Anotações & Redação', category: 'education', keywords: ['caderno', 'anotacao', 'redacao', 'estudo'] },
  { name: 'ScrollText', label: 'Diploma & Documentos Acadêmicos', category: 'education', keywords: ['diploma', 'historico escolar', 'certidao'] },

  // ─── LAZER, HOBBIES & ENTRETENIMENTO ───
  { name: 'Gamepad2', label: 'Jogos & Videogame', category: 'lifestyle', keywords: ['game', 'jogos', 'playstation', 'xbox', 'nintendo', 'steam', 'gamer'] },
  { name: 'Gamepad', label: 'Jogos Retrô / Fliperama', category: 'lifestyle', keywords: ['arcade', 'fliperama', 'retro'] },
  { name: 'Film', label: 'Cinema & Filmes', category: 'lifestyle', keywords: ['cinema', 'filme', 'ingresso', 'cinemark', 'pipoca'] },
  { name: 'Clapperboard', label: 'Streaming (Netflix, HBO, Disney)', category: 'lifestyle', keywords: ['netflix', 'prime video', 'disney', 'max', 'streaming', 'assinatura video'] },
  { name: 'Music', label: 'Música & Spotify', category: 'lifestyle', keywords: ['spotify', 'musica', 'deezer', 'apple music', 'shows', 'concerto'] },
  { name: 'Headphones', label: 'Áudio & Podcasts', category: 'lifestyle', keywords: ['fone', 'podcast', 'audiobook', 'headset'] },
  { name: 'Camera', label: 'Fotografia & Câmeras', category: 'lifestyle', keywords: ['foto', 'ensaio', 'camera', 'equipamento foto'] },
  { name: 'Tv2', label: 'TV por Assinatura / IPTV', category: 'lifestyle', keywords: ['iptu', 'cabo', 'sky', 'claro tv', 'canais'] },
  { name: 'Trophy', label: 'Coleções & Competições', category: 'lifestyle', keywords: ['colecionaveis', 'trofeu', 'campeonato', 'torneio'] },
  { name: 'Ticket', label: 'Ingressos & Eventos', category: 'lifestyle', keywords: ['ingresso', 'sympla', 'eventim', 'show', 'teatro', 'parque'] },
  { name: 'PartyPopper', label: 'Festas & Comemorações', category: 'lifestyle', keywords: ['festa', 'balada', 'comemoracao', 'reveillon', 'carnaval', 'aniversario'] },
  { name: 'Palette', label: 'Artes & Hobbies Manuais', category: 'lifestyle', keywords: ['pintura', 'artesanato', 'desenho', 'costura', 'hobby'] },
  { name: 'PlaneTakeoff', label: 'Férias & Passeios', category: 'lifestyle', keywords: ['ferias', 'hotel', 'resort', 'airbnb', 'turismo'] },
  { name: 'Radio', label: 'Rádio & Transmissões', category: 'lifestyle', keywords: ['radio', 'audio', 'locucao'] },
  { name: 'Guitar', label: 'Instrumentos Musicais', category: 'lifestyle', keywords: ['violao', 'guitarra', 'instrumento', 'aulas de musica'] },
  { name: 'Mic', label: 'Karaokê & Voz', category: 'lifestyle', keywords: ['microfone', 'karaoke', 'gravacao'] },
  { name: 'Rocket', label: 'Aventura & Adrenalina', category: 'lifestyle', keywords: ['aventura', 'radical', 'adrenalina', 'esporte radical'] },
  { name: 'Puzzle', label: 'Jogos de Tabuleiro & Quebra-Cabeça', category: 'lifestyle', keywords: ['tabuleiro', 'quebra cabeca', 'jogos de mesa'] },
  { name: 'Milestone', label: 'Conquistas & Marcos', category: 'lifestyle', keywords: ['conquista', 'marco', 'objetivo alcancado'] },
  { name: 'Blocks', label: 'Brinquedos de Montar', category: 'lifestyle', keywords: ['lego', 'blocos', 'montar', 'brinquedo'] },

  // ─── FAMÍLIA, PETS & PESSOAL ───
  { name: 'Users', label: 'Família & Dependentes', category: 'family', keywords: ['familia', 'filhos', 'pensao', 'mesada', 'pais', 'conjuge'] },
  { name: 'User', label: 'Pessoal & Individual', category: 'family', keywords: ['pessoal', 'meus gastos', 'individual'] },
  { name: 'Baby', label: 'Bebê & Maternidade', category: 'family', keywords: ['bebe', 'fraldas', 'bercario', 'enxoval', 'pediatra', 'maternidade'] },
  { name: 'Dog', label: 'Cachorro & Pet', category: 'family', keywords: ['pet', 'cachorro', 'veterinario', 'racao', 'pet shop', 'banho e tosa'] },
  { name: 'Cat', label: 'Gato & Felinos', category: 'family', keywords: ['gato', 'felino', 'veterinario', 'racao gato', 'areia'] },
  { name: 'Gift', label: 'Presentes & Lembranças', category: 'family', keywords: ['presente', 'natal', 'lembrancinha', 'casamento', 'dia das maes'] },
  { name: 'ShoppingBag', label: 'Roupas & Moda', category: 'family', keywords: ['roupa', 'vestuario', 'loja', 'shopping', 'zara', 'calcados', 'tenis'] },
  { name: 'Shirt', label: 'Vestuário & Acessórios', category: 'family', keywords: ['camisa', 'camiseta', 'calca', 'terno', 'costureira'] },
  { name: 'Watch', label: 'Relógios & Joias', category: 'family', keywords: ['relogio', 'joia', 'alianca', 'ourives', 'acessorio'] },
  { name: 'Glasses', label: 'Óculos & Visual', category: 'family', keywords: ['oculos de sol', 'estilo', 'acessorios'] },
  { name: 'Footprints', label: 'Calçados & Sapatos', category: 'family', keywords: ['sapato', 'tenis', 'chinelo', 'sandalia', 'calcado'] },
  { name: 'SmilePlus', label: 'Autoestima & Estética', category: 'family', keywords: ['botox', 'estetica', 'skincare', 'massagem', 'spa'] },
  { name: 'UserPlus', label: 'Novo Membro / Adoção', category: 'family', keywords: ['adocao', 'novo membro', 'agregado'] },
  { name: 'Handshake', label: 'Pensão & Acordos', category: 'family', keywords: ['pensao', 'acordo', 'divisao de despesas'] },
  { name: 'HandHeart', label: 'Cuidados & Voluntariado', category: 'family', keywords: ['cuidador', 'voluntariado', 'ajuda ao proximo'] },
  { name: 'PawPrint', label: 'Pet Genérico', category: 'family', keywords: ['pet', 'animal de estimacao', 'patinha'] },
  { name: 'Rabbit', label: 'Coelho & Roedores', category: 'family', keywords: ['coelho', 'roedor', 'hamster', 'pet pequeno'] },
  { name: 'Bird', label: 'Aves & Pássaros', category: 'family', keywords: ['passaro', 'ave', 'calopsita', 'gaiola'] },
  { name: 'Turtle', label: 'Répteis & Aquário', category: 'family', keywords: ['tartaruga', 'reptil', 'aquario', 'peixe ornamental'] },

  // ─── FÉ & COMUNIDADE ───
  { name: 'Church', label: 'Dízimos & Ofertas', category: 'faith', keywords: ['igreja', 'dizimo', 'oferta', 'ministerio', 'culto', 'templo'] },
  { name: 'Cross', label: 'Fé & Espiritualidade', category: 'faith', keywords: ['cruz', 'cristao', 'fe', 'religiao', 'retiro'] },
  { name: 'BookHeart', label: 'Bíblia & Teologia', category: 'faith', keywords: ['biblia', 'estudo biblico', 'devocional', 'teologia'] },
  { name: 'Sun', label: 'Missões & Esperança', category: 'faith', keywords: ['missoes', 'missionario', 'evangelismo', 'acao social'] },
  { name: 'Star', label: 'Destaque & Propósito', category: 'faith', keywords: ['proposito', 'chamado', 'vida'] },

  // ─── SERVIÇOS, ASSINATURAS & UTILIDADES ───
  { name: 'Globe', label: 'Serviços Online / Domínios', category: 'services', keywords: ['site', 'dominio', 'hospedagem', 'nuvem', 'cloud', 'aws'] },
  { name: 'Phone', label: 'Telefonia / Celular', category: 'services', keywords: ['plano celular', 'vivo', 'claro', 'tim', 'recarga', 'telefone'] },
  { name: 'Smartphone', label: 'Smartphones & Gadgets', category: 'services', keywords: ['iphone', 'celular', 'manutencao celular', 'acessorios tech'] },
  { name: 'Mail', label: 'Correios & Encomendas', category: 'services', keywords: ['correios', 'sedex', 'envio', 'frete', 'taxa correios'] },
  { name: 'Inbox', label: 'Assinaturas Digitais', category: 'services', keywords: ['email', 'google drive', 'icloud', 'dropbox', 'onedrive'] },
  { name: 'Cloud', label: 'Armazenamento em Nuvem', category: 'services', keywords: ['icloud', 'google one', 'drive', 'backup'] },
  { name: 'Server', label: 'Servidores & Infraestrutura', category: 'services', keywords: ['servidor', 'vps', 'infraestrutura', 'ti'] },
  { name: 'ShieldCheck', label: 'Seguros & Proteções', category: 'services', keywords: ['seguro de vida', 'seguro celular', 'garantia estendida'] },
  { name: 'Tag', label: 'Diversos / Outros', category: 'services', keywords: ['outros', 'geral', 'diversos', 'sem categoria'] },
  { name: 'Sliders', label: 'Personalizações', category: 'services', keywords: ['ajustes', 'parametros', 'configuracoes'] },
  { name: 'Settings', label: 'Manutenção Geral & Serviços', category: 'services', keywords: ['servico', 'prestador', 'mao de obra'] },
  { name: 'Layers', label: 'Pacotes & Combos', category: 'services', keywords: ['combo', 'pacote', 'agrupamento'] },
  { name: 'Package', label: 'Compras Online & Entregas', category: 'services', keywords: ['mercado livre', 'shopee', 'shein', 'entrega', 'encomenda'] },
  { name: 'Bell', label: 'Notificações & Lembretes', category: 'services', keywords: ['aviso', 'notificacao', 'alerta'] },
  { name: 'QrCode', label: 'Pix & Pagamentos Digitais', category: 'services', keywords: ['pix', 'qrcode', 'pagamento digital'] },
  { name: 'MonitorSmartphone', label: 'Multitelas & Combos Streaming', category: 'services', keywords: ['multitelas', 'combo streaming', 'assinatura combinada'] },
  { name: 'Tablet', label: 'Tablet', category: 'services', keywords: ['tablet', 'ipad', 'eletronico'] },
  { name: 'Keyboard', label: 'Periféricos de Computador', category: 'services', keywords: ['teclado', 'periferico', 'acessorio pc'] },
  { name: 'Mouse', label: 'Mouse & Acessórios', category: 'services', keywords: ['mouse', 'periferico', 'acessorio pc'] },
  { name: 'Printer', label: 'Impressora & Suprimentos', category: 'services', keywords: ['impressora', 'tinta', 'toner', 'papel'] },
  { name: 'SquareStack', label: 'Pacotes de Assinaturas', category: 'services', keywords: ['pacote', 'assinaturas', 'agrupamento de servicos'] },
];

// Lista combinada: ícones genéricos (Lucide) + logomarcas de marcas famosas, usada na busca e nos grupos "Todos"/"Marcas".
export const ALL_ICONS: IconItem[] = [...CATEGORY_ICONS, ...BRAND_ICONS];

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  label?: string;
  color?: string;
  /** Grupo inicial já aberto ao montar (ex: 'brands' para o seletor de ícone de cartão). Padrão: 'all'. */
  initialGroup?: string;
}

export function IconSelector({ selectedIcon, onSelect, label, color = '#0D9488', initialGroup = 'all' }: IconSelectorProps) {
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const getContrastColor = (hexColor: string) => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16) || 0;
    const g = parseInt(hexColor.slice(3, 5), 16) || 0;
    const b = parseInt(hexColor.slice(5, 7), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
  };

  const contrastColor = getContrastColor(color);

  const selectGroupAndCenter = (groupId: string) => {
    setActiveGroup(groupId);
    const btn = tabButtonRefs.current[groupId];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleNextGroup = () => {
    const currentIndex = ICON_GROUPS.findIndex(g => g.id === activeGroup);
    const nextIndex = (currentIndex + 1) % ICON_GROUPS.length;
    selectGroupAndCenter(ICON_GROUPS[nextIndex].id);
  };

  const handlePrevGroup = () => {
    const currentIndex = ICON_GROUPS.findIndex(g => g.id === activeGroup);
    const prevIndex = (currentIndex - 1 + ICON_GROUPS.length) % ICON_GROUPS.length;
    selectGroupAndCenter(ICON_GROUPS[prevIndex].id);
  };

  const filteredIcons = useMemo(() => {
    let list: IconItem[] = ALL_ICONS;

    if (activeGroup !== 'all') {
      list = list.filter(item => item.category === activeGroup);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.keywords?.some(k => k.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeGroup, searchQuery]);

  const activeIconItem = useMemo(() => {
    return ALL_ICONS.find(i => i.name === selectedIcon) || {
      name: selectedIcon,
      label: selectedIcon,
      category: 'services'
    };
  }, [selectedIcon]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">
            {label}
          </Label>
        )}
        <span className="text-[10px] font-bold text-muted-foreground">
          {filteredIcons.length} {filteredIcons.length === 1 ? 'ícone' : 'ícones'}
        </span>
      </div>

      {/* Busca Rápida */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          type="text"
          placeholder="Buscar ícone (ex: comida, carro, streaming...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 pr-6 text-xs font-medium rounded-lg border border-border/40 bg-background focus:ring-2 focus:ring-primary/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Navegador de Categorias com Setas + Swipe Touch */}
      <div className="flex items-center gap-1 w-full">
        <button
          type="button"
          onClick={handlePrevGroup}
          aria-label="Categoria anterior"
          className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted active:scale-90 border border-border/50 flex items-center justify-center text-foreground shrink-0 transition-all shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabsScrollRef}
          className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar py-1 overscroll-x-contain touch-pan-x"
        >
          {ICON_GROUPS.map((group) => {
            const isActive = activeGroup === group.id;
            return (
              <button
                key={group.id}
                ref={(el) => (tabButtonRefs.current[group.id] = el)}
                type="button"
                onClick={() => selectGroupAndCenter(group.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                    : "bg-muted/20 text-muted-foreground border-border/40 hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {group.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNextGroup}
          aria-label="Próxima categoria"
          className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted active:scale-90 border border-border/50 flex items-center justify-center text-foreground shrink-0 transition-all shadow-xs"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid de Ícones Compacto com Background Visível e Alto Contraste.
          Altura FIXA (não max-h): assim o card não muda de tamanho ao trocar de grupo/busca,
          o que fazia o popover "pular" de lugar (o Radix reposiciona quando o conteúdo redimensiona).
          overflow-y-auto puro e simples: rola com a roda do mouse no desktop e com o dedo no celular. */}
      <div className="p-2 bg-muted/15 rounded-xl border border-border/40 h-48 overflow-y-auto shadow-inner">
        {filteredIcons.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground space-y-0.5">
            <p className="text-xs font-bold">Nenhum ícone encontrado</p>
            <p className="text-[10px]">Tente buscar por outro termo</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-start gap-1.5">
            {filteredIcons.map((icon) => {
              const isBrand = icon.name.startsWith('brand:');
              const IconComponent = !isBrand ? ((LucideIcons as any)[icon.name] || LucideIcons.Tag) : null;
              const isSelected = selectedIcon === icon.name;

              return (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => onSelect(icon.name)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 relative",
                    isSelected
                      ? "shadow-sm scale-105 ring-2 ring-offset-1 ring-offset-background"
                      : "bg-background/80 hover:bg-background text-foreground/80 hover:text-foreground hover:scale-105 border border-border/40"
                  )}
                  style={isSelected ? {
                    backgroundColor: color,
                    color: contrastColor,
                    ringColor: color,
                    boxShadow: color?.toLowerCase() === '#18181b' ? '0 0 0 2px rgba(255,255,255,0.4)' : undefined
                  } : {}}
                  title={icon.label}
                >
                  {isBrand ? (
                    <BrandIconRenderer iconName={icon.name} className="w-4 h-4" />
                  ) : (
                    <IconComponent className={cn("w-4 h-4", isSelected ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview do Ícone Selecionado */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/40 text-xs">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 shadow-xs border border-white/20"
          style={{ backgroundColor: color, color: contrastColor }}
        >
          <IconRenderer iconName={selectedIcon} className="w-3.5 h-3.5 stroke-[2.2px]" />
        </div>
        <p className="text-[11px] font-bold text-foreground truncate flex-1">
          {activeIconItem.label}
        </p>
      </div>
    </div>
  );
}

// Helper para renderizar o ícone pelo nome (ícones genéricos Lucide ou logomarcas de marcas, prefixadas com "brand:")
export function IconRenderer({ iconName, className, style }: { iconName: string; className?: string; style?: React.CSSProperties }) {
  if (iconName?.startsWith('brand:')) {
    return <BrandIconRenderer iconName={iconName} className={className} style={style} />;
  }
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;
  return <IconComponent className={className} style={style} />;
}
