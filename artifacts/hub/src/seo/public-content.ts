// Public, build-time copy only. Keep text identical to the visible public pages.
// No React, API calls, or external HTML belong in this module.
export const homeFaq = [
  { q: 'Já funciona de verdade?', a: 'Sim. O Mirage foi construído a partir das dores reais da R2PB, confecção com 20 anos de mercado, e já acompanha a produção em operação real.' },
  { q: 'É muito complexo para implantar?', a: 'Não. A implantação inicial é guiada e focada no que gera valor primeiro. A entrada na fase fundadora é acompanhada — não é você sozinho com um manual.' },
  { q: 'Serve para o tamanho da minha empresa?', a: 'Se sua operação está no universo da confecção, o Mirage foi desenhado exatamente para isso. Pequenas, médias e grandes confecções — o que muda é o plano, não a proposta.' },
  { q: 'Por que confiar agora?', a: 'O Mirage foi construído a partir das dores reais da R2PB, confecção com 20 anos de mercado. Cada módulo resolve um problema que a equipe viveu na produção.' },
  { q: 'Vocês acompanham a entrada?', a: 'Sim. A fase fundadora prevê entrada acompanhada e próxima. Os primeiros clientes têm acesso direto à equipe durante a implantação.' },
];

export const sistemaFaq = [
  { q: 'Qual o melhor sistema de Kanban para confecção?', a: 'O Kanban Mirage foi desenvolvido para o fluxo da confecção: 14 etapas, prazos visíveis nos cards, quantidades conferidas e histórico de movimentações. Conheça o quadro em /kanban-producao-confeccao.' },
  { q: 'Como o CRM com IA funciona para confecção?', a: 'O Robô SDR do CRM Mirage opera 24h no WhatsApp: recebe o lead, qualifica automaticamente com perguntas sobre volume, produto e prazo, e só passa para o closer humano quando o lead está pronto. Isso elimina o tempo perdido com leads frios e aumenta a taxa de conversão sem ampliar o time.' },
  { q: 'O que é PLM e por que minha confecção precisa?', a: 'PLM (Product Lifecycle Management) é a gestão digital do ciclo de vida do produto. Com o PLM Mirage você cria fichas técnicas estruturadas, monta o BOM (lista de materiais) por referência, envia aprovações de amostras online e mantém histórico de versões — tudo sem PDF, e-mail ou WhatsApp.' },
  { q: 'Como calcular o preço certo de cada peça?', a: 'O Orçamento Mirage calcula o custo real por referência considerando matéria-prima, CMO (custo de mão de obra integrado ao Kanban) e embalagem. Você vê exatamente quanto custa cada peça e simula diferentes margens antes de fechar o preço com o cliente.' },
  { q: 'O Mirage tem integração com ERP e NF-e?', a: 'Sim. No plano Enterprise há integração nativa com o VhSys (ERP parceiro), cobrindo financeiro, estoque, fiscal e emissão de NF-e. O pedido gerado no Kanban alimenta automaticamente o ERP sem reentrada de dados.' },
  { q: 'Serve para facção terceirista?', a: 'Sim. Facções usam o Kanban para rastrear OPs de múltiplos clientes simultaneamente, comunicar prazo de entrega em tempo real e gerar relatórios de capacidade por setor — sem ligação ou WhatsApp manual.' },
];

export const kanbanFaq = [
  { q: 'O que é Kanban de produção na confecção?', a: 'É um quadro com colunas para cada etapa da produção, como corte, costura e acabamento, em que cada ordem de produção é um card que avança conforme o trabalho anda. Ele mostra, num olhar, onde está cada pedido e onde a produção está acumulando.' },
  { q: 'Quais são as etapas do Kanban de produção do Mirage?', a: 'São 14: Início, Fila de Espera, Modelagem, Tecido, Risco, Corte, Beneficiamento, Costura, Lavanderia, Acabamento, Passadoria, Expedição, Faturamento e Concluído.' },
  { q: 'Dá para controlar facções terceirizadas no Kanban?', a: 'Sim. Cada movimentação registra o fornecedor ou facção que executou a etapa, a quantidade entregue e as perdas, e o custo de mão de obra da fase vira uma conta a pagar ao concluir.' },
  { q: 'Como o Kanban ajuda a reduzir atrasos na confecção?', a: 'Cada card mostra a data prevista e quantos dias está parado na etapa atual, e as ordens atrasadas ou urgentes se destacam. O relatório por fase mostra onde as ordens estão acumulando.' },
  { q: 'O Kanban controla perdas de peças durante a produção?', a: 'Sim. A cada mudança de etapa a equipe confere a quantidade recebida e registra perdas ou diferenças, e o card segue com a quantidade real.' },
  { q: 'Quanto custa o Kanban de produção do Mirage?', a: 'O Kanban de produção está incluído desde o plano Starter, de R$ 197 por mês, junto com o controle de custos. Veja todos os planos em /planos.' },
];

export const kanbanContent = {
  h1: 'Kanban de produção para confecção: cada ordem, em cada etapa, com prazo e quantidade',
  intro: 'O Kanban de produção do Mirage é um quadro visual em que cada ordem de produção da confecção vira um card que avança por 14 etapas, da fila de espera ao faturamento. Em cada passagem ficam registrados a data, a quantidade conferida, as perdas e o fornecedor ou facção responsável.',
  introExtra: ['Ele foi construído dentro de uma confecção de verdade: a R2PB, com 20 anos de mercado, que hoje acompanha a produção pelo mesmo Kanban.'],
  actions: [{ text: 'Começar teste grátis', href: '/criar-conta' }, { text: 'Ver planos', href: '/planos' }],
  sections: [
    {
      title: 'As 14 etapas do quadro',
      ordered: true,
      items: [
        'Início — a ordem de produção é aberta',
        'Fila de Espera — aguarda liberação para produzir',
        'Modelagem — desenvolvimento e ajuste dos moldes',
        'Tecido — separação e conferência da matéria-prima',
        'Risco — encaixe dos moldes para o corte',
        'Corte',
        'Beneficiamento — estampa, bordado e outros processos',
        'Costura',
        'Lavanderia',
        'Acabamento',
        'Passadoria',
        'Expedição',
        'Faturamento',
        'Concluído',
      ],
      paragraphs: ['Seis delas (Corte, Beneficiamento, Costura, Lavanderia, Acabamento e Passadoria) são fases produtivas com custo de mão de obra (CMO) por peça.'],
    },
    {
      title: 'O que fica registrado quando um card muda de etapa',
      items: [
        'Quantidade conferida — a equipe confere quantas peças chegaram na etapa e registra perdas ou diferenças; o card segue com a quantidade real, e não com a planejada.',
        'Fornecedor ou facção — cada movimentação pode indicar o parceiro que executou a etapa.',
        'Datas prevista e real — você vê o prazo de cada ordem e quais estão atrasadas.',
        'Quem moveu — a movimentação fica ligada ao usuário que a fez.',
        'Custo de mão de obra — ao concluir uma fase produtiva com fornecedor, o CMO vira uma conta a pagar.',
      ],
    },
    {
      title: 'Como o quadro mostra os problemas',
      items: [
        'Prazo e atraso visíveis no card — ordens atrasadas ou urgentes se destacam no quadro.',
        'Dias na etapa — mostra há quanto tempo cada ordem está parada na fase atual.',
        'Relatório por fase — quantas ordens foram iniciadas e concluídas e qual o saldo em cada etapa, para achar onde a produção está acumulando.',
      ],
    },
    {
      title: 'Kanban no sistema × planilha de produção',
      table: {
        headers: ['Planilha', 'Kanban do Mirage'],
        rows: [
          ['Onde está cada ordem', 'Alguém atualiza a linha à mão', 'O card está na coluna da etapa'],
          ['Peças perdidas no caminho', 'Raramente registradas', 'Conferidas e registradas a cada etapa'],
          ['Prazo', 'Precisa filtrar e comparar datas', 'O atraso aparece no próprio card'],
          ['Custo de facção', 'Controle separado', 'CMO por fase, vira conta a pagar'],
          ['Histórico', 'Sobrescrito a cada atualização', 'Cada movimentação fica guardada'],
        ],
      },
    },
    {
      title: 'Construído a partir da rotina da R2PB',
      paragraphs: [
        'O Mirage não nasceu de um escritório de software. Ele foi desenhado a partir das dores reais da R2PB, confecção com 20 anos de mercado: ordens que se perdiam entre corte, costura e facção, peças que sumiam no caminho e prazos que só apareciam quando já estavam estourados.',
        'Desde abril de 2026, a R2PB acompanha no Kanban do Mirage mais de 12 mil peças, em 156 cards de produção de 30 clientes.',
      ],
      note: 'Apuração: quantidades registradas nos cards do Kanban da R2PB em setembro de 2026, excluindo registros de teste.',
    },
  ],
  faqTitle: 'Perguntas frequentes',
  faq: kanbanFaq,
  finalCta: { text: 'Começar teste grátis', href: '/criar-conta' },
};

export const planosFaq = [
  { q: 'Posso combinar plano + módulos avulsos?', a: 'Sim! Você pode assinar um plano e adicionar módulos extras individualmente. Por exemplo, contratar o plano Pro e adicionar o ERP Mirage como módulo avulso.' },
  { q: 'O que é a taxa de implantação?', a: 'A taxa de implantação é um valor único cobrado na contratação de alguns módulos (Kanban, CRM e ERP) que cobre a configuração inicial, migração de dados e treinamento. Ao optar pelo plano anual, essa taxa é zerada.' },
  { q: 'Como funciona o desconto anual?', a: 'Ao escolher a cobrança anual, você paga 20% menos por mês e ainda ganha a taxa de implantação gratuita. O valor total do ano é cobrado de uma vez ou pode ser parcelado — entre em contato para saber mais.' },
  { q: 'Posso mudar de plano depois?', a: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, o valor é cobrado proporcionalmente. No downgrade, o crédito é aplicado na próxima fatura.' },
  { q: 'Preciso de cartão de crédito para testar?', a: 'Não. Você pode criar uma conta gratuita e explorar os módulos em modo trial por 14 dias, sem cartão.' },
  { q: 'O canal adicional serve para quê?', a: 'O canal adicional permite conectar mais contas de WhatsApp, Instagram ou outras redes sociais ao CRM Mirage. Cada número de WhatsApp ou perfil de rede social é um canal separado.' },
];

// The public /planos view gets its catalog from /billing/catalogo at runtime.
// The build script verifies these monthly prices against the catalog source.
export const publicPlanPrices = [
  { id: 'starter', name: 'Starter', monthly: 197, description: 'Para confecções que estão começando', apps: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta'], users: 'Até 3 usuários' },
  { id: 'pro', name: 'Pro', monthly: 397, description: 'Para confecções em crescimento', apps: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'PLM Mirage', 'Financeiro Mirage'], users: 'Até 10 usuários' },
  { id: 'enterprise', name: 'Enterprise', monthly: 797, description: 'Para grandes operações e redes de confecção', apps: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'PLM Mirage', 'CRM Mirage', 'ERP Mirage', 'Financeiro Mirage'], users: 'Usuários ilimitados' },
];

export const PUBLIC_CONTENT = {
  '/': {
    h1: 'O software que organiza a confecção de ponta a ponta.',
    intro: 'Produção, desenvolvimento, custos, relatórios e operação em um único ecossistema para a confecção brasileira.',
    sections: [
      { title: 'Gestão integrada para confecção brasileira', paragraphs: ['Ajudamos confecções a centralizar produção, desenvolvimento de produto, custos, relatórios e rotina operacional em um único software.', 'O Mirage foi construído a partir das dores reais da R2PB, confecção com 20 anos de mercado. Cada módulo resolve um problema que a equipe viveu na produção.'], items: ['20 anos — de confecção por trás do sistema', '14 etapas — da fila de espera ao faturamento', '+12 mil peças — acompanhadas no Kanban da R2PB', '6 fases — com custo de mão de obra por peça'] },
      { title: 'Produto em ação', paragraphs: ['4 módulos integrados que cobrem todo o fluxo da confecção — da peça ao pedido, do custo ao relatório.'], items: [
        'Kanban de Produção — Visibilidade total de cada ordem de produção em tempo real, com alertas de prazo automáticos.',
        'PLM — Desenvolvimento — Gerencie o ciclo completo de cada peça: briefing, modelagem, pilotagem e aprovação.',
        'Custos e Orçamentos — Ficha de custo precisa por referência, margem em tempo real e orçamentos enviados por e-mail.',
        'Relatórios e BI — Dashboard operacional com faturamento, OPs, prazo de entrega e exportação para Excel.',
      ] },
      { title: 'O que você acessa no teste gratuito', paragraphs: ['14 dias, sem cartão de crédito, ativação em menos de 1 minuto.'], items: ['Kanban de Produção', 'PLM — Desenvolvimento', 'Custos e Orçamentos', 'Relatórios e BI', 'Comunidade Moda Conecta'] },
      { title: '5 apps. 1 ecossistema.', paragraphs: ['Cada app resolve um problema real da sua confecção — e todos conversam entre si.'], items: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'CRM Mirage', 'ERP Mirage'] },
      { title: 'Inscrições abertas — Fase fundadora 2026', paragraphs: ['O Mirage Hub está abrindo a fase fundadora com entrada acompanhada, foco em implantação prática e proximidade com os primeiros clientes.'] },
      { title: 'Planos para cada fase do negócio', paragraphs: ['Comece pequeno, cresça sem trocar de sistema.', '14 dias grátis em qualquer plano • Sem cartão de crédito'], items: ['Starter — R$197/mês', 'Pro — R$397/mês', 'Enterprise — R$797/mês'] },
    ],
    faqTitle: 'Perguntas diretas, respostas diretas',
    faq: homeFaq,
  },
  '/lp-sistema-mirage': {
    h1: 'Sua confecção, conectada do primeiro contato à geração do pedido.',
    intro: 'Centralize a operação comercial e o desenvolvimento do produto em um sistema feito para a realidade da moda.',
    sections: [
      { title: 'A Jornada do Escritório à entrega do Pedido', paragraphs: ['WhatsApp para leads, planilha para orçamento, outro sistema para produção, e-mail para aprovação de ficha técnica. Cada ferramenta gera retrabalho, ruído e custo invisível.'], items: ['20 anos — de confecção por trás do sistema', '+12 mil peças — acompanhadas no Kanban da R2PB', 'CRM e Captação', 'Funil Comercial', 'PLM e Prototipagem', 'Orçamento', 'Aprovação e Pedido'] },
      { title: 'CRM e Captação', paragraphs: ['Robô SDR qualifica leads 24h no WhatsApp. Sua equipe comercial só entra quando o lead está pronto — sem perder tempo com contatos frios.'], items: ['Qualificação automática via IA', 'Histórico completo de cada lead', 'Handoff inteligente para o closer', 'Funil com visibilidade em tempo real'] },
      { title: 'Funil Comercial', paragraphs: ['Acompanhe cada negociação do primeiro contato ao pedido fechado. Saiba exatamente onde está cada oportunidade e quanto vale seu pipeline.'], items: ['Kanban de negociações', 'Alertas de oportunidades paradas', 'Previsão de faturamento', 'Integração direta com o Kanban de produção'] },
      { title: 'PLM e Prototipagem', paragraphs: ['Centralize fichas técnicas, BOM, modelagem e aprovação de coleção. Da ideia à aprovação do cliente sem e-mail, sem planilha.'], items: ['Ficha técnica digital', 'Gestão de BOM por referência', 'Aprovação de amostras online', 'Histórico de versões do produto'] },
      { title: 'Orçamento', paragraphs: ['Calcule o custo real de cada peça — matéria-prima, CMO, embalagem e margem. Nunca mais venda com prejuízo sem perceber.'], items: ['Custo por referência e quantidade', 'CMO integrado ao Kanban', 'Simulação de margem e precificação', 'Histórico de orçamentos aprovados'] },
      { title: 'Depois do pedido, o sistema não para.', items: ['Tempo real — Dados atualizados ao vivo — sem F5, sem aguardar relatório.', 'Tudo integrado — CRM → Kanban → PLM → Orçamento → ERP em um único fluxo.', 'IA no processo — Robô SDR, classificação de leads e alertas automáticos.'] },
      { title: 'Moda Conecta — Fase fundadora', paragraphs: ['Uma rede B2B para quem vive de moda: confecções, facções, fornecedores e profissionais do setor. Estamos abrindo agora o cadastro dos membros fundadores.'], items: ['Quero ser fundador'] },
    ],
    faqTitle: 'Dúvidas sobre o Sistema Mirage',
    faq: sistemaFaq,
  },
  '/kanban-producao-confeccao': kanbanContent,
  '/planos': {
    h1: 'Gestão completa para sua confecção',
    intro: 'Escolha o plano ideal ou monte exatamente o que você precisa. Sem surpresas, sem objeções.',
    sections: [
      { title: 'Planos', paragraphs: ['Mensal', 'Anual', '✅ Plano anual: 20% de desconto + taxa de implantação grátis'], plans: publicPlanPrices },
      { title: 'Monte seu pacote', paragraphs: ['Selecione apenas os módulos que você precisa. O total é calculado automaticamente.'] },
      { title: 'Add-ons & Extras', paragraphs: ['Já tem um plano ou pacote? Acrescente o que precisar sem mudar de contrato.'] },
    ],
    faqTitle: 'Perguntas Frequentes',
    faq: planosFaq,
  },
  '/moda-conecta/fundadores': {
    h1: 'Seja um dos primeiros a entrar no Moda Conecta',
    intro: 'A comunidade B2B do setor têxtil brasileiro que conecta marcas, confecções, facções, oficinas e fornecedores em uma rede qualificada de negócios.',
    sections: [
      { title: 'Pré-cadastro com curadoria.', paragraphs: ['Estamos reunindo os primeiros perfis da fase fundadora. Após análise, entraremos em contato com os próximos passos. O envio deste formulário não libera acesso imediato à plataforma.'] },
      { title: 'Fase Fundadora — Vagas Limitadas', items: ['Conexões qualificadas — Match direto entre quem precisa e quem oferece', 'Fase fundadora gratuita — Primeiros aprovados entram sem custo inicial', 'Curadoria ativa — Cada perfil é analisado antes do acesso'] },
      { title: 'Pré-cadastro — Fase Fundadora', paragraphs: ['Ao enviar, seu perfil entra em análise. O convite de acesso será enviado por e-mail após aprovação.'] },
    ],
  },
  '/privacidade': {
    h1: 'Política de Privacidade',
    intro: 'Última atualização: junho de 2026',
    sections: [
      { title: '1. Quem somos', paragraphs: ['O Mirage Hub é uma plataforma SaaS voltada ao mercado têxtil e de confecção brasileiro, desenvolvida pela Mirage Gestão & Tecnologia Ltda (CNPJ 67.660.591/0001-02), com sede em São Paulo/SP. Oferecemos ferramentas de gestão de produção, custos, vendas, marketing digital e comunidade B2B para confecções e fornecedores do setor.', 'Nosso site institucional e aplicativo estão disponíveis em: www.gestaomirage.com.br', 'Contato do responsável pelo tratamento de dados: privacidade@r2pb.com.br'] },
      { title: '2. Dados que coletamos', paragraphs: ['Coletamos apenas os dados necessários para prestar os serviços da plataforma:'], items: ['Dados de conta: nome, e-mail, telefone, CNPJ/CPF, dados da empresa.', 'Dados de uso: ações realizadas na plataforma, páginas visitadas, preferências.', 'Dados de integração com redes sociais: quando o usuário conecta conta do Instagram/Meta para uso do módulo de marketing, coletamos tokens de acesso, métricas de publicações e informações de perfil público, conforme autorizado pelo usuário.', 'Dados financeiros: informações de assinatura e pagamento, processados por gateway certificado (não armazenamos dados de cartão).', 'Comunicações: mensagens enviadas ao suporte e conteúdo compartilhado na comunidade.'] },
      { title: '3. Como usamos os dados', items: ['Fornecer, operar e melhorar os serviços da plataforma.', 'Gerenciar contas, assinaturas e comunicações.', 'Gerar relatórios e insights de marketing para os usuários conectados ao Instagram/Meta.', 'Cumprir obrigações legais e regulatórias.', 'Prevenir fraudes e garantir segurança.'], paragraphs: ['Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins publicitários.'] },
      { title: '4. Integração com Meta / Instagram', paragraphs: ['O módulo de marketing do Mirage Hub pode se integrar com a Meta Graph API e o Instagram Business API para publicação de conteúdo e análise de desempenho. Ao conectar sua conta:'], items: ['Solicitamos apenas as permissões necessárias para as funcionalidades ativadas.', 'Os tokens de acesso são armazenados de forma segura e criptografada.', 'Você pode revogar o acesso a qualquer momento nas configurações da plataforma ou diretamente no seu painel da Meta em facebook.com/settings.', 'Não utilizamos os dados do Instagram para fins que não sejam os solicitados pelo próprio usuário dentro da plataforma.'] },
      { title: '5. Compartilhamento de dados', items: ['Provedores de infraestrutura: serviços de hospedagem, banco de dados e armazenamento em nuvem.', 'APIs de terceiros: Meta, Instagram, gateways de pagamento — conforme autorizado pelo usuário.', 'Autoridades legais: quando exigido por lei ou ordem judicial.'] },
      { title: '6. Seus direitos (LGPD)', paragraphs: ['Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:', 'Para exercer seus direitos, envie solicitação para: privacidade@r2pb.com.br'], items: ['Confirmar a existência de tratamento dos seus dados.', 'Acessar seus dados pessoais.', 'Corrigir dados incompletos ou desatualizados.', 'Solicitar anonimização, bloqueio ou eliminação dos seus dados.', 'Solicitar a portabilidade dos dados.', 'Revogar consentimentos concedidos.'] },
      { title: '7. Retenção e exclusão de dados', paragraphs: ['Mantemos seus dados pelo tempo necessário para prestação dos serviços ou cumprimento de obrigações legais. Ao encerrar sua conta, seus dados são anonimizados ou excluídos em até 90 dias, salvo exigência legal em contrário. Para solicitação imediata de exclusão, acesse: /exclusao-de-dados'] },
      { title: '8. Cookies', paragraphs: ['Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento para publicidade de terceiros.'] },
      { title: '9. Segurança', paragraphs: ['Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição, incluindo criptografia em trânsito (TLS) e em repouso.'] },
      { title: '10. Contato', paragraphs: ['Dúvidas sobre esta política: R2PB Soluções Digitais. E-mail: privacidade@r2pb.com.br. Site: www.gestaomirage.com.br'] },
    ],
  },
  '/termos': {
    h1: 'Termos de Serviço',
    intro: 'Última atualização: junho de 2026',
    sections: [
      { title: '1. Aceitação dos Termos', paragraphs: ['Ao criar uma conta ou utilizar o Mirage Hub, você concorda com estes Termos de Serviço. Caso não concorde, não utilize a plataforma. O Mirage Hub é operado pela Mirage Gestão & Tecnologia Ltda, CNPJ 67.660.591/0001-02, com sede em São Paulo/SP.'] },
      { title: '2. Descrição do Serviço', paragraphs: ['O Mirage Hub é uma plataforma SaaS multitenant destinada ao mercado têxtil e de confecção brasileiro. Oferece módulos de gestão de produção (Kanban), custos e orçamentos, PLM (Product Lifecycle Management), relatórios, comunidade B2B (Moda Conecta), CRM e marketing digital com integração ao Instagram/Meta.', 'O acesso aos módulos é condicionado ao plano de assinatura contratado. Funcionalidades podem ser adicionadas, modificadas ou descontinuadas mediante aviso prévio.'] },
      { title: '3. Contas e Responsabilidades', items: ['Você é responsável por manter a confidencialidade de suas credenciais de acesso.', 'Cada conta é de uso pessoal ou da empresa contratante (tenant). Não é permitido compartilhar acessos entre empresas diferentes.', 'Você é responsável por todo o conteúdo inserido na plataforma.', 'Menores de 18 anos devem ter autorização de responsável legal.'] },
      { title: '4. Uso Aceitável', paragraphs: ['É proibido utilizar o Mirage Hub para:'], items: ['Atividades ilegais ou que violem direitos de terceiros.', 'Envio de spam, conteúdo malicioso ou enganoso.', 'Tentativas de acesso não autorizado a sistemas ou dados de outros usuários.', 'Revenda ou sublicenciamento da plataforma sem autorização expressa.', 'Uso automatizado abusivo (scraping, bots) sem acordo prévio.'] },
      { title: '5. Integração com Meta / Instagram', paragraphs: ['O módulo de marketing permite integração com a Meta Graph API e o Instagram Business API. Ao conectar sua conta Meta/Instagram ao Mirage Hub:'], items: ['Você autoriza o Mirage Hub a acessar, publicar e analisar conteúdo em seu nome, conforme as permissões concedidas.', 'Você é responsável por garantir que o conteúdo publicado está em conformidade com as políticas da Meta e da legislação aplicável.', 'A revogação da integração pode ser feita a qualquer momento nas configurações da plataforma ou em facebook.com/settings.', 'O Mirage Hub não armazena senhas de contas Meta/Instagram.'] },
      { title: '6. Assinatura e Pagamento', items: ['Os planos são cobrados conforme o ciclo escolhido (mensal ou anual).', 'Pagamentos são processados por gateway certificado. O Mirage Hub não armazena dados de cartão.', 'O cancelamento pode ser feito a qualquer momento. O acesso permanece até o fim do período pago.', 'Não há reembolso por períodos parcialmente utilizados, salvo disposição legal em contrário.'] },
      { title: '7. Propriedade Intelectual', paragraphs: ['Todo o código-fonte, design, marca e conteúdo do Mirage Hub são de propriedade da R2PB Soluções Digitais. Os dados inseridos pelos usuários permanecem de propriedade do respectivo tenant. Concedemos ao usuário licença limitada, não exclusiva e intransferível para uso da plataforma.'] },
      { title: '8. Limitação de Responsabilidade', paragraphs: ['O Mirage Hub é fornecido "como está". Não garantimos disponibilidade ininterrupta, embora nos esforcemos para manter uptime elevado. Não nos responsabilizamos por perdas indiretas, perda de dados decorrente de uso indevido ou falhas de terceiros (incluindo APIs da Meta).'] },
      { title: '9. Rescisão', paragraphs: ['Podemos suspender ou encerrar contas que violem estes termos, com ou sem aviso prévio em casos graves. O usuário pode encerrar sua conta a qualquer momento via configurações ou pelo e-mail de suporte.'] },
      { title: '10. Alterações nos Termos', paragraphs: ['Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por e-mail ou notificação na plataforma com antecedência mínima de 15 dias. O uso continuado após a vigência das alterações constitui aceitação.'] },
      { title: '11. Lei Aplicável', paragraphs: ['Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de São Paulo/SP para resolução de conflitos, salvo disposição legal em contrário.'] },
      { title: '12. Contato', paragraphs: ['R2PB Soluções Digitais. E-mail: suporte@r2pb.com.br. Site: www.gestaomirage.com.br'] },
    ],
  },
} as const;