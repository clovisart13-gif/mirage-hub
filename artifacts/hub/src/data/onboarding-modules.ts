export interface OnboardingStep {
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
}

export interface OnboardingModule {
  id: string;
  title: string;
  tagline: string;
  description: string;
  targetAudience: string;
  howToStart: string;
  firstSteps: OnboardingStep[];
  practicalGain: string;
  timeToValue: string;
  ctaLabel: string;
  ctaUrl: string;
  color: string;
  icon: string;
}

export const ONBOARDING_MODULES: OnboardingModule[] = [
  {
    id: "moda-conecta",
    title: "Moda Conecta",
    tagline: "Seja encontrado por quem já está buscando o que você oferece.",
    description:
      "O Moda Conecta é o diretório especializado de fornecedores do setor têxtil brasileiro. Facções, estamparias, bordados, lavanderias e dezenas de outras especialidades num só lugar — organizado, verificado e gratuito para entrar.",
    targetAudience:
      "Fornecedores de serviços têxteis (facções, estamparias, bordados, lavanderias, modelagem, aviamentos, etc.) que querem ser encontrados por confecções e marcas de moda.",
    howToStart:
      "Preencha o formulário de cadastro com seus dados, serviços e portfólio. Nossa equipe analisa em até 2 dias úteis. Após aprovação, seu perfil fica público no diretório e confeccionistas começam a te encontrar.",
    firstSteps: [
      {
        title: "Crie seu perfil",
        description: "Preencha dados básicos: nome da empresa, CNPJ/CPF, cidade e contato.",
        action: "Iniciar cadastro",
        actionUrl: "/hub/comunidade/cadastro-fornecedor",
      },
      {
        title: "Descreva seus serviços",
        description: "Informe os tipos de serviço, maquinário disponível e capacidade mínima de produção.",
      },
      {
        title: "Adicione portfólio",
        description: "Faça upload de fotos de trabalhos anteriores — quanto mais visual, melhor a conversão.",
      },
      {
        title: "Aguarde a aprovação",
        description: "Nossa equipe valida o cadastro em até 2 dias úteis. Você recebe um e-mail de confirmação.",
      },
      {
        title: "Ative e divulgue",
        description: "Com o perfil ativo, compartilhe seu link para potencializar a visibilidade.",
      },
    ],
    practicalGain:
      "Seu perfil aparece para centenas de confeccionistas que buscam exatamente o que você oferece, filtrado por especialidade e localidade. Zero comissão sobre contatos ou pedidos.",
    timeToValue: "Primeiros contatos em 24–48h após aprovação",
    ctaLabel: "Cadastrar como fornecedor",
    ctaUrl: "/hub/comunidade/cadastro-fornecedor",
    color: "from-violet-600 to-indigo-700",
    icon: "🧵",
  },
  {
    id: "kanban",
    title: "Kanban de Produção",
    tagline: "Veja cada pedido avançar — do recebimento à entrega — num quadro visual.",
    description:
      "O Kanban organiza toda a produção em 14 etapas sequenciais. Cada pedido é um card que você move entre colunas conforme a produção avança. Integrado com financeiro, estoque, clientes e fornecedores.",
    targetAudience:
      "Confecções e facções que gerenciam múltiplos pedidos simultâneos e precisam de visibilidade do status de produção em tempo real.",
    howToStart:
      "Acesse Hub → Kanban → Pedidos e crie seu primeiro pedido. Em minutos você terá o fluxo de produção visível e controlado.",
    firstSteps: [
      {
        title: "Configure as etapas",
        description: "O sistema vem com 14 etapas padrão. Personalize os nomes em Configurações → Kanban se necessário.",
        action: "Ver Kanban",
        actionUrl: "/hub/kanban",
      },
      {
        title: "Crie o primeiro pedido",
        description: "Informe cliente, referência, quantidade e prazo. O card entra automaticamente na etapa 1.",
        action: "Criar pedido",
        actionUrl: "/hub/kanban/pedidos",
      },
      {
        title: "Mova os cards",
        description: "Arraste os cards entre colunas ou clique em 'Avançar' para registrar o progresso.",
      },
      {
        title: "Integre com financeiro",
        description: "Configure contas a pagar para fornecedores vinculados a cada etapa da produção.",
        action: "Ver contas a pagar",
        actionUrl: "/hub/kanban/contas-a-pagar",
      },
    ],
    practicalGain:
      "Você para de perder prazo porque sabe exatamente onde está cada pedido. Clientes satisfeitos, operação organizada.",
    timeToValue: "Operação no ar no mesmo dia",
    ctaLabel: "Abrir Kanban",
    ctaUrl: "/hub/kanban",
    color: "from-blue-600 to-sky-600",
    icon: "📋",
  },
  {
    id: "plm",
    title: "PLM — Gestão de Produto",
    tagline: "Do conceito ao produto final: tudo documentado, rastreável e acessível.",
    description:
      "O PLM (Product Lifecycle Management) controla todo o ciclo de vida dos seus produtos. Fichas técnicas, modelagens, materiais & custos, pilotagem e aprovações de coleção — tudo num lugar só, com geração automática de códigos.",
    targetAudience:
      "Marcas de moda e confecções que desenvolvem coleções próprias e precisam documentar e controlar as especificações dos produtos para replicação fiel na produção.",
    howToStart:
      "Acesse Hub → PLM → Produtos e cadastre o primeiro produto. O sistema gera um código automático (ex: CAM-0001) e a partir daí você constrói a ficha técnica completa.",
    firstSteps: [
      {
        title: "Cadastre um produto",
        description: "Crie o registro base do produto com nome, categoria, temporada e preço estimado.",
        action: "Novo produto",
        actionUrl: "/hub/plm/produtos",
      },
      {
        title: "Crie a ficha técnica",
        description: "Documente medidas, grade, materiais, acabamentos e instruções de lavagem.",
        action: "Nova ficha",
        actionUrl: "/hub/plm/fichas",
      },
      {
        title: "Monte a lista de materiais e custos",
        description: "Vincule matérias-primas, aviamentos e serviços terceirizados com quantidades e preços.",
        action: "Abrir Materiais & Custos",
        actionUrl: "/hub/plm/bom",
      },
      {
        title: "Registre a pilotagem",
        description: "Documente o resultado da primeira peça piloto com fotos e observações.",
        action: "Ver pilotagem",
        actionUrl: "/hub/plm/pilotagem",
      },
    ],
    practicalGain:
      "Sua produção passa a trabalhar com especificações claras, reduzindo retrabalho, desperdício de material e atrasos por dúvidas técnicas.",
    timeToValue: "Primeiras fichas técnicas em 1–2 horas",
    ctaLabel: "Abrir PLM",
    ctaUrl: "/hub/plm",
    color: "from-emerald-600 to-teal-600",
    icon: "📐",
  },
  {
    id: "custos",
    title: "Custos e Orçamentos",
    tagline: "Saiba exatamente quanto custa cada peça e venda com margem real.",
    description:
      "O módulo de Custos calcula o custo real de cada peça (matéria-prima + mão de obra + overhead) e gera orçamentos profissionais em PDF. Envie propostas por e-mail ou WhatsApp e acompanhe aprovações.",
    targetAudience:
      "Confecções e facções que precisam precificar com precisão e profissionalizar o envio de orçamentos para clientes.",
    howToStart:
      "Acesse Hub → Custos → Fichas de Custo e crie a primeira ficha. Em 20 minutos você tem o custo real de uma peça calculado.",
    firstSteps: [
      {
        title: "Crie a primeira ficha de custo",
        description: "Liste materiais, quantidades e preços. Informe horas de mão de obra por etapa.",
        action: "Nova ficha",
        actionUrl: "/hub/custos/fichas",
      },
      {
        title: "Configure overhead",
        description: "Adicione custos fixos (aluguel, energia, etc.) distribuídos por peça produzida.",
      },
      {
        title: "Defina sua margem",
        description: "Informe a margem de lucro desejada e veja o preço de venda sugerido automaticamente.",
      },
      {
        title: "Gere e envie um orçamento",
        description: "Use a ficha para criar um orçamento com layout profissional e envie ao cliente.",
        action: "Criar orçamento",
        actionUrl: "/hub/custos/orcamentos",
      },
    ],
    practicalGain:
      "Você para de 'chutar' preço. Cada orçamento parte de um custo real calculado, protegendo sua margem e profissionalizando a relação com clientes.",
    timeToValue: "Primeiro orçamento enviável em 30 minutos",
    ctaLabel: "Abrir Custos",
    ctaUrl: "/hub/custos/fichas",
    color: "from-amber-500 to-orange-500",
    icon: "💰",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    tagline: "Números claros para decisões mais rápidas.",
    description:
      "O módulo de Relatórios oferece 6 visões diferentes do seu negócio: KPIs gerais, BI de vendas com exportação Excel, controle de produção, visão por cliente, histórico e gestão de contas a receber com emissão de cobranças.",
    targetAudience:
      "Gestores e proprietários que precisam de visibilidade financeira e de produção para tomar decisões embasadas em dados.",
    howToStart:
      "Acesse Hub → Relatórios. Os dados são populados automaticamente a partir dos pedidos e movimentações nos outros módulos.",
    firstSteps: [
      {
        title: "Explore os KPIs gerais",
        description: "Veja faturamento do período, ticket médio e performance por cliente na aba Geral.",
        action: "Ver relatórios",
        actionUrl: "/hub/relatorios",
      },
      {
        title: "Analise as vendas com BI",
        description: "Use a aba 'BI de Vendas' para cruzar dados de produto, cliente e período.",
      },
      {
        title: "Exporte para Excel",
        description: "Baixe os dados em planilha para análises personalizadas ou apresentações.",
      },
      {
        title: "Gerencie contas a receber",
        description: "Na aba 'Contas a Receber', visualize inadimplência e emita cobranças diretamente.",
      },
    ],
    practicalGain:
      "Você tem uma foto clara do negócio a qualquer momento — sem depender de planilhas manuais ou palpites.",
    timeToValue: "Dados disponíveis assim que os pedidos são lançados",
    ctaLabel: "Abrir Relatórios",
    ctaUrl: "/hub/relatorios",
    color: "from-purple-600 to-violet-600",
    icon: "📊",
  },
];
