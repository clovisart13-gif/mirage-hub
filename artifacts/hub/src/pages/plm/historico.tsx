import { useQuery } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULO_LABEL: Record<string, string> = {
  produto: 'Produto', ficha_tecnica: 'Ficha Técnica', modelagem: 'Modelagem',
  material: 'Material', bom: 'Materiais & Custos', pilotagem: 'Pilotagem',
  aprovacao: 'Aprovação',
};

const ACAO_COLOR: Record<string, string> = {
  criacao: 'bg-blue-100 text-blue-700',
  atualizacao: 'bg-amber-100 text-amber-700',
  aprovacao: 'bg-green-100 text-green-700',
  reprovacao: 'bg-red-100 text-red-700',
  upload: 'bg-purple-100 text-purple-700',
  exclusao: 'bg-red-100 text-red-700',
};

export default function PLMHistorico() {
  const { data: auditoria, isLoading } = useQuery({
    queryKey: ['plm-auditoria'],
    queryFn: () => apiFetch('/plm/auditoria?limit=100'),
  });

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Todas as ações registradas no sistema</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (auditoria ?? []).length === 0 ? (
          <div className="text-center py-16">
            <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-gray-100 space-y-1">
            {(auditoria ?? []).map((a: any) => (
              <div key={a.id} className="relative pb-4">
                <div className="absolute -left-[1.65rem] w-3 h-3 rounded-full border-2 border-white bg-indigo-400 mt-1.5" />
                <div className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', ACAO_COLOR[a.acao] ?? 'bg-gray-100 text-gray-600')}>
                      {a.acao}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
                      {MODULO_LABEL[a.modulo] ?? a.modulo}
                    </span>
                    <p className="text-sm text-gray-700 flex-1">{a.descricao}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {a.usuario_nome && `${a.usuario_nome} · `}
                    {new Date(a.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PLMLayout>
  );
}
