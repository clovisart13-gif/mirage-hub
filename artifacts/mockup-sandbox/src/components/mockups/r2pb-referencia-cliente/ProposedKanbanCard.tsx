import { ArrowRight, Edit, Printer, RotateCcw, Trash2 } from 'lucide-react';
import './_group.css';

/**
 * Proposta estática do cartão do Kanban com as referências operacionalmente
 * separadas para leitura rápida durante a produção.
 */
export default function ProposedKanbanCard() {
  return (
    <section className="r2pb-kanban" aria-label="Coluna Costura do Kanban">
      <div className="r2pb-kanban__column-heading">
        <span>Costura</span>
        <span className="r2pb-kanban__column-count">1</span>
      </div>
      <article className="group select-none overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-start px-3 pt-2 pb-0">
          <div className="rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">4d</div>
        </div>
        <div className="space-y-1 px-3 py-2 text-xs">
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1">
            <span className="font-semibold tracking-wide text-gray-400">CLIENTE:</span><span className="truncate font-bold text-gray-800">NOTES</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1">
            <span className="font-semibold tracking-wide text-gray-400">PEDIDO:</span><span className="truncate font-bold text-gray-800">PED-26-217</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1">
            <span className="font-semibold tracking-wide text-gray-400">PREV. ENTREGA:</span><span className="truncate font-bold text-gray-800">28/03/2026</span>
          </div>
          <div className="mt-1 border-t border-gray-100 pt-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-violet-600">REF. R2PB · 265HO-036</p>
              <span className="shrink-0 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-700">R$ 18,50</span>
            </div>
            <div className="mt-1 border-l-2 border-violet-200 bg-violet-50/70 py-0.5 pl-2">
              <p className="truncate text-[11px] leading-4 text-violet-500"><span className="font-semibold tracking-wide text-violet-400">REF. CLIENTE:</span> <span className="font-semibold text-violet-700">REF-NOTES-7842</span></p>
            </div>
            <p className="truncate text-xs text-gray-400">Hoodie oversized canguru</p>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1">
            <span className="font-semibold tracking-wide text-gray-400">FORNECEDOR:</span><span className="truncate font-bold text-gray-800">FACÇÃO ALFA</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1">
            <span className="font-semibold tracking-wide text-gray-400">GRADE:</span><span className="truncate font-bold text-gray-800">PRETO · P/M/G/GG</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-baseline gap-1 pt-0.5">
            <span className="font-semibold tracking-wide text-gray-400">QTD:</span><span className="pr-1 text-right font-bold text-gray-900">120</span>
          </div>
        </div>
        <div className="flex justify-end gap-1.5 border-t border-gray-100 px-3 pt-1 pb-2.5">
          <CardAction label="Mover para outra fase" className="bg-violet-600 hover:bg-violet-700"><ArrowRight /></CardAction>
          <CardAction label="Imprimir Cartão de Produção" className="bg-green-600 hover:bg-green-700"><Printer /></CardAction>
          <CardAction label="Editar cartão" className="bg-blue-500 hover:bg-blue-600"><Edit /></CardAction>
          <CardAction label="Reverter para fase anterior" className="bg-orange-500 hover:bg-orange-600"><RotateCcw /></CardAction>
          <CardAction label="Excluir cartão" className="bg-red-500 hover:bg-red-600"><Trash2 /></CardAction>
        </div>
      </article>
    </section>
  );
}

function CardAction({ children, className, label }: { children: React.ReactNode; className: string; label: string }) {
  return <button type="button" aria-label={label} title={label} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white transition-colors ${className}`}>{children}</button>;
}