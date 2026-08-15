import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Calculator, ArrowRight, FileSpreadsheet, PieChart, Users2, Send } from 'lucide-react';

export default function OrcamentoPreview() {
  return (
    <Layout>
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-6">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Gerador de Orçamentos
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Crie propostas comerciais impecáveis em segundos. Calcule custos precisos, margens de lucro e envie PDFs profissionais para seus clientes.
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
        <div className="bg-card rounded-xl border shadow-xl overflow-hidden mb-20 max-w-4xl mx-auto">
          <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-4 text-sm font-medium text-muted-foreground">Novo Orçamento - Confecção</div>
          </div>
          <div className="p-8 bg-background grid md:grid-cols-2 gap-8">
            <div className="space-y-6 border-r pr-8">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-10 w-full bg-muted/50 rounded border"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-48 bg-muted rounded"></div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center"><FileSpreadsheet className="w-4 h-4 text-primary" /></div>
                    <div className="h-4 w-24 bg-muted rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center"><FileSpreadsheet className="w-4 h-4 text-primary" /></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center space-y-6">
              <div className="bg-primary/5 border rounded-lg p-6 text-center">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Valor Total do Orçamento</h4>
                <div className="text-4xl font-extrabold text-foreground mb-4">R$ 14.500,00</div>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">Margem: 32%</span>
                  <span className="text-muted-foreground">Custo: R$ 9.860,00</span>
                </div>
              </div>
              <Button className="w-full" size="lg">Gerar PDF e Enviar</Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Fichas de Custo</h3>
            <p className="text-muted-foreground">Cadastre tecidos, aviamentos, mão de obra e impostos. Crie templates reutilizáveis para agilizar novos orçamentos.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Cálculo Automático</h3>
            <p className="text-muted-foreground">O sistema calcula o preço de venda ideal com base na margem de lucro desejada e markup de forma inteligente.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">PDF Profissional</h3>
            <p className="text-muted-foreground">Exporte uma proposta elegante com a logo da sua confecção pronta para enviar via WhatsApp ou e-mail.</p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
