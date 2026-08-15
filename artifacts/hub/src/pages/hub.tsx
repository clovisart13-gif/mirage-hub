import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { KanbanMockup } from '@/components/mockups/KanbanMockup';
import { OrcamentoMockup } from '@/components/mockups/OrcamentoMockup';
import { CRMMockup } from '@/components/mockups/CRMMockup';
import { ComunidadeMockup } from '@/components/mockups/ComunidadeMockup';
import { PartnersMockup } from '@/components/mockups/PartnersMockup';
import { ERPMockup } from '@/components/mockups/ERPMockup';
import { KanbanScreen1, KanbanScreen2, KanbanScreen3 } from '@/components/mockups/KanbanScreens';
import { OrcamentoScreen1, OrcamentoScreen2, OrcamentoScreen3 } from '@/components/mockups/OrcamentoScreens';
import { CRMScreen1, CRMScreen2, CRMScreen3 } from '@/components/mockups/CRMScreens';
import { ComunidadeScreen1, ComunidadeScreen2, ComunidadeScreen3 } from '@/components/mockups/ComunidadeScreens';
import { ERPScreen1, ERPScreen2, ERPScreen3 } from '@/components/mockups/ERPScreens';
import { PLMScreen1, PLMScreen2, PLMScreen3 } from '@/components/mockups/PLMScreens';
import { PartnersScreen1, PartnersScreen2, PartnersScreen3 } from '@/components/mockups/PartnersScreens';
import { FinanceiroScreen1, FinanceiroScreen2, FinanceiroScreen3 } from '@/components/mockups/FinanceiroScreens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import {
  LayoutDashboard, Calculator, Users, HeadphonesIcon, FileText,
  Lock, ExternalLink, ArrowRight, AlertTriangle, Check,
  MessageCircle, Sparkles, Briefcase, TrendingUp,
  BookOpen, BarChart3, ChevronRight, Star, Zap, HelpCircle,
  Package, Menu, X, Monitor, ChevronLeft, Layers, Clock, Loader2, Wallet, Puzzle, Flag,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { TrialExpiredModal } from '@/components/TrialExpiredModal';
import { NPSSurvey } from '@/components/NPSSurvey';

const WHATSAPP_NUMBER = '5511992436154';
const SUPER_ADMIN_EMAIL = 'clovisart13@gmail.com';

type ScreenItem = { title: string; description: string; component: React.ComponentType };
type StepItem = { step: string; title: string; description: string };

type AppDetail = {
  id: string;
  name: string;
  icon: any;
  tagline: string;
  description: string;
  badge?: string;
  color: string;
  colorHex: string;
  bgLight: string;
  textColor: string;
  features: Array<{ title: string; description: string; icon?: any }>;
  quickFeatures: string[];
  benefits: Array<{ stat: string; label: string }>;
  useCases: string[];
  plans: string[];
  mockup?: React.ComponentType;
  screens?: ScreenItem[];
  howItWorks?: StepItem[];
  link?: string;
  externalLink?: string;
  previewDark?: boolean;
};

const APPS: AppDetail[] = [
  {
    id: 'crm',
    name: 'CRM Mirage',
    icon: HeadphonesIcon,
    tagline: 'Gerencie clientes e negociações em um funil visual simples.',
    description: 'O CRM Mirage centraliza todos os seus contatos, conversas e oportunidades de venda em um único lugar. Acompanhe cada lead pelo funil, registre histórico de negociações, envie propostas e nunca perca uma oportunidade por falta de acompanhamento.',
    badge: 'Mais popular',
    color: 'bg-orange-600',
    colorHex: '#EA580C',
    bgLight: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-600',
    quickFeatures: ['Funil de vendas visual', 'Múltiplos atendentes', 'Histórico por cliente', 'Relatórios de conversão'],
    features: [
      { title: 'Funil de vendas visual', description: 'Acompanhe cada lead em tempo real — do primeiro contato até o fechamento — em um kanban simples e intuitivo.', icon: Zap },
      { title: 'Histórico completo por cliente', description: 'Todo o histórico de conversas, pedidos e negociações de cada cliente em um só lugar, acessível por qualquer atendente.', icon: FileText },
      { title: 'Múltiplos atendentes', description: 'Toda a equipe comercial trabalha na mesma plataforma, sem confusão ou duplicidade de contatos.', icon: Users },
      { title: 'Pipeline personalizado', description: 'Configure as etapas do funil conforme o seu processo de venda: Contato → Qualificação → Proposta → Fechamento.', icon: ArrowRight },
      { title: 'Gestão de propostas', description: 'Integrado ao Orçamento Mirage — envie propostas direto do CRM e acompanhe a aprovação do cliente.', icon: BarChart3 },
      { title: 'Relatórios de performance', description: 'Taxa de conversão por etapa, tempo médio de fechamento e desempenho por vendedor.', icon: TrendingUp },
    ],
    benefits: [
      { stat: '100%', label: 'das oportunidades rastreadas' },
      { stat: '1 lugar', label: 'para toda a equipe comercial' },
      { stat: '3x', label: 'mais organização no processo de vendas' },
    ],
    useCases: [
      'Confecções que perdem vendas por falta de acompanhamento',
      'Equipes com múltiplos vendedores sem organização central',
      'Empresas que não sabem quantos leads estão em negociação',
      'Gestores que querem medir a performance comercial da equipe',
    ],
    plans: ['pro', 'enterprise'],
    mockup: CRMMockup,
    screens: [
      { title: 'Visão geral do pipeline', description: 'Todos os leads organizados por etapa do funil com contagem e indicadores', component: CRMScreen1 },
      { title: 'Pipeline de Vendas', description: 'Funil visual com todos os leads por etapa em formato kanban', component: CRMScreen2 },
      { title: 'Relatório de Performance', description: 'Métricas de conversão, taxa por etapa e desempenho por vendedor', component: CRMScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Cadastre o lead no funil', description: 'Ao receber um contato, registre o cliente no CRM e defina a etapa inicial. Todo o histórico começa a ser registrado automaticamente.' },
      { step: '2', title: 'Acompanhe a negociação', description: 'Mova o lead pelo pipeline conforme o avanço da negociação. Envie propostas integradas ao Orçamento Mirage diretamente pelo CRM.' },
      { step: '3', title: 'Feche e acompanhe', description: 'Registre o fechamento, inicie o pedido no Kanban de Produção e mantenha o histórico completo do cliente para futuras vendas.' },
    ],
    link: '/hub/crm',
    externalLink: 'https://mirage.wts.chat',
  },
  {
    id: 'plm',
    name: 'PLM Mirage',
    icon: Layers,
    tagline: 'Gerencie o ciclo de vida completo dos seus produtos — da ideia à aprovação.',
    description: 'O PLM Mirage centraliza o desenvolvimento de produtos da sua confecção. Fichas técnicas detalhadas, modelagem, materiais & custos, pilotagem e aprovação em um fluxo único. Do rascunho ao produto aprovado, com histórico completo de cada decisão.',
    badge: 'Novo',
    color: 'bg-indigo-600',
    colorHex: '#4F46E5',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950',
    textColor: 'text-indigo-600',
    quickFeatures: ['Fichas técnicas completas', 'Materiais & Custos', 'Pilotagem e aprovação', 'Histórico de auditoria'],
    features: [
      { title: 'Fichas Técnicas detalhadas', description: 'Registre tabela de medidas, mão de obra, componentes, instruções de lavagem e galeria de fotos por versão.', icon: FileText },
      { title: 'Materiais & Custos', description: 'Monte a lista de materiais com quantidades, preços unitários, mão de obra e margem de lucro para cada produto.', icon: Calculator },
      { title: 'Fluxo de aprovação', description: 'Controle de aprovação em 5 etapas: Ficha Técnica → Modelagem → Mat. & Custos → Piloto → Gerencial.', icon: Check },
      { title: 'Pilotagem rastreada', description: 'Registre corte, costura, acabamento e controle de qualidade de cada piloto com resultado por etapa.', icon: Package },
      { title: 'Kanban de status', description: 'Visualize todos os produtos por status: Rascunho, Desenvolvimento, Pilotagem e Aprovado.', icon: LayoutDashboard },
      { title: 'Auditoria completa', description: 'Histórico de todas as ações — quem fez o quê, quando — em cada produto e módulo.', icon: BookOpen },
    ],
    benefits: [
      { stat: '100%', label: 'dos produtos rastreados' },
      { stat: '0', label: 'fichas perdidas' },
      { stat: '5 etapas', label: 'de aprovação controladas' },
    ],
    useCases: [
      'Confecções que perdem fichas técnicas em papel ou WhatsApp',
      'Equipes de produto sem fluxo estruturado de aprovação',
      'Empresas que não controlam versões de modelagem e custos',
      'Gestores que querem rastrear o histórico de cada decisão de produto',
    ],
    plans: ['pro', 'enterprise'],
    link: '/hub/plm',
    previewDark: true,
    screens: [
      { title: 'Dashboard PLM', description: 'Visão geral dos produtos por status com KPIs e acesso rápido a módulos', component: PLMScreen1 },
      { title: 'Materiais & Custos', description: 'Custo completo por peça: matéria-prima, mão de obra e margem', component: PLMScreen2 },
      { title: 'Fluxo de Aprovação', description: 'Controle das 5 etapas de aprovação de produto em tempo real', component: PLMScreen3 },
    ],
  },
  {
    id: 'orcamento',
    name: 'Orçamento Mirage',
    icon: Calculator,
    tagline: 'Precifique com precisão. Nunca mais venda com prejuízo.',
    description: 'O Gerador de Orçamento calcula automaticamente o custo real de cada peça — matéria-prima, mão de obra, overhead e margem de lucro — e gera uma ficha de custo completa e um orçamento em PDF profissional pronto para enviar ao cliente. Em segundos.',
    color: 'bg-blue-600',
    colorHex: '#2563EB',
    bgLight: 'bg-blue-50 dark:bg-blue-950',
    textColor: 'text-blue-600',
    quickFeatures: ['Fichas de custo completas', 'Orçamentos em PDF', 'Controle de clientes', 'Histórico completo'],
    features: [
      { title: 'Ficha de custo detalhada', description: 'Calcule matéria-prima, mão de obra, custo fixo e margem de lucro por peça automaticamente.', icon: Calculator },
      { title: 'Orçamento em PDF profissional', description: 'Envie um documento completo para o cliente em segundos, com a logo da sua empresa.', icon: FileText },
      { title: 'Banco de dados de materiais', description: 'Cadastre tecidos, aviamentos e insumos com preços atualizados para cálculo automático.', icon: Package },
      { title: 'Histórico de clientes e pedidos', description: 'Todos os orçamentos enviados ficam salvos com status: aprovado, pendente ou reprovado.', icon: Star },
      { title: 'Cálculo de grade completa', description: 'Calcule o custo total de uma grade de tamanhos (P, M, G, GG) de uma vez só.', icon: LayoutDashboard },
      { title: 'Análise de rentabilidade', description: 'Veja quais clientes e produtos dão mais margem para priorizar os pedidos certos.', icon: BarChart3 },
    ],
    benefits: [
      { stat: '5 min', label: 'para fazer um orçamento completo' },
      { stat: '0%', label: 'de venda com prejuízo' },
      { stat: '100%', label: 'dos custos calculados' },
    ],
    useCases: [
      'Confeccionistas que fazem orçamentos "no feeling" e perdem dinheiro',
      'Empresas que demoram horas para responder um orçamento',
      'Fábricas com clientes que pedem desconto e você não sabe até onde ir',
      'Donos que querem saber quais produtos têm melhor margem',
    ],
    plans: ['starter', 'pro', 'enterprise'],
    mockup: OrcamentoMockup,
    screens: [
      { title: 'Ficha de Custo', description: 'Cálculo completo com todos os insumos e margem de lucro', component: OrcamentoScreen1 },
      { title: 'Histórico de Orçamentos', description: 'Todos os orçamentos com status e taxa de aprovação', component: OrcamentoScreen2 },
      { title: 'PDF Profissional', description: 'Documento pronto para enviar ao cliente com sua marca', component: OrcamentoScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Cadastre seus insumos uma vez', description: 'Registre tecidos, aviamentos e custos fixos. O sistema atualiza automaticamente os cálculos quando os preços mudam.' },
      { step: '2', title: 'Monte a ficha de custo em 2 minutos', description: 'Selecione os materiais, informe a quantidade e defina sua margem. O sistema calcula tudo automaticamente.' },
      { step: '3', title: 'Gere e envie o PDF para o cliente', description: 'Um orçamento profissional com sua marca pronto para enviar por WhatsApp, e-mail ou baixar em segundos.' },
    ],
    link: '/hub/custos/orcamentos',
  },
  {
    id: 'kanban',
    name: 'Kanban Mirage',
    icon: LayoutDashboard,
    tagline: 'Saiba em tempo real onde está cada pedido — do corte à expedição.',
    description: 'O Kanban de Produção da Mirage é um sistema visual que coloca sua fábrica no controle. Cada Ordem de Produção percorre até 14 fases configuráveis: do corte à expedição. Você e seus líderes veem tudo em tempo real, pelo celular ou computador — sem precisar parar e perguntar para ninguém.',
    badge: 'Mais usado',
    color: 'bg-violet-600',
    colorHex: '#7C3AED',
    bgLight: 'bg-violet-50 dark:bg-violet-950',
    textColor: 'text-violet-600',
    quickFeatures: ['Gestão visual de OPs', '14 fases de produção', 'Dashboard financeiro', 'Controle de prazos'],
    features: [
      { title: 'Quadro visual de Ordens de Produção', description: 'Veja todas as OPs em andamento organizadas por fase, com cores e alertas de prazo.', icon: LayoutDashboard },
      { title: '14 fases configuráveis', description: 'Corte, costura, bordado, acabamento, qualidade, expedição e mais — adapte ao seu processo.', icon: Package },
      { title: 'Dashboard financeiro em tempo real', description: 'Valor total em produção, custo por OP, margem prevista — tudo visível sem planilha.', icon: BarChart3 },
      { title: 'Alertas de atraso automáticos', description: 'Receba notificações quando uma OP está próxima ou além do prazo combinado com o cliente.', icon: Zap },
      { title: 'Histórico completo de cada OP', description: 'Fotos, anotações e todo o histórico de movimentação registrados automaticamente.', icon: FileText },
      { title: 'Acesso pelo celular', description: 'O dono acompanha a produção de qualquer lugar. Os líderes atualizam pelo celular no chão de fábrica.', icon: Star },
    ],
    benefits: [
      { stat: '60%', label: 'menos atrasos na entrega' },
      { stat: '3x', label: 'mais controle do chão de fábrica' },
      { stat: '100%', label: 'visibilidade das OPs' },
    ],
    useCases: [
      'Confecções que perdem prazos de entrega com frequência',
      'Donos que não sabem onde está cada pedido sem perguntar',
      'Fábricas que controlam OPs em papel ou quadro branco',
      'Empresas que querem reduzir retrabalho e gargalos',
    ],
    plans: ['starter', 'pro', 'enterprise'],
    mockup: KanbanMockup,
    previewDark: true,
    screens: [
      { title: 'Quadro Kanban', description: 'Visão completa de todas as OPs e fases em tempo real', component: KanbanScreen1 },
      { title: 'Detalhe da OP', description: 'Progresso por fase, histórico de movimentações e anotações', component: KanbanScreen2 },
      { title: 'Dashboard Financeiro', description: 'Faturamento, margem bruta e OPs por semana', component: KanbanScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Crie a Ordem de Produção', description: 'Cadastre a OP com cliente, produto, quantidade e prazo. O sistema gera o card automaticamente no quadro.' },
      { step: '2', title: 'Líderes atualizam pelo celular', description: 'Cada setor arrasta o card para a próxima fase quando termina. Nenhum papel, nenhuma ligação necessária.' },
      { step: '3', title: 'Você acompanha em tempo real', description: 'Dashboard financeiro, alertas de atraso e visão completa da fábrica — de qualquer lugar, a qualquer hora.' },
    ],
    link: '/hub/kanban',
  },
  {
    id: 'erp',
    name: 'ERP Mirage',
    icon: FileText,
    tagline: 'Gestão completa: financeiro, estoque, fiscal e muito mais em um só sistema.',
    description: 'O ERP Mirage é a solução mais completa para indústrias têxteis que precisam de controle total: emissão de NF-e, gestão financeira, controle de estoque, relatórios contábeis e integração com todos os outros apps do ecossistema. Tudo em um sistema integrado.',
    color: 'bg-slate-700',
    colorHex: '#334155',
    bgLight: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    quickFeatures: ['Emissão de NF-e', 'Controle financeiro', 'Gestão de estoque', 'Relatórios contábeis'],
    features: [
      { title: 'Emissão de NF-e e NFS-e', description: 'Emita notas fiscais eletrônicas diretamente pelo sistema, com transmissão automática para SEFAZ.', icon: FileText },
      { title: 'Controle financeiro completo', description: 'Contas a pagar, contas a receber, fluxo de caixa e DRE atualizados em tempo real.', icon: BarChart3 },
      { title: 'Gestão de estoque integrada', description: 'Controle matéria-prima e produto acabado com movimentação automática ao registrar produção.', icon: Package },
      { title: 'Contas a pagar e receber', description: 'Gerencie boletos, transferências e cobranças com alertas de vencimento automáticos.', icon: Zap },
      { title: 'Relatórios gerenciais e contábeis', description: 'Relatórios prontos para o contador e relatórios gerenciais para tomada de decisão.', icon: TrendingUp },
      { title: 'Integrado com todo o ecossistema', description: 'Sincroniza automaticamente com o Kanban, Orçamento e CRM — dados únicos, sem retrabalho.', icon: Star },
    ],
    benefits: [
      { stat: '100%', label: 'integrado ao ecossistema' },
      { stat: '0', label: 'planilhas necessárias' },
      { stat: 'NF-e', label: 'emitida em segundos' },
    ],
    useCases: [
      'Indústrias têxteis médias e grandes que precisam de NF-e',
      'Empresas com mais de 10 usuários e múltiplos setores',
      'Confecções que querem eliminar planilhas e sistemas separados',
      'Gestores que precisam de DRE, fluxo de caixa e balanço',
    ],
    plans: ['enterprise'],
    mockup: ERPMockup,
    screens: [
      { title: 'Dashboard Financeiro', description: 'Receita, despesas, fluxo de caixa e contas do dia', component: ERPScreen1 },
      { title: 'Emissão de NF-e', description: 'Notas fiscais eletrônicas transmitidas direto para a SEFAZ', component: ERPScreen2 },
      { title: 'Controle de Estoque', description: 'Matérias-primas, produtos acabados e alertas de reposição', component: ERPScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Integre com o ecossistema Mirage', description: 'O ERP se conecta automaticamente ao Kanban e ao Orçamento. Quando uma OP é finalizada, o financeiro já sabe.' },
      { step: '2', title: 'Emita NF-e em segundos', description: 'Com os dados da produção já registrados, emitir a nota fiscal é apenas confirmar e transmitir. Sem redigitação.' },
      { step: '3', title: 'Gestão financeira completa', description: 'DRE, fluxo de caixa, relatórios para o contador — tudo atualizado automaticamente, sem planilhas.' },
    ],
    link: '/hub/erp',
    externalLink: 'https://erp.gestaomirage.com.br',
  },
  {
    id: 'comunidade',
    name: 'Moda Conecta',
    icon: Users,
    tagline: 'A maior rede B2B do vestuário brasileiro. Fornecedores, vagas e negócios.',
    description: 'A Moda Conecta conecta confeccionistas a uma rede curada de fornecedores de tecidos, aviamentos e insumos — com cotações diretas sem intermediários. Além disso, é um fórum especializado para troca de experiências, vagas de emprego no setor e oportunidades de negócio.',
    color: 'bg-emerald-600',
    colorHex: '#059669',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950',
    textColor: 'text-emerald-600',
    quickFeatures: ['Rede de fornecedores curados', 'Cotações diretas', 'Fórum especializado', 'Vagas de emprego'],
    features: [
      { title: 'Rede de fornecedores verificados', description: 'Acesse fornecedores de tecidos, aviamentos, bordados e acabamentos — todos avaliados por membros.', icon: Star },
      { title: 'Cotações diretas sem intermediário', description: 'Solicite orçamentos de múltiplos fornecedores de uma vez e compare preços facilmente.', icon: Calculator },
      { title: 'Fórum especializado em confecção', description: 'Tire dúvidas, compartilhe experiências e aprenda com outros confeccionistas do Brasil.', icon: Users },
      { title: 'Banco de vagas do setor têxtil', description: 'Anuncie ou encontre vagas de costureiras, modelistas, estilistas e gestores.', icon: Briefcase },
      { title: 'Artigos e tutoriais técnicos', description: 'Conteúdo especializado sobre gestão de confecção, tendências e boas práticas.', icon: BookOpen },
      { title: 'Matchmaking de negócios', description: 'Encontre subcontratados, parceiros e clientes dentro da rede da comunidade.', icon: Zap },
    ],
    benefits: [
      { stat: '30%', label: 'economia média em insumos' },
      { stat: '500+', label: 'fornecedores cadastrados' },
      { stat: '1 clique', label: 'para pedir cotação' },
    ],
    useCases: [
      'Confecções que querem reduzir o custo de matéria-prima',
      'Donos que buscam fornecedores confiáveis além dos habituais',
      'Empresas que precisam contratar costureiras ou modelistas',
      'Confeccionistas que querem trocar experiências com o setor',
    ],
    plans: ['pro', 'enterprise'],
    mockup: ComunidadeMockup,
    previewDark: true,
    screens: [
      { title: 'Rede de Fornecedores', description: '500+ fornecedores verificados com cotação em 1 clique', component: ComunidadeScreen1 },
      { title: 'Fórum da Moda Conecta', description: 'Tire dúvidas e compartilhe com confeccionistas do Brasil', component: ComunidadeScreen2 },
      { title: 'Vagas do Setor', description: 'Encontre ou anuncie vagas têxteis em todo o Brasil', component: ComunidadeScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Acesse a rede de fornecedores', description: 'Navegue por 500+ fornecedores verificados filtrados por categoria, região e avaliação de outros membros.' },
      { step: '2', title: 'Solicite cotação com 1 clique', description: 'Envie um pedido de cotação para múltiplos fornecedores ao mesmo tempo e compare as propostas lado a lado.' },
      { step: '3', title: 'Participe do fórum e vagas', description: 'Troque experiências no fórum especializado, acesse conteúdo técnico e encontre profissionais para sua equipe.' },
    ],
    link: '/hub/comunidade/fornecedores',
  },
  {
    id: 'partners',
    name: 'Partners Mirage',
    icon: Briefcase,
    tagline: 'Contador, marketing e consultoria especializados em confecção.',
    description: 'O ecossistema Partners Mirage conecta sua confecção a especialistas de confiança: contadores experientes no setor têxtil, agências de marketing focadas em moda e confecção, e consultores de gestão que já transformaram dezenas de fábricas. Todos selecionados e certificados pela Mirage.',
    color: 'bg-violet-600',
    colorHex: '#7C3AED',
    bgLight: 'bg-violet-50 dark:bg-violet-950',
    textColor: 'text-violet-600',
    quickFeatures: ['Contador / BPO Fiscal', 'Marketing & Performance', 'Consultoria de Gestão', 'Certificados Mirage'],
    features: [
      { title: 'Contador / BPO Fiscal especializado', description: 'Escritórios contábeis com experiência comprovada no setor têxtil: SIMPLES Nacional, Lucro Presumido, SPED e obrigações acessórias.', icon: Briefcase },
      { title: 'Marketing & Performance para confecção', description: 'Agências especializadas em moda e confecção: campanhas digitais, tráfego pago, branding e conteúdo para B2B e varejo.', icon: TrendingUp },
      { title: 'Consultoria de Gestão e Expansão', description: 'Consultores que já estruturaram dezenas de confecções: processos, custos, equipe, escalabilidade e novas coleções.', icon: Star },
      { title: 'Todos certificados pela Mirage', description: 'Cada parceiro passa por processo de seleção, avaliação de portfólio e deve manter NPS acima de 8 com os clientes Mirage.', icon: Check },
      { title: 'Match personalizado com sua demanda', description: 'Informe seu desafio e a Mirage indica o parceiro mais adequado para seu porte, segmento e região.', icon: MessageCircle },
      { title: 'Integração com o ecossistema', description: 'Parceiros têm acesso facilitado ao seu ERP, Kanban e Orçamento Mirage para entregar um serviço mais preciso.', icon: Zap },
    ],
    benefits: [
      { stat: '30+', label: 'parceiros certificados Mirage' },
      { stat: 'NPS 9+', label: 'média de satisfação dos parceiros' },
      { stat: '1 clique', label: 'para solicitar indicação' },
    ],
    useCases: [
      'Donos que precisam de um contador que entende de confecção e emite NF-e sem erro',
      'Fábricas que querem crescer no digital mas não sabem por onde começar',
      'Empresas que cresceram rápido e precisam estruturar processos e equipe',
      'Gestores que buscam parceiros de confiança indicados por quem usa o mesmo sistema',
    ],
    plans: ['starter', 'pro', 'enterprise'],
    mockup: PartnersMockup,
    screens: [
      { title: 'Rede de Parceiros', description: 'Contadores, agências e consultores certificados pela Mirage', component: PartnersScreen1 },
      { title: 'Detalhe do Parceiro', description: 'Portfólio, avaliações e cupom exclusivo para clientes Mirage', component: PartnersScreen2 },
      { title: 'Estatísticas da Rede', description: '30+ parceiros em 12 estados com NPS médio 9.3', component: PartnersScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Informe seu desafio', description: 'Diga qual área você precisa de apoio: contabilidade, marketing ou consultoria de gestão. A Mirage faz o match automaticamente.' },
      { step: '2', title: 'Receba indicações personalizadas', description: 'Você recebe 2 ou 3 parceiros selecionados para o seu perfil — com portfólio, depoimentos e histórico no setor têxtil.' },
      { step: '3', title: 'Contrate com segurança', description: 'Os parceiros já conhecem o ecossistema Mirage e se integram ao seu ERP e Kanban para oferecer um serviço preciso desde o dia 1.' },
    ],
    link: '/hub/partners',
  },
  {
    id: 'financeiro',
    name: 'Financeiro Mirage',
    icon: Wallet,
    tagline: 'Fluxo de caixa, extrato bancário e DRE em tempo real — sem planilha.',
    description: 'O Financeiro Mirage centraliza toda a gestão financeira da sua confecção: importação de extratos OFX, classificação automática de lançamentos por regras inteligentes, conciliação bancária, controle por centro de custo e dashboard com saldo, receitas, despesas e resultado mensal.',
    badge: 'Novo',
    color: 'bg-teal-600',
    colorHex: '#0D9488',
    bgLight: 'bg-teal-50 dark:bg-teal-950',
    textColor: 'text-teal-600',
    quickFeatures: ['Importação de OFX', 'Classificação automática', 'Fluxo de caixa', 'Conciliação bancária'],
    features: [
      { title: 'Importação de extrato OFX', description: 'Importe o extrato direto do seu banco em formato OFX e todos os lançamentos aparecem automaticamente — sem redigitação.', icon: Wallet },
      { title: 'Classificação automática por regras', description: 'Crie regras como "TECIDOS → Matéria-Prima" e o sistema classifica 90%+ dos lançamentos sozinho na próxima importação.', icon: Zap },
      { title: 'Dashboard financeiro em tempo real', description: 'Saldo atual por conta, receita, despesas fixas e variáveis, resultado líquido e comparativo com o mês anterior — sempre atualizado.', icon: BarChart3 },
      { title: 'Conciliação bancária', description: 'Compare o saldo do sistema com o extrato real e ajuste discrepâncias com anotação de motivo. Histórico completo de ajustes.', icon: Check },
      { title: 'Centros de custo', description: 'Classifique cada lançamento por centro: Produção, Comercial, Administrativo, Logística — e veja o custo real de cada área.', icon: Package },
      { title: 'Metas mensais', description: 'Defina metas de faturamento, custo e resultado por mês e acompanhe o progresso com indicador visual de atingimento.', icon: TrendingUp },
    ],
    benefits: [
      { stat: '90%', label: 'dos lançamentos classificados automaticamente' },
      { stat: '1 arquivo', label: 'OFX importa todo o extrato do mês' },
      { stat: '0', label: 'planilhas financeiras necessárias' },
    ],
    useCases: [
      'Confecções que controlam financeiro em planilha ou caderno',
      'Donos que não sabem o saldo real da empresa a qualquer momento',
      'Empresas com múltiplas contas bancárias difíceis de consolidar',
      'Gestores que precisam de DRE simples sem pagar contador todo mês',
    ],
    plans: ['pro', 'enterprise'],
    previewDark: true,
    screens: [
      { title: 'Dashboard Financeiro', description: 'Saldo por conta, receita, despesas e resultado do mês em tempo real', component: FinanceiroScreen1 },
      { title: 'Extrato Classificado', description: 'Todos os lançamentos bancários organizados por categoria e tipo', component: FinanceiroScreen2 },
      { title: 'OFX + Regras Automáticas', description: 'Importação e classificação inteligente de extratos bancários', component: FinanceiroScreen3 },
    ],
    howItWorks: [
      { step: '1', title: 'Importe o extrato do banco', description: 'Baixe o arquivo OFX no internet banking e arraste para o Financeiro Mirage. Em segundos todos os lançamentos do mês aparecem classificados.' },
      { step: '2', title: 'Regras classificam sozinhas', description: 'Na primeira vez você classifica manualmente. O sistema aprende e cria regras automáticas — na próxima importação 90%+ já vem categorizado.' },
      { step: '3', title: 'Acompanhe o resultado', description: 'Dashboard atualizado em tempo real com saldo por conta, fluxo do mês e comparativo histórico. Tudo sem planilha, sem retrabalho.' },
    ],
    link: '/hub/financeiro/dashboard',
  },
];

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_COLOR: Record<string, string> = {
  starter: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const ALWAYS_VISIBLE_IDS = ['partners']; // Não são módulos gateados

function NewLeadsWidget({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [newCount, setNewCount] = useState<number>(0);
  useEffect(() => {
    if (!isSuperAdmin) return;
    apiFetch('/moda-conecta/leads/stats?companySlug=mirage')
      .then((s: any) => setNewCount(s?.novo ?? 0))
      .catch(() => {});
  }, [isSuperAdmin]);
  if (!isSuperAdmin || newCount === 0) return null;
  return (
    <Link href="/hub/comunidade">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-emerald-100 transition-colors">
        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">{newCount}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-800 text-sm">
            {newCount} novo{newCount !== 1 ? 's' : ''} lead{newCount !== 1 ? 's' : ''} aguardando curadoria
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">Clique para abrir o Pipeline de Curadoria → Moda Conecta</p>
        </div>
        <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
      </div>
    </Link>
  );
}

function WelcomeDashboard({ subscription, appsAtivos, hasActiveSub, userPlan, onSelectApp, isTrial, diasRestantes, hasTenant, onActivateTrial, activatingTrial, isSuperAdmin }: any) {
  const ativo = APPS.filter(a =>
    ALWAYS_VISIBLE_IDS.includes(a.id) ||
    appsAtivos.includes(a.id) ||
    (!appsAtivos.length && hasActiveSub && a.plans.includes(userPlan))
  );
  const bloqueados = APPS.filter(a => !ativo.map((x: any) => x.id).includes(a.id));

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Bem-vindo ao Hub Mirage</h1>
        <p className="text-muted-foreground mt-1.5">
          {hasActiveSub
            ? `Plano ${PLAN_LABELS[userPlan] || userPlan} ativo — clique em um app abaixo para acessar.`
            : 'Conheça os apps do ecossistema Mirage para confecções e escolha seu plano.'}
        </p>
      </div>

      {isTrial && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-4">
          <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">
              Trial gratuito ativo
              {diasRestantes !== null && (
                <span className={cn(
                  'ml-2 text-sm font-bold px-2 py-0.5 rounded-full',
                  diasRestantes <= 3 ? 'bg-red-100 text-red-700' :
                  diasRestantes <= 7 ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {diasRestantes > 0 ? `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restantes` : 'Expira hoje!'}
                </span>
              )}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
              Kanban e Orçamento liberados. Assine antes do trial expirar para não perder acesso.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/planos">Assinar agora</Link>
          </Button>
        </div>
      )}

      <OnboardingChecklist show={isTrial} />

      <TrialExpiredModal open={isTrial && diasRestantes !== null && diasRestantes <= 0} />

      <NPSSurvey show={isTrial && diasRestantes !== null && diasRestantes >= 1 && diasRestantes <= 7} />

      <NewLeadsWidget isSuperAdmin={isSuperAdmin} />

      {!hasActiveSub && !isTrial && !hasTenant && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-5 flex items-start gap-4">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-violet-800 dark:text-violet-300">Ative seu trial gratuito de 14 dias</h3>
            <p className="text-sm text-violet-700 dark:text-violet-400 mt-0.5">Kanban de Produção e Gerador de Orçamento liberados imediatamente. Sem cartão de crédito.</p>
          </div>
          <Button size="sm" className="shrink-0 bg-violet-600 hover:bg-violet-700" onClick={onActivateTrial} disabled={activatingTrial}>
            {activatingTrial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ativar agora'}
          </Button>
        </div>
      )}

      {!hasActiveSub && !isTrial && hasTenant && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Você ainda não tem uma assinatura ativa</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">Clique em um app para explorar os recursos ou assine um plano para começar.</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>
      )}

      {ativo.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Acesso rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ativo.map((app: AppDetail) => {
              const Icon = app.icon;
              const cardClass = "flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left group w-full";
              const inner = (
                <>
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', app.bgLight)}>
                    <Icon className={cn('w-6 h-6', app.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{app.tagline}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </>
              );
              if (app.link) {
                return <Link key={app.id} href={app.link} className={cardClass}>{inner}</Link>;
              }
              return (
                <button key={app.id} onClick={() => onSelectApp(app)} className={cardClass}>{inner}</button>
              );
            })}
          </div>
        </div>
      )}

      {bloqueados.length > 0 && hasActiveSub && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Disponível no seu plano</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bloqueados.filter(a => !ALWAYS_VISIBLE_IDS.includes(a.id)).map((app: AppDetail) => {
              const Icon = app.icon;
              return (
                <button key={app.id} onClick={() => onSelectApp(app)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-dashed bg-muted/30 hover:bg-muted/50 transition-all text-left group opacity-80">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', app.bgLight)}>
                    <Icon className={cn('w-6 h-6', app.textColor, 'opacity-60')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{app.name}</p>
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{app.tagline}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick preview of what each app looks like */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Conheça o ecossistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {APPS.map((app) => {
            const Icon = app.icon;
            const PreviewScreen = app.screens?.[0]?.component;
            const isAlwaysVisible = ALWAYS_VISIBLE_IDS.includes(app.id);
            const cardContent = (
              <>
                {PreviewScreen && (
                  <div className={cn(
                    'h-44 overflow-hidden p-2 pointer-events-none select-none',
                    app.previewDark ? 'bg-slate-900' : 'bg-white',
                  )}>
                    <div className="scale-[0.72] origin-top-left w-[138.8%] h-[138.8%]">
                      <PreviewScreen />
                    </div>
                  </div>
                )}
                <div className={cn('p-3', PreviewScreen && 'border-t')}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', app.bgLight)}>
                      <Icon className={cn('w-3.5 h-3.5', app.textColor)} />
                    </div>
                    <p className="font-semibold text-sm text-foreground">{app.name}</p>
                    {app.badge && (
                      <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold shrink-0', app.color)}>
                        {app.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{app.tagline}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {!isAlwaysVisible && app.plans.map(p => (
                      <span key={p} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', PLAN_COLOR[p])}>{PLAN_LABELS[p]}</span>
                    ))}
                    {isAlwaysVisible && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">Incluído em todos os planos</span>
                    )}
                    <span className="ml-auto text-[10px] text-primary font-medium group-hover:underline">
                      {isAlwaysVisible ? 'Ver parceiros →' : 'Ver detalhes →'}
                    </span>
                  </div>
                </div>
              </>
            );
            if (isAlwaysVisible && app.link) {
              return (
                <Link key={app.id} href={app.link}
                  className="rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left group overflow-hidden block">
                  {cardContent}
                </Link>
              );
            }
            return (
              <div key={app.id} onClick={() => onSelectApp(app)}
                className="rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left group overflow-hidden cursor-pointer">
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScreensGallery({ app }: { app: AppDetail }) {
  const [active, setActive] = useState(0);
  if (!app.screens || app.screens.length === 0) return null;
  const Screen = app.screens[active].component;

  return (
    <div className="px-6 lg:px-10 py-8 border-y bg-muted/20">
      <div className="flex items-center gap-2 mb-5">
        <Monitor className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-bold text-foreground">Veja o sistema em ação</h2>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Tab selectors */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:w-52 shrink-0">
          {app.screens.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'text-left px-3 py-2.5 rounded-xl border transition-all shrink-0',
                active === i
                  ? 'bg-card border-primary/30 shadow-sm'
                  : 'border-transparent hover:border-border hover:bg-card'
              )}
            >
              <p className={cn('text-sm font-semibold', active === i ? 'text-foreground' : 'text-muted-foreground')}>
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug hidden lg:block">{s.description}</p>
            </button>
          ))}
        </div>

        {/* Main preview area */}
        <div className="flex-1 rounded-xl overflow-hidden border shadow-md bg-card min-h-[280px] max-h-[360px]">
          <Screen />
        </div>
      </div>
    </div>
  );
}

function HowItWorks({ app }: { app: AppDetail }) {
  if (!app.howItWorks || app.howItWorks.length === 0) return null;
  return (
    <div className="px-6 lg:px-10 py-8">
      <h2 className="text-lg font-bold text-foreground mb-6">Como funciona</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {app.howItWorks.map((step, i) => (
          <div key={i} className="relative flex flex-col">
            {i < app.howItWorks!.length - 1 && (
              <div className="hidden md:block absolute top-5 left-[calc(50%+2rem)] right-0 h-px border-t-2 border-dashed border-border" />
            )}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow"
                style={{ background: app.colorHex }}
              >
                {step.step}
              </div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{step.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-[3.25rem]">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppDetailView({ app, hasAccess }: { app: AppDetail; hasAccess: boolean }) {
  const Icon = app.icon;
  const Mockup = app.mockup;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${app.colorHex}15 0%, transparent 55%)` }}>
        <div className="p-6 lg:p-10">
          <div className="flex flex-col xl:flex-row xl:items-start gap-6 xl:gap-10">
            {/* Left: text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', app.bgLight)}>
                  <Icon className={cn('w-6 h-6', app.textColor)} />
                </div>
                {app.badge && (
                  <Badge className={cn('border-0 text-white text-xs', app.color)}>
                    <Sparkles className="w-3 h-3 mr-1" />{app.badge}
                  </Badge>
                )}
                {!hasAccess && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{app.name}</h1>
              <p className={cn('text-base font-medium mb-4', app.textColor)}>{app.tagline}</p>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">{app.description}</p>

              {/* Quick features */}
              <div className="flex flex-wrap gap-2 mt-4">
                {app.quickFeatures.map((qf, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />{qf}
                  </span>
                ))}
              </div>

              {/* Planos */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-xs text-muted-foreground">Incluído em:</span>
                {app.plans.map(p => (
                  <span key={p} className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', PLAN_COLOR[p])}>
                    {PLAN_LABELS[p]}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-wrap gap-3 mt-6">
                {hasAccess ? (
                  <>
                    {app.link ? (
                      <Button asChild className={cn('text-sm border-0', app.color)}>
                        <Link href={app.link}>
                          Acessar {app.name} <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    ) : app.externalLink ? (
                      <Button asChild className={cn('text-sm border-0', app.color)}>
                        <a href={app.externalLink} target="_blank" rel="noopener noreferrer">
                          Acessar {app.name} <ExternalLink className="ml-2 w-4 h-4" />
                        </a>
                      </Button>
                    ) : null}
                    {app.link && app.externalLink && (
                      <Button asChild variant="outline" size="sm" className="text-sm">
                        <a href={app.externalLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 w-3.5 h-3.5" /> Abrir no site original
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button asChild className="text-sm">
                      <Link href="/planos">Ver planos e assinar <ChevronRight className="ml-1 w-4 h-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" className="text-sm">
                      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Tenho interesse em conhecer o ${app.name}. Podem me ajudar?`)}`}
                        target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 w-4 h-4" /> Falar com especialista
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right: hero mockup */}
            {Mockup && (
              <div className="w-full xl:w-[480px] 2xl:w-[560px] shrink-0 rounded-xl overflow-hidden border shadow-lg bg-background">
                <Mockup />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 lg:px-10 py-6 border-y bg-muted/30">
        <div className="grid grid-cols-3 gap-4">
          {app.benefits.map((b, i) => (
            <div key={i} className="text-center">
              <p className={cn('text-2xl lg:text-3xl font-bold', app.textColor)}>{b.stat}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshots gallery */}
      <ScreensGallery app={app} />

      {/* How it works */}
      <HowItWorks app={app} />

      {/* Divider */}
      <div className="border-t mx-6 lg:mx-10" />

      {/* Features */}
      <div className="px-6 lg:px-10 py-8">
        <h2 className="text-lg font-bold text-foreground mb-6">Funcionalidades detalhadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {app.features.map((feat, i) => {
            const FIcon = feat.icon || Check;
            return (
              <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', app.bgLight)}>
                  <FIcon className={cn('w-4 h-4', app.textColor)} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{feat.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Use Cases */}
      <div className="px-6 lg:px-10 pb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">Para quem é este app?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {app.useCases.map((uc, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
              <Check className={cn('w-4 h-4 mt-0.5 shrink-0', app.textColor)} />
              <p className="text-sm text-muted-foreground">{uc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      {!hasAccess && (
        <div className={cn('mx-6 lg:mx-10 mb-8 rounded-2xl p-6 text-white', app.color)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-lg mb-1">Pronto para ativar o {app.name}?</p>
              <p className="text-white/80 text-sm">Assine agora e comece a usar em minutos — sem contrato de fidelidade.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button asChild className="bg-white hover:bg-white/90 text-sm font-semibold" style={{ color: app.colorHex }}>
                <Link href="/planos">Ver planos</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/20 text-sm">
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Quero saber mais sobre o ${app.name}.`)}`}
                  target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 w-4 h-4" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HubCentral() {
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [hasTenant, setHasTenant] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppDetail | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);

  const fetchSubscription = async (cancelled?: { value: boolean }) => {
    try {
      let tenantId: string | null = null;
      try {
        const tenant = await apiFetch('/tenants/meu-tenant');
        tenantId = tenant?.id ?? null;
        if (cancelled?.value) return;
        setHasTenant(!!tenantId);
      } catch {
        if (cancelled?.value) return;
        setHasTenant(false);
      }

      const url = tenantId
        ? `/billing/assinatura?tenant_id=${tenantId}`
        : '/billing/assinatura';
      const data = await apiFetch(url);
      if (!cancelled?.value) setSubscription(data);
    } catch {
      if (!cancelled?.value) setSubscription(null);
    } finally {
      if (!cancelled?.value) setSubLoading(false);
    }
  };

  useEffect(() => {
    // Enquanto auth ainda carrega, não faz nada
    if (authLoading) return;

    // Super admin tem acesso total sem precisar de assinatura
    if (isSuperAdmin) { setSubLoading(false); return; }

    const cancelled = { value: false };
    fetchSubscription(cancelled);
    return () => { cancelled.value = true; };
  }, [isSuperAdmin, authLoading]);

  const handleActivateTrial = async () => {
    setActivatingTrial(true);
    try {
      await apiFetch('/billing/trial/ativar', { method: 'POST' });
      setSubLoading(true);
      await fetchSubscription();
    } catch {
      // silencioso — fetchSubscription atualiza o estado
    } finally {
      setActivatingTrial(false);
    }
  };

  // Enquanto auth ou assinatura carregam, mostra skeleton
  const loading = authLoading || subLoading;

  // Super admin sempre tem plano enterprise ativo com acesso a tudo
  const userPlan = isSuperAdmin ? 'enterprise' : (subscription?.plano || 'none');
  const hasActiveSub = isSuperAdmin || subscription?.status === 'ativo' || subscription?.status === 'trial';
  const appsAtivos: string[] = isSuperAdmin ? [] : (subscription?.apps_ativos || []).map((a: any) => a.app_key || a);
  const isTrial = !isSuperAdmin && subscription?.status === 'trial';
  const diasRestantes = subscription?.expira_em
    ? Math.ceil((new Date(subscription.expira_em + 'T23:59:59').getTime() - Date.now()) / 86400000)
    : null;

  const hasAccess = (app: AppDetail) => {
    if (ALWAYS_VISIBLE_IDS.includes(app.id)) return true;
    if (isSuperAdmin) return true;
    if (appsAtivos.length > 0) return appsAtivos.includes(app.id);
    return hasActiveSub && app.plans.includes(userPlan);
  };

  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden h-full" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-background border-r flex flex-col pt-16 transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0 lg:pt-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          {/* Mobile close */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Apps</span>
            <button onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></button>
          </div>

          {/* Plan badge */}
          <div className="px-4 py-4 border-b">
            {loading ? (
              <Skeleton className="h-8 w-full rounded-lg" />
            ) : isTrial ? (
              <Link href="/hub/assinatura">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition-colors">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Trial gratuito</p>
                    {diasRestantes !== null && (
                      <p className={cn('text-xs', diasRestantes <= 3 ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                        {diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Expira hoje!'}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ) : hasActiveSub ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">Plano {PLAN_LABELS[userPlan] || userPlan}</p>
                  <p className="text-xs text-muted-foreground">Ativo</p>
                </div>
              </div>
            ) : (
              <Link href="/planos">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Sem assinatura</p>
                </div>
              </Link>
            )}
          </div>

          {/* App list */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            <button
              onClick={() => { setSelectedApp(null); setSidebarOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                !selectedApp ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Visão Geral</span>
            </button>

            <div className="pt-2 pb-1 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apps</p>
            </div>

            {loading
              ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg mx-1 mb-1" />)
              : APPS.map(app => {
                  const Icon = app.icon;
                  const active = hasAccess(app);
                  const isSelected = selectedApp?.id === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => { setSelectedApp(app); setSidebarOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left group',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', isSelected ? app.bgLight : 'bg-muted')}>
                        <Icon className={cn('w-3.5 h-3.5', isSelected ? app.textColor : '')} />
                      </div>
                      <span className="flex-1 truncate">{app.name}</span>
                      {!active && <Lock className="w-3 h-3 shrink-0 opacity-50" />}
                      {app.badge && active && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold shrink-0', app.color)}>{app.badge === 'Mais usado' ? '⭐' : '🔥'}</span>}
                    </button>
                  );
                })}

            <div className="pt-2 pb-1 px-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mais</p>
            </div>
            <Link href="/hub/relatorios" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="flex-1">Relatórios</span>
            </Link>

            <Link href="/hub/contatos-comerciais" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1">Contatos Comerciais</span>
            </Link>

            <Link href="/hub/integracoes" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <Puzzle className="w-4 h-4 shrink-0" />
              <span className="flex-1">Integrações</span>
            </Link>
            {isSuperAdmin && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Admin</p>
                </div>
                <Link href="/hub/growth" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Growth OS</span>
                </Link>
                <Link href="/hub/mentor" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span className="flex-1">ATHOS Mentor</span>
                </Link>
                <Link href="/hub/funil-leads" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Funil Comercial</span>
                </Link>
                <Link href="/hub/helena-pipeline" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Pipeline Helena</span>
                </Link>
                <Link href="/hub/maquina-vendas" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <TrendingUp className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span className="flex-1">Máquina de Vendas</span>
                </Link>
                <Link href="/hub/marketing/pilotos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <Sparkles className="w-4 h-4 shrink-0 text-violet-400" />
                  <span className="flex-1">Pilotos Criativos</span>
                </Link>
                <Link href="/operacoes" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <Flag className="w-4 h-4 shrink-0 text-violet-500" />
                  <span className="flex-1">Plano Mestre</span>
                </Link>
              </>
            )}
            <a href="/onboarding-portal/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1">Portal de Onboarding</span>
            </a>
            <Link href="/hub/ajuda" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">Central de Ajuda</span>
            </Link>
            <Link href="/planos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
              <Star className="w-4 h-4 shrink-0" />
              <span>Planos & Preços</span>
            </Link>
          </nav>

          {/* Bottom CTA */}
          {!hasActiveSub && !loading && (
            <div className="p-3 border-t">
              <Button asChild size="sm" className="w-full text-xs">
                <Link href="/planos">Assinar um plano <ArrowRight className="ml-1 w-3 h-3" /></Link>
              </Button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <p className="font-semibold text-sm">{selectedApp ? selectedApp.name : 'Hub Mirage'}</p>
          </div>

          {loading ? (
            <div className="p-6 lg:p-10 space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            </div>
          ) : selectedApp ? (
            <AppDetailView app={selectedApp} hasAccess={hasAccess(selectedApp)} />
          ) : (
            <WelcomeDashboard
              subscription={subscription}
              appsAtivos={appsAtivos}
              hasActiveSub={hasActiveSub}
              userPlan={userPlan}
              onSelectApp={setSelectedApp}
              isTrial={isTrial}
              diasRestantes={diasRestantes}
              hasTenant={hasTenant}
              onActivateTrial={handleActivateTrial}
              activatingTrial={activatingTrial}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </main>
      </div>
    </Layout>
  );
}
