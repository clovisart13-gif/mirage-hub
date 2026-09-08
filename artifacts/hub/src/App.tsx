import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { apiFetch } from "@/lib/api";

import NotFound from "@/pages/not-found";
import Acesso from "@/pages/acesso";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CriarContaMirage from "@/pages/criar-conta-mirage";
import RecuperarSenha from "@/pages/recuperar-senha";
import Planos from "@/pages/planos";
import Checkout from "@/pages/checkout";
import CheckoutSucesso from "@/pages/checkout-sucesso";
import HubCentral from "@/pages/hub";
import KanbanApp from "@/pages/kanban";
import KanbanPedidos from "@/pages/kanban-pedidos";
import KanbanEstoque from "@/pages/kanban-estoque";
import KanbanPreAgendamento from "@/pages/kanban-pre-agendamento";
import KanbanContasPagar from "@/pages/kanban-contas-pagar";
import KanbanContasReceber from "@/pages/kanban-contas-receber";
import KanbanFornecedores from "@/pages/kanban-fornecedores";
import BancoParceiros from "@/pages/banco-parceiros";
import CandidatosRH from "@/pages/candidatos-rh";
import Cotacoes from "@/pages/cotacoes";
import CotacaoNova from "@/pages/cotacao-nova";
import ParceiroCadastro from "@/pages/parceiro-form";
import KanbanClientes from "@/pages/kanban-clientes";
import KanbanRelatórioFases from "@/pages/kanban-relatorio-fases";
import KanbanGerirAviamentos from "@/pages/kanban-gerir-aviamentos";
import OrcamentoPreview from "@/pages/orcamento-preview";
import KanbanPreview from "@/pages/kanban-preview";
import KanbanShot from "@/pages/kanban-shot";
import LpSistema from "@/pages/lp-sistema";
import LpBlackFriday from "@/pages/lp-black-friday";
import CustosOrcamentos from "@/pages/custos-orcamentos";
import CustosOrcamentoDetalhe from "@/pages/custos-orcamento-detalhe";
import CustosFichas from "@/pages/custos-fichas";
import CustosFichaDetalhe from "@/pages/custos-ficha-detalhe";
import CustosConfiguracoes from "@/pages/custos-configuracoes";
import PLMDashboard from "@/pages/plm/index";
import PLMProdutos from "@/pages/plm/produtos";
import PLMProdutoForm from "@/pages/plm/produto-form";
import PLMProdutoDetalhe from "@/pages/plm/produto-detalhe";
import PLMFichas from "@/pages/plm/fichas";
import PLMFichaDetalhe from "@/pages/plm/ficha-detalhe";
import PLMModelagem from "@/pages/plm/modelagem";
import PLMMateriais from "@/pages/plm/materiais";
import PLMFornecedores from "@/pages/plm/fornecedores";
import PLMBomLista from "@/pages/plm/bom";
import PLMBomDetalhe from "@/pages/plm/bom-detalhe";
import PLMProcessos from "@/pages/plm/processos";
import PLMPilotagem from "@/pages/plm/pilotagem";
import PLMAprovacoes from "@/pages/plm/aprovacoes";
import PLMRelatorios from "@/pages/plm/relatorios";
import PLMHistorico from "@/pages/plm/historico";
import PLMClientes from "@/pages/plm/clientes";
import CRMApp from "@/pages/crm";
import ERPApp from "@/pages/erp";
import TexintelApp from "@/pages/texintel";
import ComunidadeApp from "@/pages/comunidade";
import ComunidadeFornecedores from "@/pages/comunidade-fornecedores";
import ComunidadeFornecedorPerfil from "@/pages/comunidade-fornecedor-perfil";
import ComunidadeCadastroFornecedor from "@/pages/comunidade-cadastro-fornecedor";
import ComunidadeCadastroCliente from "@/pages/comunidade-cadastro-cliente";
import ComunidadeForum from "@/pages/comunidade-forum";
import ComunidadeIA from "@/pages/comunidade-ia";
import ComunidadeChat from "@/pages/comunidade-chat";
import ComunidadeVagas from "@/pages/comunidade-vagas";
import ComunidadeAnuncios from "@/pages/comunidade-anuncios";
import ComunidadeCurriculos from "@/pages/comunidade-curriculos";
import ComunidadeLanding from "@/pages/comunidade-landing";
import ComunidadeCriativo from "@/pages/comunidade-criativo";
import RelatoriosApp from "@/pages/relatorios";

import PartnersApp from "@/pages/partners";
import AdminPanel from "@/pages/admin";
import AdminVerCadastro from "@/pages/admin-ver-cadastro";
import AdminCadastrosModaConecta from "@/pages/admin-cadastros-moda-conecta";
import AdminTrialLab from "@/pages/admin-trial-lab";
import Operacoes from "@/pages/operacoes";
import Configuracoes from "@/pages/configuracoes";
import Assinatura from "@/pages/assinatura";
import Onboarding from "@/pages/onboarding";
import Comecar from "@/pages/comecar";
import MentorPage from "@/pages/mentor";
import R2PBLookupTestPage from "@/pages/r2pb-lookup-test";
import MapaEcossistema from "@/pages/mapa-ecossistema";
import AtosPage from "@/pages/atos";
import AthosMemory from "@/pages/athos-memory";
import MarketingPanel from "@/pages/marketing-panel";
import MaquinaMarketing from "@/pages/maquina-marketing";
import MarketingGrowthPage from "@/pages/marketing-growth";
import GrowthHomePage from "@/pages/growth-home";
import MarketingPilotosPage from "@/pages/marketing-pilotos";
import Privacidade from "@/pages/privacidade";
import Termos from "@/pages/termos";
import ExclusaoDeDados from "@/pages/exclusao-de-dados";
import AjudaPage from "@/pages/ajuda";
import ModaConectaFundadores from "@/pages/moda-conecta-fundadores";
import ModaConectaLanding from "@/pages/moda-conecta-landing";
import ModaConectaLeads from "@/pages/moda-conecta-leads";
import ModaConectaConvite from "@/pages/moda-conecta-convite";
import FinanceiroDashboard from "@/pages/financeiro/dashboard";
import FinanceiroExtrato from "@/pages/financeiro/extrato";
import FinanceiroImportar from "@/pages/financeiro/importar";
import FinanceiroClassificar from "@/pages/financeiro/classificar";
import FinanceiroConciliacao from "@/pages/financeiro/conciliacao";
import FinanceiroCategorias from "@/pages/financeiro/categorias";
import FinanceiroRegras from "@/pages/financeiro/regras";
import FinanceiroBackup from "@/pages/financeiro/backup";
import FinanceiroAnalises from "@/pages/financeiro/analises";
import FinanceiroMarkup from "@/pages/financeiro/markup";
import FinanceiroConexoes from "@/pages/financeiro/conexoes";
import IntegracoesPage from "@/pages/integracoes/index";
import FunilLeads from "@/pages/funil-leads";
import HelenaPipelinePage from "@/pages/helena-pipeline";
import AutomacaoComercial from "@/pages/automacao-comercial";
import MaquinaVendasPage from "@/pages/maquina-vendas";
import ContatosComerciais from "@/pages/contatos-comerciais";
import AgentHandoffsPage from "@/pages/agent-handoffs";

import { queryClient } from "@/lib/query-client";
import { findMirageTenantId, getActiveTenantId, setActiveTenantId } from "@/lib/api";
import { useMe } from "@/hooks/useMe";

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <AuthGuard>
        <TenantContextGuard>
          <SubscriptionAccessGuard>
            <Component />
          </SubscriptionAccessGuard>
        </TenantContextGuard>
      </AuthGuard>
    </Route>
  );
}

const SUPER_ADMIN_EMAIL = 'clovisart13@gmail.com';
const SUBSCRIPTION_EXEMPT_ROUTES = new Set(['/hub', '/hub/assinatura']);

function TenantContextGuard({ children }: { children: React.ReactNode }) {
  const { tenants, isSuperAdmin, isLoading } = useMe();
  const activeTenantId = getActiveTenantId();
  const validActiveTenant = tenants.some((membership) => membership.tenant_id === activeTenantId);
  const mirageTenantId = isSuperAdmin ? findMirageTenantId(tenants) : null;
  const requiredTenantId = isSuperAdmin
    ? mirageTenantId
    : (validActiveTenant ? activeTenantId : (tenants.length === 1 ? tenants[0]?.tenant_id : null));

  useEffect(() => {
    if (isLoading || !requiredTenantId || activeTenantId === requiredTenantId) return;
    setActiveTenantId(requiredTenantId);
    window.location.reload();
  }, [activeTenantId, isLoading, requiredTenantId]);

  useEffect(() => {
    if (isLoading || isSuperAdmin || !requiredTenantId || activeTenantId !== requiredTenantId) return;
    const warmupKey = `kanban-thumbnail-warmup:${requiredTenantId}`;
    if (sessionStorage.getItem(warmupKey)) return;
    sessionStorage.setItem(warmupKey, "started");
    apiFetch('/kanban/thumbnails/warm', { method: 'POST' }).catch(() => {
      sessionStorage.removeItem(warmupKey);
    });
  }, [activeTenantId, isLoading, isSuperAdmin, requiredTenantId]);

  if (isLoading || (requiredTenantId && activeTenantId !== requiredTenantId)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Preparando workspace...
      </div>
    );
  }

  if (!requiredTenantId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Escolha sua empresa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione o workspace que deseja acessar.
          </p>
          <div className="mt-5 grid gap-2">
            {tenants.map((membership) => (
              <button
                key={membership.tenant_id}
                type="button"
                className="rounded-lg border px-4 py-3 text-left text-sm font-medium hover:bg-muted"
                onClick={() => {
                  setActiveTenantId(membership.tenant_id);
                  window.location.reload();
                }}
              >
                {membership.tenants?.name ?? 'Empresa Mirage'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function SubscriptionAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [state, setState] = useState<'checking' | 'allowed' | 'blocked'>('checking');

  useEffect(() => {
    let cancelled = false;
    const isExempt = SUBSCRIPTION_EXEMPT_ROUTES.has(location);

    if (loading || !user) return;
    if (user.email === SUPER_ADMIN_EMAIL || isExempt) {
      setState('allowed');
      return;
    }

    setState('checking');
    apiFetch('/billing/assinatura')
      .then((subscription) => {
        if (cancelled) return;
        if (subscription?.access_allowed === false) {
          setState('blocked');
          navigate('/hub');
          return;
        }
        setState('allowed');
      })
      .catch(() => {
        if (cancelled) return;
        setState('blocked');
        navigate('/hub');
      });

    return () => { cancelled = true; };
  }, [location, loading, navigate, user]);

  if (loading || state === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando acesso...
      </div>
    );
  }
  if (state === 'blocked') return null;
  return <>{children}</>;
}

function SuperAdminRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <AuthGuard>
        <SuperAdminGuard>
          <Component />
        </SuperAdminGuard>
      </AuthGuard>
    </Route>
  );
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, nav] = useLocation();
  useEffect(() => {
    if (!loading && user && user.email !== SUPER_ADMIN_EMAIL) {
      nav('/hub');
    }
  }, [loading, user]);
  if (loading) return null;
  if (!user || user.email !== SUPER_ADMIN_EMAIL) return null;
  return <>{children}</>;
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary key={location}>{children}</ErrorBoundary>;
}

function RedirectTo({ to }: { to: string }) {
  const [, nav] = useLocation();
  useEffect(() => { nav(to); }, []);
  return null;
}

function Router() {
  return (
    <RouteErrorBoundary>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/criar-conta" component={CriarContaMirage} />
      <Route path="/comecar" component={Comecar} />
      <Route path="/acesso/:token" component={Acesso} />
      <Route path="/recuperar-senha" component={RecuperarSenha} />
      <Route path="/planos" component={Planos} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/sucesso" component={CheckoutSucesso} />
      <Route path="/kanban-preview" component={KanbanPreview} />
      <Route path="/kanban-shot" component={KanbanShot} />
      <Route path="/lp-sistema" component={LpSistema} />
      <Route path="/lp-sistema-mirage" component={LpSistema} />
      <Route path="/lp-black-friday" component={LpBlackFriday} />
      <Route path="/lp-black-mirage" component={LpBlackFriday} />

      <ProtectedRoute path="/hub" component={HubCentral} />
      <ProtectedRoute path="/hub/kanban" component={KanbanApp} />
      <ProtectedRoute path="/hub/kanban/pedidos" component={KanbanPedidos} />
      <ProtectedRoute path="/hub/kanban/estoque" component={KanbanEstoque} />
      <ProtectedRoute path="/hub/kanban/pre-agendamento" component={KanbanPreAgendamento} />
      <ProtectedRoute path="/hub/kanban/contas-a-pagar" component={KanbanContasPagar} />
      <ProtectedRoute path="/hub/kanban/contas-a-receber" component={KanbanContasReceber} />
      <ProtectedRoute path="/hub/kanban/fornecedores" component={KanbanFornecedores} />
      <ProtectedRoute path="/hub/kanban/parceiros/novo" component={ParceiroCadastro} />
      <ProtectedRoute path="/hub/kanban/parceiros" component={BancoParceiros} />
      <ProtectedRoute path="/hub/kanban/candidatos-rh" component={CandidatosRH} />
      <ProtectedRoute path="/hub/kanban/cotacoes/nova" component={CotacaoNova} />
      <ProtectedRoute path="/hub/kanban/cotacoes" component={Cotacoes} />
      <ProtectedRoute path="/hub/kanban/clientes" component={KanbanClientes} />
      <ProtectedRoute path="/hub/kanban/relatorio-fases" component={KanbanRelatórioFases} />
      <ProtectedRoute path="/hub/kanban/gerir-aviamentos" component={KanbanGerirAviamentos} />
      <ProtectedRoute path="/hub/orcamento" component={OrcamentoPreview} />
      <Route path="/hub/custos"><RedirectTo to="/hub/custos/fichas" /></Route>
      <ProtectedRoute path="/hub/custos/fichas" component={CustosFichas} />
      <ProtectedRoute path="/hub/custos/fichas/:id" component={CustosFichaDetalhe} />
      <ProtectedRoute path="/hub/custos/orcamentos" component={CustosOrcamentos} />
      <ProtectedRoute path="/hub/custos/orcamentos/:id" component={CustosOrcamentoDetalhe} />
      <ProtectedRoute path="/hub/custos/configuracoes" component={CustosConfiguracoes} />
      <ProtectedRoute path="/hub/plm" component={PLMDashboard} />
      <ProtectedRoute path="/hub/plm/produtos" component={PLMProdutos} />
      <ProtectedRoute path="/hub/plm/produtos/novo" component={PLMProdutoForm} />
      <ProtectedRoute path="/hub/plm/produtos/:id/editar" component={PLMProdutoForm} />
      <ProtectedRoute path="/hub/plm/produtos/:id" component={PLMProdutoDetalhe} />
      <ProtectedRoute path="/hub/plm/fichas" component={PLMFichas} />
      <ProtectedRoute path="/hub/plm/fichas/:id" component={PLMFichaDetalhe} />
      <ProtectedRoute path="/hub/plm/modelagem" component={PLMModelagem} />
      <ProtectedRoute path="/hub/plm/materiais" component={PLMMateriais} />
      <ProtectedRoute path="/hub/plm/fornecedores" component={PLMFornecedores} />
      <ProtectedRoute path="/hub/plm/bom" component={PLMBomLista} />
      <ProtectedRoute path="/hub/plm/bom/:id" component={PLMBomDetalhe} />
      <ProtectedRoute path="/hub/plm/processos" component={PLMProcessos} />
      <ProtectedRoute path="/hub/plm/pilotagem" component={PLMPilotagem} />
      <ProtectedRoute path="/hub/plm/aprovacoes" component={PLMAprovacoes} />
      <ProtectedRoute path="/hub/plm/relatorios" component={PLMRelatorios} />
      <ProtectedRoute path="/hub/plm/historico" component={PLMHistorico} />
      <ProtectedRoute path="/hub/plm/clientes" component={PLMClientes} />
      <ProtectedRoute path="/hub/crm" component={CRMApp} />
      <ProtectedRoute path="/hub/erp" component={ERPApp} />
      <ProtectedRoute path="/hub/texintel" component={TexintelApp} />
      <Route path="/hub/comunidade" component={ComunidadeApp} />
      <Route path="/hub/comunidade/fornecedores" component={ComunidadeFornecedores} />
      <Route path="/hub/comunidade/fornecedores/:id" component={ComunidadeFornecedorPerfil} />
      <Route path="/hub/comunidade/cadastro-fornecedor" component={ComunidadeCadastroFornecedor} />
      <Route path="/hub/comunidade/landing" component={ComunidadeLanding} />
      <Route path="/hub/comunidade/criativo" component={ComunidadeCriativo} />
      <Route path="/hub/comunidade/cadastro-cliente" component={ComunidadeCadastroCliente} />
      <Route path="/hub/comunidade/forum" component={ComunidadeForum} />
      <Route path="/hub/comunidade/ia" component={ComunidadeIA} />
      <Route path="/hub/comunidade/chat" component={ComunidadeChat} />
      <Route path="/hub/comunidade/vagas" component={ComunidadeVagas} />
      <Route path="/hub/comunidade/anuncios" component={ComunidadeAnuncios} />
      <Route path="/hub/comunidade/curriculos" component={ComunidadeCurriculos} />
      <ProtectedRoute path="/hub/relatorios" component={RelatoriosApp} />

      <ProtectedRoute path="/hub/partners" component={PartnersApp} />
      <ProtectedRoute path="/hub/configuracoes" component={Configuracoes} />
      <ProtectedRoute path="/hub/assinatura" component={Assinatura} />
      <ProtectedRoute path="/hub/mentor" component={MentorPage} />
      <ProtectedRoute path="/hub/r2pb/lookup-test" component={R2PBLookupTestPage} />
      <ProtectedRoute path="/hub/athos-memory" component={AthosMemory} />
      <ProtectedRoute path="/hub/mapa" component={MapaEcossistema} />
      <ProtectedRoute path="/hub/atos" component={AtosPage} />
      <SuperAdminRoute path="/hub/growth" component={GrowthHomePage} />
      <SuperAdminRoute path="/hub/marketing" component={MarketingPanel} />
      <SuperAdminRoute path="/hub/marketing/growth" component={MarketingGrowthPage} />
      <SuperAdminRoute path="/hub/marketing/pilotos" component={MarketingPilotosPage} />
      <ProtectedRoute path="/hub/marketing/maquina" component={MaquinaMarketing} />
      <ProtectedRoute path="/admin" component={AdminPanel} />
      <SuperAdminRoute path="/admin/ver-cadastro" component={AdminVerCadastro} />
      <SuperAdminRoute path="/admin/cadastros-moda-conecta" component={AdminCadastrosModaConecta} />
       <SuperAdminRoute path="/admin/trial-lab" component={AdminTrialLab} />
      <ProtectedRoute path="/operacoes" component={Operacoes} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/privacidade" component={Privacidade} />
      <Route path="/politica-de-privacidade" component={Privacidade} />
      <Route path="/termos" component={Termos} />
      <Route path="/termos-de-servico" component={Termos} />
      <Route path="/exclusao-de-dados" component={ExclusaoDeDados} />
      <Route path="/data-deletion" component={ExclusaoDeDados} />
      <Route path="/ajuda" component={AjudaPage} />
      <Route path="/hub/funil-leads" component={FunilLeads} />
      <SuperAdminRoute path="/hub/helena-pipeline" component={HelenaPipelinePage} />
      <SuperAdminRoute path="/hub/maquina-vendas" component={MaquinaVendasPage} />
      <ProtectedRoute path="/hub/automacao-comercial" component={AutomacaoComercial} />
      <ProtectedRoute path="/hub/contatos-comerciais" component={ContatosComerciais} />
      <ProtectedRoute path="/hub/automation/sales" component={AutomacaoComercial} />
      <Route path="/hub/ajuda" component={AjudaPage} />
      <Route path="/moda-conecta/fundadores" component={ModaConectaFundadores} />
      <Route path="/formulariofase1" component={ModaConectaFundadores} />
      <Route path="/moda-conecta/convite" component={ModaConectaConvite} />
      <SuperAdminRoute path="/hub/moda-conecta-leads" component={ModaConectaLeads} />

      <Route path="/hub/financeiro"><RedirectTo to="/hub/financeiro/dashboard" /></Route>
      <ProtectedRoute path="/hub/financeiro/dashboard" component={FinanceiroDashboard} />
      <ProtectedRoute path="/hub/financeiro/extrato" component={FinanceiroExtrato} />
      <ProtectedRoute path="/hub/financeiro/importar" component={FinanceiroImportar} />
      <ProtectedRoute path="/hub/financeiro/classificar" component={FinanceiroClassificar} />
      <ProtectedRoute path="/hub/financeiro/conciliacao" component={FinanceiroConciliacao} />
      <ProtectedRoute path="/hub/financeiro/categorias" component={FinanceiroCategorias} />
      <ProtectedRoute path="/hub/financeiro/regras" component={FinanceiroRegras} />
      <ProtectedRoute path="/hub/financeiro/backup" component={FinanceiroBackup} />
      <ProtectedRoute path="/hub/financeiro/analises" component={FinanceiroAnalises} />
      <ProtectedRoute path="/hub/financeiro/markup" component={FinanceiroMarkup} />
      <ProtectedRoute path="/hub/financeiro/conexoes" component={FinanceiroConexoes} />

      <ProtectedRoute path="/hub/integracoes" component={IntegracoesPage} />

      <SuperAdminRoute path="/hub/agent-handoffs" component={AgentHandoffsPage} />

      <Route component={NotFound} />
    </Switch>
    </RouteErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </TooltipProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
