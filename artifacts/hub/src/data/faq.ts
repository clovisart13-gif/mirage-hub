export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  modules: string[];
}

export const FAQ_CATEGORIES = [
  { id: "hub", label: "Sobre o Hub Mirage" },
  { id: "planos", label: "Planos e assinatura" },
  { id: "cobranca", label: "Cobrança e cancelamento" },
  { id: "modulos", label: "Módulos do sistema" },
  { id: "financeiro", label: "Financeiro Mirage" },
  { id: "moda-conecta", label: "Moda Conecta" },
  { id: "onboarding", label: "Onboarding" },
  { id: "suporte", label: "Suporte e acesso" },
  { id: "integracoes", label: "Integrações" },
];

export const FAQ_ITEMS: FaqItem[] = [
  // ── Sobre o Hub Mirage ────────────────────────────────────────────────────
  {
    id: "hub-o-que-e",
    category: "hub",
    question: "O que é o Hub Mirage?",
    answer:
      "O Hub Mirage é uma plataforma SaaS de gestão completa para confecções e fornecedores do setor têxtil brasileiro. Reúne em um único lugar: Kanban de produção, PLM (gestão do ciclo de vida do produto), gestão de custos e orçamentos, CRM de clientes, relatórios financeiros e de produção, e o Moda Conecta — diretório de fornecedores especializados.",
    tags: ["hub", "plataforma", "gestão", "confecção"],
    modules: [],
  },
  {
    id: "hub-para-quem",
    category: "hub",
    question: "Para quem é o Hub Mirage?",
    answer:
      "O Hub Mirage foi criado para confecções, marcas de moda, facções e fornecedores do setor têxtil brasileiro. É ideal para empresas que querem organizar produção, controlar custos, gerenciar clientes e conectar-se com parceiros de forma integrada.",
    tags: ["público-alvo", "confecção", "moda", "fornecedor"],
    modules: [],
  },
  {
    id: "hub-diferencial",
    category: "hub",
    question: "Qual o diferencial do Hub Mirage em relação a outros ERPs?",
    answer:
      "O Hub Mirage é construído especificamente para o setor têxtil brasileiro, com fluxos de produção por Kanban, PLM especializado em vestuário, integração com o Moda Conecta (diretório de fornecedores) e relatórios pensados para a realidade da confecção. Não é um ERP genérico adaptado — é uma plataforma nativa do setor.",
    tags: ["diferencial", "erp", "têxtil", "kanban", "plm"],
    modules: [],
  },
  {
    id: "hub-acesso",
    category: "hub",
    question: "Como acesso o Hub Mirage?",
    answer:
      "Acesse em qualquer navegador moderno pelo link do seu tenant. Faça login com o e-mail e senha cadastrados. O Hub funciona totalmente na nuvem — sem instalação, sem servidor próprio.",
    tags: ["acesso", "login", "navegador"],
    modules: [],
  },

  // ── Planos e assinatura ───────────────────────────────────────────────────
  {
    id: "planos-quais",
    category: "planos",
    question: "Quais planos estão disponíveis?",
    answer:
      "O Hub Mirage oferece diferentes planos conforme o tamanho e necessidade da sua operação. Acesse /planos para ver os valores e recursos de cada opção. Todos os planos incluem acesso ao Moda Conecta.",
    tags: ["planos", "preço", "assinatura"],
    modules: [],
  },
  {
    id: "planos-trial",
    category: "planos",
    question: "Existe período de teste gratuito?",
    answer:
      "Sim. Fornecedores que se cadastram no Moda Conecta ganham 30 dias completos do Hub Mirage gratuitamente, sem precisar cadastrar cartão de crédito. Você só decide se assina após experimentar.",
    tags: ["trial", "gratuito", "teste", "30 dias"],
    modules: ["moda-conecta"],
  },
  {
    id: "planos-upgrade",
    category: "planos",
    question: "Posso mudar de plano a qualquer momento?",
    answer:
      "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor é calculado proporcionalmente ao período restante do ciclo atual.",
    tags: ["upgrade", "downgrade", "mudar plano"],
    modules: [],
  },

  // ── Cobrança e cancelamento ───────────────────────────────────────────────
  {
    id: "cobranca-como",
    category: "cobranca",
    question: "Como funciona a cobrança?",
    answer:
      "A cobrança é mensal, via boleto bancário ou cartão de crédito. O vencimento é fixo a partir da data de ativação da assinatura. Você recebe notificação por e-mail antes de cada vencimento.",
    tags: ["cobrança", "boleto", "cartão", "pagamento"],
    modules: [],
  },
  {
    id: "cobranca-cancelar",
    category: "cobranca",
    question: "Como cancelo minha assinatura?",
    answer:
      "Acesse Configurações → Assinatura dentro do Hub e clique em 'Cancelar assinatura'. O acesso permanece ativo até o fim do período já pago. Não há multa por cancelamento.",
    tags: ["cancelar", "cancelamento", "assinatura"],
    modules: [],
  },
  {
    id: "cobranca-reembolso",
    category: "cobranca",
    question: "Há reembolso em caso de cancelamento?",
    answer:
      "Não há reembolso proporcional para períodos já pagos. Após o cancelamento, o acesso continua disponível até o fim do ciclo vigente.",
    tags: ["reembolso", "devolução"],
    modules: [],
  },

  // ── Módulos do sistema ────────────────────────────────────────────────────
  {
    id: "modulos-kanban",
    category: "modulos",
    question: "O que é o Kanban de produção?",
    answer:
      "O Kanban é o módulo de controle de produção. Ele organiza os pedidos em 14 etapas — do recebimento à entrega — em um quadro visual onde você vê o status de cada peça em tempo real. Integrado com contas a pagar, estoque e clientes.",
    tags: ["kanban", "produção", "pedidos", "etapas"],
    modules: ["kanban"],
  },
  {
    id: "modulos-plm",
    category: "modulos",
    question: "O que é o PLM?",
    answer:
      "PLM (Product Lifecycle Management) é o módulo de gestão do ciclo de vida dos seus produtos. Controla fichas técnicas, modelagens, materiais, custos (lista de materiais e custos por peça), pilotagem e aprovações de coleção.",
    tags: ["plm", "ficha técnica", "produto", "modelagem"],
    modules: ["plm"],
  },
  {
    id: "modulos-custos",
    category: "modulos",
    question: "Como funciona o módulo de Custos?",
    answer:
      "O módulo de Custos permite criar fichas de custo e orçamentos detalhados. Calcula automaticamente custos de matéria-prima e mão de obra, gera PDFs profissionais e suporta envio por e-mail com fluxo de aprovação.",
    tags: ["custos", "orçamentos", "ficha de custo", "precificação"],
    modules: ["custos"],
  },
  {
    id: "modulos-relatorios",
    category: "modulos",
    question: "Quais relatórios o Hub oferece?",
    answer:
      "O módulo de Relatórios tem 6 abas: KPIs gerais, BI de vendas com exportação para Excel, controle de produção, visão por cliente, histórico e gestão de contas a receber com emissão de cobranças.",
    tags: ["relatórios", "bi", "excel", "kpi", "financeiro"],
    modules: ["relatorios"],
  },

  // ── Financeiro Mirage ─────────────────────────────────────────────────────
  {
    id: "fin-o-que-e",
    category: "financeiro",
    question: "O que é o Financeiro Mirage?",
    answer:
      "O Financeiro Mirage é o módulo de gestão financeira do Hub. Ele centraliza todas as movimentações bancárias da sua confecção: importação de extratos OFX, classificação automática de lançamentos por regras inteligentes, conciliação bancária, controle por centro de custo e um dashboard com saldo, receitas, despesas e resultado do mês — tudo sem planilha.",
    tags: ["financeiro", "extrato", "ofx", "fluxo de caixa", "bancário"],
    modules: ["financeiro"],
  },
  {
    id: "fin-ofx",
    category: "financeiro",
    question: "O que é um arquivo OFX e como importo?",
    answer:
      "OFX (Open Financial Exchange) é o formato de extrato bancário digital que todos os grandes bancos brasileiros disponibilizam. Para importar: acesse seu internet banking, vá em extratos, selecione o período desejado e baixe o arquivo .ofx. Depois acesse Financeiro Mirage → Importar OFX, arraste o arquivo e confirme. Em segundos todos os lançamentos aparecem classificados.",
    tags: ["ofx", "extrato", "importação", "banco", "bradesco", "itaú", "bb"],
    modules: ["financeiro"],
  },
  {
    id: "fin-regras",
    category: "financeiro",
    question: "Como funciona a classificação automática por regras?",
    answer:
      "Você cria regras do tipo 'Se a descrição contém TECIDOS → categoria Matéria-Prima'. Na primeira importação você classifica manualmente os lançamentos. O sistema sugere regras com base nos padrões que encontra. Na próxima importação, 90%+ dos lançamentos são classificados sozinhos. Você só revisa os novos.",
    tags: ["regras", "classificação automática", "categoria", "lançamento"],
    modules: ["financeiro"],
  },
  {
    id: "fin-contas",
    category: "financeiro",
    question: "Posso cadastrar mais de uma conta bancária?",
    answer:
      "Sim. Você pode cadastrar quantas contas quiser: conta corrente, conta poupança, caixa interno, cartão empresarial e outros. O dashboard mostra o saldo de cada conta separado e o saldo consolidado total. Cada importação OFX é vinculada à conta correspondente.",
    tags: ["conta bancária", "múltiplas contas", "saldo", "caixa"],
    modules: ["financeiro"],
  },
  {
    id: "fin-conciliacao",
    category: "financeiro",
    question: "O que é conciliação bancária no Financeiro Mirage?",
    answer:
      "Conciliação é o processo de comparar o saldo que o sistema registra com o saldo real do seu extrato bancário. Se houver diferença (lançamento não importado, ajuste manual, etc.), você registra o ajuste com motivo. O histórico de conciliações fica salvo para auditoria.",
    tags: ["conciliação", "saldo", "divergência", "auditoria"],
    modules: ["financeiro"],
  },
  {
    id: "fin-centros",
    category: "financeiro",
    question: "Para que servem os centros de custo?",
    answer:
      "Centros de custo permitem rastrear onde cada real está sendo gasto na sua empresa. Você pode criar categorias como Produção, Comercial, Administrativo e Logística. Ao classificar cada lançamento com um centro de custo, você vê relatórios separados por área — não apenas o total da empresa.",
    tags: ["centro de custo", "departamento", "controle", "área"],
    modules: ["financeiro"],
  },
  {
    id: "fin-plano",
    category: "financeiro",
    question: "O Financeiro Mirage está incluído no meu plano?",
    answer:
      "O Financeiro Mirage está disponível nos planos Pro e Enterprise. Se você está no plano Starter, pode contratar o módulo separadamente por R$97/mês. Acesse Configurações → Assinatura ou entre em contato pelo chat para ativar.",
    tags: ["plano", "acesso", "pro", "enterprise", "preço"],
    modules: ["financeiro"],
  },

  // ── Moda Conecta ─────────────────────────────────────────────────────────
  {
    id: "mc-o-que-e",
    category: "moda-conecta",
    question: "O que é o Moda Conecta?",
    answer:
      "O Moda Conecta é o diretório especializado de fornecedores do setor têxtil brasileiro dentro do Hub Mirage. Conecta confecções e marcas com facções, estamparias, bordados, lavanderias, modelagem e outros fornecedores especializados. O cadastro é gratuito para fornecedores.",
    tags: ["moda conecta", "diretório", "fornecedores", "comunidade"],
    modules: ["moda-conecta"],
  },
  {
    id: "mc-cadastro",
    category: "moda-conecta",
    question: "Como me cadastro como fornecedor no Moda Conecta?",
    answer:
      "Acesse /hub/comunidade/landing e clique em 'Cadastrar gratuitamente'. Preencha o formulário com seus serviços, maquinário, capacidade e portfólio. Nossa equipe analisa e aprova em até 2 dias úteis. Você recebe um convite por e-mail assim que aprovado.",
    tags: ["cadastro", "fornecedor", "aprovação"],
    modules: ["moda-conecta"],
  },
  {
    id: "mc-gratuito",
    category: "moda-conecta",
    question: "O cadastro no Moda Conecta é mesmo gratuito?",
    answer:
      "Sim, 100% gratuito para fornecedores. Não há taxa de cadastro, mensalidade obrigatória nem comissão sobre pedidos. A conexão entre fornecedor e confeccionista é direta. O Moda Conecta ganha no volume de usuários ativos na plataforma.",
    tags: ["gratuito", "custo", "comissão"],
    modules: ["moda-conecta"],
  },
  {
    id: "mc-visibilidade",
    category: "moda-conecta",
    question: "Como confeccionistas encontram meu perfil?",
    answer:
      "Seu perfil aparece no diretório filtrado por tipo de serviço, localidade, especialidade e capacidade. Quanto mais completo for o cadastro, maior a visibilidade. Perfis verificados recebem um selo que aumenta a confiança dos compradores.",
    tags: ["visibilidade", "busca", "diretório", "perfil"],
    modules: ["moda-conecta"],
  },
  {
    id: "mc-aprovacao",
    category: "moda-conecta",
    question: "Por que meu cadastro precisa de aprovação?",
    answer:
      "A aprovação garante a qualidade do diretório. Verificamos que os dados são consistentes e que o fornecedor é legítimo. Isso protege tanto os compradores quanto os fornecedores sérios.",
    tags: ["aprovação", "verificação", "qualidade"],
    modules: ["moda-conecta"],
  },

  // ── Onboarding ────────────────────────────────────────────────────────────
  {
    id: "onboarding-inicio",
    category: "onboarding",
    question: "Por onde começo após criar minha conta?",
    answer:
      "Após criar sua conta, acesse o Hub e configure sua empresa em Configurações. Em seguida, explore os módulos conforme sua prioridade: se sua necessidade imediata é produção, comece pelo Kanban. Se é produto, comece pelo PLM. Se é fornecimento, configure o Moda Conecta.",
    tags: ["começar", "início", "configuração"],
    modules: [],
  },
  {
    id: "onboarding-time",
    category: "onboarding",
    question: "Quanto tempo leva para configurar o Hub?",
    answer:
      "A configuração básica leva menos de 30 minutos. Você pode começar a usar o Kanban e Custos no mesmo dia. A importação de dados históricos (se necessário) pode levar algumas horas dependendo do volume.",
    tags: ["tempo", "configuração", "implantação"],
    modules: [],
  },
  {
    id: "onboarding-migracao",
    category: "onboarding",
    question: "Posso importar dados do meu sistema atual?",
    answer:
      "Sim. O Hub suporta importação de clientes, fornecedores, fichas técnicas e pedidos via planilhas. Entre em contato com o suporte para receber o template e orientações de importação.",
    tags: ["migração", "importação", "dados", "planilha"],
    modules: [],
  },

  // ── Suporte e acesso ──────────────────────────────────────────────────────
  {
    id: "suporte-senha",
    category: "suporte",
    question: "Esqueci minha senha. Como recupero?",
    answer:
      "Na tela de login, clique em 'Esqueci minha senha'. Informe seu e-mail cadastrado e você receberá um link de recuperação em até 5 minutos. Verifique também a caixa de spam.",
    tags: ["senha", "recuperar", "login", "acesso"],
    modules: [],
  },
  {
    id: "suporte-usuarios",
    category: "suporte",
    question: "Posso adicionar outros usuários da minha empresa?",
    answer:
      "Sim. Acesse Configurações → Equipe e convide usuários por e-mail. Você pode definir diferentes níveis de acesso: proprietário, administrador, membro e visualizador.",
    tags: ["usuários", "equipe", "convite", "permissões"],
    modules: [],
  },
  {
    id: "suporte-contato",
    category: "suporte",
    question: "Como entro em contato com o suporte?",
    answer:
      "Pelo chat da Mira no canto inferior direito do site (disponível 24h para perguntas frequentes) ou pelo WhatsApp do suporte — disponível no rodapé do site. O suporte humano funciona em dias úteis das 9h às 18h.",
    tags: ["suporte", "contato", "whatsapp", "chat"],
    modules: [],
  },

  // ── Integrações ───────────────────────────────────────────────────────────
  {
    id: "int-vhsys",
    category: "integracoes",
    question: "O Hub integra com o VhSys ERP?",
    answer:
      "A integração com VhSys está em desenvolvimento. O módulo ERP dentro do Hub já prepara a estrutura de dados compatível. Entre em contato para ser avisado quando a integração for lançada.",
    tags: ["vhsys", "erp", "integração"],
    modules: ["erp"],
  },
  {
    id: "int-whatsapp",
    category: "integracoes",
    question: "Há integração com WhatsApp para envio de orçamentos?",
    answer:
      "Sim. O módulo de Orçamentos permite enviar propostas diretamente pelo WhatsApp. O cliente recebe um link com o orçamento formatado e pode aprovar ou solicitar ajustes.",
    tags: ["whatsapp", "orçamento", "envio"],
    modules: ["custos"],
  },
];
