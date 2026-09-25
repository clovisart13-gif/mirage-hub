// Source of truth for the heads of indexable public pages and campaign aliases.
// Keep campaign paths live: some paid links still point to /lp-sistema-mirage.
export const PUBLIC_PAGES = {
  "/": {
    title: "Mirage Hub | Gestão para Confecções e Indústria Têxtil",
    description: "Gerencie produção, pedidos, produtos e relacionamento comercial em uma plataforma para confecções e negócios da indústria têxtil.",
    canonical: "/",
  },
  "/lp-sistema": {
    title: "Sistema de Gestão para Confecção | Mirage Hub",
    description: "Conheça o Mirage Hub: Kanban de produção, fichas técnicas, orçamento e CRM para organizar a operação da sua confecção.",
    canonical: "/lp-sistema-mirage",
  },
  "/lp-sistema-mirage": {
    title: "Sistema de Gestão para Confecção | Mirage Hub",
    description: "Conheça o Mirage Hub: Kanban de produção, fichas técnicas, orçamento e CRM para organizar a operação da sua confecção.",
    canonical: "/lp-sistema-mirage",
  },
  "/kanban-producao-confeccao": {
    title: "Kanban de Produção para Confecção | Mirage Hub",
    description: "Controle a produção da sua confecção em um Kanban de 14 etapas, da fila de espera ao faturamento, com prazo, quantidades, perdas e custo de mão de obra por fase.",
    canonical: "/kanban-producao-confeccao",
  },
  "/planos": {
    title: "Planos do Mirage Hub | Gestão para Confecções",
    description: "Compare os planos do Mirage Hub e escolha os recursos de gestão de produção, produtos e vendas adequados à sua operação.",
    canonical: "/planos",
  },
  "/moda-conecta/fundadores": {
    title: "Moda Conecta para Fundadores | Mirage Hub",
    description: "Conheça a fase de fundadores do Moda Conecta e saiba como participar da comunidade de negócios da moda.",
    canonical: "/moda-conecta/fundadores",
  },
  "/lp-modaconecta": {
    title: "Moda Conecta para Fundadores | Mirage Hub",
    description: "Conheça a fase de fundadores do Moda Conecta e saiba como participar da comunidade de negócios da moda.",
    canonical: "/moda-conecta/fundadores",
  },
  "/lp-black-friday": {
    title: "Black Friday Mirage Hub | Condições para Confecções",
    description: "Confira as condições da campanha Black Friday do Mirage Hub para gestão de produção e negócios da moda.",
    canonical: "/lp-black-friday",
    robots: "noindex, follow",
  },
  "/lp-black-mirage": {
    title: "Black Friday Mirage Hub | Condições para Confecções",
    description: "Confira as condições da campanha Black Friday do Mirage Hub para gestão de produção e negócios da moda.",
    canonical: "/lp-black-friday",
    robots: "noindex, follow",
  },
  "/privacidade": {
    title: "Política de Privacidade | Mirage Hub",
    description: "Leia a política de privacidade do Mirage Hub e saiba como os dados pessoais são tratados em nossos serviços.",
    canonical: "/privacidade",
  },
  "/termos": {
    title: "Termos de Serviço | Mirage Hub",
    description: "Consulte os termos de serviço do Mirage Hub e as condições de uso da plataforma.",
    canonical: "/termos",
  },
};

export const SEO_ORIGIN = "https://www.gestaomirage.com.br";