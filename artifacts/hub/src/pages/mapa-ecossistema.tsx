import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

const BLOCOS = [
  {
    id: "A",
    nome: "Mirage SaaS / Core",
    cor: "from-violet-600 to-violet-800",
    borda: "border-violet-500/30",
    bg: "bg-violet-950/40",
    badge: "bg-violet-500/20 text-violet-300",
    descricao: "Coração do SaaS — controla quem é cliente, quais módulos usa e billing",
    prioridade: "Alta",
    corPrioridade: "text-red-400",
    tabelas: [
      { nome: "tenants", desc: "Empresas clientes do SaaS" },
      { nome: "tenant_users", desc: "Usuários por tenant" },
      { nome: "tenant_apps", desc: "Módulos ativos por tenant" },
      { nome: "addon_subscriptions", desc: "Addons contratados" },
      { nome: "apps", desc: "Catálogo de módulos disponíveis" },
      { nome: "companies", desc: "Dados da empresa" },
      { nome: "profiles", desc: "Perfil do usuário" },
      { nome: "provisioning_queue", desc: "Fila de ativação/auditoria" },
    ],
  },
  {
    id: "B",
    nome: "Comercial / CRM",
    cor: "from-blue-600 to-blue-800",
    borda: "border-blue-500/30",
    bg: "bg-blue-950/40",
    badge: "bg-blue-500/20 text-blue-300",
    descricao: "Captação, relacionamento e jornada comercial — leads até fechamento",
    prioridade: "Média",
    corPrioridade: "text-yellow-400",
    tabelas: [
      { nome: "leads", desc: "Leads comerciais" },
      { nome: "clientes", desc: "Base de clientes ativos" },
      { nome: "orcamentos", desc: "Orçamentos gerados" },
      { nome: "itens_orcamento", desc: "Itens de cada orçamento" },
    ],
  },
  {
    id: "C",
    nome: "Produção / R2PB",
    cor: "from-emerald-600 to-emerald-800",
    borda: "border-emerald-500/30",
    bg: "bg-emerald-950/40",
    badge: "bg-emerald-500/20 text-emerald-300",
    descricao: "Operação industrial da confecção — pedidos, estoque, corte e referências",
    prioridade: "Alta",
    corPrioridade: "text-red-400",
    tabelas: [
      { nome: "pedidos", desc: "Ordens de produção" },
      { nome: "itens_pedido", desc: "Itens de cada pedido" },
      { nome: "itens_pedido_cores", desc: "Cores por item" },
      { nome: "referencias", desc: "Referências de produto" },
      { nome: "imagens_referencia", desc: "Imagens das referências" },
      { nome: "familias_produto", desc: "Famílias de produto" },
      { nome: "grades", desc: "Grades de tamanho" },
      { nome: "cores", desc: "Catálogo de cores" },
      { nome: "fornecedores", desc: "Fornecedores de insumos" },
      { nome: "estoque", desc: "Posição de estoque" },
      { nome: "estoque_detalhes", desc: "Detalhes por SKU" },
      { nome: "movimentacoes", desc: "Entradas e saídas" },
      { nome: "corte_detalhes", desc: "Detalhes de corte" },
      { nome: "auditoria_quantidade_cortada", desc: "Auditoria de corte" },
      { nome: "listas_customizadas", desc: "Listas operacionais" },
    ],
  },
  {
    id: "D",
    nome: "Financeiro",
    cor: "from-amber-600 to-amber-800",
    borda: "border-amber-500/30",
    bg: "bg-amber-950/40",
    badge: "bg-amber-500/20 text-amber-300",
    descricao: "Custos, contas a pagar e a receber — controle financeiro da operação",
    prioridade: "Alta",
    corPrioridade: "text-red-400",
    tabelas: [
      { nome: "fichas_custo", desc: "Fichas de custo por produto" },
      { nome: "contas_a_pagar", desc: "Obrigações financeiras" },
      { nome: "contas_a_receber", desc: "Recebíveis e faturamento" },
    ],
  },
  {
    id: "E",
    nome: "ATHOS / Arquitetura Cognitiva",
    cor: "from-indigo-600 to-purple-800",
    borda: "border-indigo-500/30",
    bg: "bg-indigo-950/40",
    badge: "bg-indigo-500/20 text-indigo-300",
    descricao: "Memória estratégica, decisões, planos e identidade do mentor ATHOS",
    prioridade: "Estratégica",
    corPrioridade: "text-indigo-400",
    tabelas: [
      { nome: "mentor_identity", desc: "Identidade e personalidade do mentor" },
      { nome: "mentor_memory", desc: "Memória de longo prazo" },
      { nome: "strategic_decisions", desc: "Decisões estratégicas registradas" },
      { nome: "execution_plans", desc: "Planos de execução" },
      { nome: "execution_tasks", desc: "Tarefas dos planos" },
      { nome: "system_blueprint", desc: "Blueprint do ecossistema" },
      { nome: "blueprint_components", desc: "Componentes do blueprint" },
      { nome: "architecture_versions", desc: "Versões da arquitetura" },
      { nome: "core_mentor_plan_versions", desc: "Versões do plano do mentor" },
      { nome: "ecosytem_core_context", desc: "Contexto central do ecossistema" },
      { nome: "mentor_conversations", desc: "Conversas com mentor" },
      { nome: "core_mentor_conversations", desc: "Conversas cognitivas core" },
    ],
  },
  {
    id: "F",
    nome: "Suporte / Observabilidade",
    cor: "from-slate-600 to-slate-800",
    borda: "border-slate-500/30",
    bg: "bg-slate-950/40",
    badge: "bg-slate-500/20 text-slate-300",
    descricao: "Chamados de suporte, logs de erro e rastreabilidade de conversas",
    prioridade: "Baixa",
    corPrioridade: "text-slate-400",
    tabelas: [
      { nome: "suporte_chamadas", desc: "Chamados de suporte abertos" },
      { nome: "error_logs", desc: "Erros registrados no sistema" },
      { nome: "conversation_logs", desc: "Log de conversas/eventos" },
    ],
  },
];

const TOTAL_TABELAS = BLOCOS.reduce((acc, b) => acc + b.tabelas.length, 0);

export default function MapaEcossistema() {
  const { user, loading } = useAuth();
  const [, nav] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.email !== "clovisart13@gmail.com")) {
      nav("/hub");
    }
  }, [user, loading]);

  if (loading) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              🗺
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa do Ecossistema</h1>
              <p className="text-sm text-muted-foreground">Arquitetura operacional gerada pelo ATHOS_MENTOR · {TOTAL_TABELAS} tabelas em {BLOCOS.length} domínios</p>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BLOCOS.map(b => (
            <a key={b.id} href={`#bloco-${b.id}`} className="group">
              <div className={`rounded-xl border ${b.borda} ${b.bg} p-3 space-y-1 hover:scale-105 transition-transform cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${b.badge}`}>{b.id}</span>
                  <span className="text-xs text-muted-foreground">{b.tabelas.length}t</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-tight">{b.nome}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Blocos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {BLOCOS.map(bloco => (
            <div
              key={bloco.id}
              id={`bloco-${bloco.id}`}
              className={`rounded-2xl border ${bloco.borda} ${bloco.bg} overflow-hidden`}
            >
              {/* Header do bloco */}
              <div className={`bg-gradient-to-r ${bloco.cor} px-5 py-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/60 text-sm font-mono font-bold">{bloco.id}</span>
                      <h2 className="text-white font-bold text-base">{bloco.nome}</h2>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{bloco.descricao}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-white text-2xl font-bold">{bloco.tabelas.length}</div>
                    <div className="text-white/50 text-xs">tabelas</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-white/50 text-xs">Prioridade:</span>
                  <span className={`text-xs font-semibold ${bloco.corPrioridade.replace('text-', 'text-')} bg-black/20 px-2 py-0.5 rounded-full`}>
                    {bloco.prioridade}
                  </span>
                </div>
              </div>

              {/* Tabelas */}
              <div className="p-4">
                <div className="grid grid-cols-1 gap-1.5">
                  {bloco.tabelas.map(t => (
                    <div key={t.nome} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors group">
                      <code className={`text-xs font-mono font-semibold shrink-0 ${bloco.badge.split(' ')[1]}`}>
                        {t.nome}
                      </code>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors truncate">
                        — {t.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-5 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Recomendação do ATHOS</p>
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            O próximo passo é transformar este mapa em <strong>arquitetura de governança</strong> —
            definindo quais tabelas pertencem ao Mirage, à R2PB ou ao ATHOS,
            e criando a matriz módulo → tabelas → função.
          </p>
        </div>

      </div>
    </Layout>
  );
}
