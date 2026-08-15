import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { CheckCircle2, ArrowRight, LayoutDashboard, Clock, DollarSign, ListTodo } from 'lucide-react';

export default function KanbanPreview() {
  return (
    <Layout>
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-6">
            <LayoutDashboard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Kanban de Produção
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Acompanhe suas Ordens de Produção em tempo real. Controle as 14 fases da confecção, prazos e custos em uma interface visual intuitiva.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/planos">
                Assinar e Usar Agora <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/hub">Voltar ao Hub</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Mockup CSS Kanban Board */}
        <div className="bg-card rounded-xl border shadow-xl overflow-hidden mb-20">
          <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-4 text-sm font-medium text-muted-foreground">Kanban Mirage - Confecção</div>
          </div>
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4 overflow-x-auto pb-8">
            {/* Columns */}
            {['Início', 'Modelagem', 'Corte', 'Costura', 'Acabamento'].map((col, i) => (
              <div key={col} className="min-w-[280px] bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm">{col}</h3>
                  <span className="text-xs bg-background rounded-full px-2 py-0.5 border">{i === 0 ? 2 : i === 3 ? 3 : 1}</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-background p-3 rounded border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">OP #{1000 + i * 7}</span>
                    </div>
                    <p className="text-sm font-medium mb-3">Camiseta Básica Algodão</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> 2 dias</span>
                      <span className="flex items-center"><ListTodo className="w-3 h-3 mr-1"/> 500 un</span>
                    </div>
                  </div>
                  {i === 3 && (
                    <>
                      <div className="bg-background p-3 rounded border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium text-orange-500 bg-orange-100 dark:bg-orange-500/10 px-2 py-0.5 rounded">OP #1015</span>
                        </div>
                        <p className="text-sm font-medium mb-3">Calça Moletom Inverno</p>
                        <div className="flex items-center justify-between text-xs text-orange-500">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> Atrasado</span>
                          <span className="flex items-center text-muted-foreground"><ListTodo className="w-3 h-3 mr-1"/> 200 un</span>
                        </div>
                      </div>
                      <div className="bg-background p-3 rounded border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">OP #1022</span>
                        </div>
                        <p className="text-sm font-medium mb-3">Jaqueta Corta Vento</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> 5 dias</span>
                          <span className="flex items-center"><ListTodo className="w-3 h-3 mr-1"/> 150 un</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Gestão Visual</h3>
            <p className="text-muted-foreground">Visualize o gargalo da sua fábrica em segundos. Mova cards com facilidade e saiba exatamente onde cada pedido está.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Controle de Prazos</h3>
            <p className="text-muted-foreground">Alertas automáticos para ordens atrasadas. Garanta a entrega no prazo para seus clientes e evite multas.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Dashboard Financeiro</h3>
            <p className="text-muted-foreground">Saiba o valor faturado em cada etapa da produção. Projete o fluxo de caixa com base nas entregas futuras.</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Como Funciona</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-background rounded-full border flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h4 className="font-semibold mb-2">Crie a OP</h4>
              <p className="text-sm text-muted-foreground">Cadastre o pedido com modelo, quantidade e prazo.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-background rounded-full border flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h4 className="font-semibold mb-2">Acompanhe as Fases</h4>
              <p className="text-sm text-muted-foreground">O pedido passa pelas 14 fases produtivas até a expedição.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-background rounded-full border flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h4 className="font-semibold mb-2">Entregue com Sucesso</h4>
              <p className="text-sm text-muted-foreground">Cliente satisfeito, caixa garantido e fábrica organizada.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
