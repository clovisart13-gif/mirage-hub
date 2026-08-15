/**
 * /kanban-shot — página sem nav/header, mostra só o board do Kanban (light theme)
 * Usada para capturar screenshots de criativo do Growth
 */
import { Clock, AlertTriangle, CheckCircle2, Package } from 'lucide-react';

const COLUMNS = [
  {
    name: 'Modelagem', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe',
    cards: [
      { op: 'OP-0051', client: 'Moda Sul', product: 'Camiseta Dry Fit', qty: '320 pcs', deadline: '3d', urgent: false },
      { op: 'OP-0052', client: 'BrasFash', product: 'Bermuda Tactel', qty: '180 pcs', deadline: '6d', urgent: false },
    ],
  },
  {
    name: 'Corte', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe',
    cards: [
      { op: 'OP-0047', client: 'Atacado MG', product: 'Camiseta Básica M/F', qty: '240 pcs', deadline: '2d', urgent: true },
      { op: 'OP-0048', client: 'GoodWear', product: 'Blusa Feminina', qty: '120 pcs', deadline: '5d', urgent: false },
    ],
  },
  {
    name: 'Costura', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe',
    cards: [
      { op: 'OP-0044', client: 'R2PB', product: 'Camiseta Polo', qty: '380 pcs', deadline: '1d', urgent: true },
      { op: 'OP-0045', client: 'Estilo SP', product: 'Jaqueta Leve', qty: '95 pcs', deadline: '3d', urgent: false },
      { op: 'OP-0046', client: 'Centro SP', product: 'Vestido Casual', qty: '160 pcs', deadline: '4d', urgent: false },
    ],
  },
  {
    name: 'Acabamento', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a',
    cards: [
      { op: 'OP-0041', client: 'FashMode', product: 'Calça Alfaiataria', qty: '500 pcs', deadline: '0d', urgent: true },
      { op: 'OP-0042', client: 'Via Moda', product: 'Shorts Feminino', qty: '75 pcs', deadline: '2d', urgent: false },
    ],
  },
  {
    name: 'Expedição', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0',
    cards: [
      { op: 'OP-0038', client: 'Atacado PR', product: 'Regata Esportiva', qty: '600 pcs', deadline: '0d', urgent: false },
    ],
  },
];

const STATS = [
  { label: 'Em produção', value: 'R$48.200', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { label: 'Concluídas hoje', value: '3 OPs', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { label: 'Urgentes', value: '3', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { label: 'No prazo', value: '75%', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
];

export default function KanbanShot() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* App top bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-black"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >M</div>
            <span className="text-slate-800 text-sm font-semibold">Mirage Hub</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span style={{ color: '#64748b', fontSize: 13 }}>Kanban de Produção</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: '#94a3b8', fontSize: 11 }}>R2PB Confecções</span>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: '#6366f1' }}
          >RC</div>
        </div>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-4 gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}
      >
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#334155' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto flex-1">
        {COLUMNS.map((col) => (
          <div key={col.name} className="flex-shrink-0 w-52 flex flex-col gap-2">
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}
            >
              <span className="text-xs font-bold" style={{ color: col.color }}>{col.name}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: col.color }}
              >
                {col.cards.length}
              </span>
            </div>

            {/* Cards */}
            {col.cards.map((card) => (
              <div
                key={card.op}
                className="rounded-lg p-2.5"
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: col.color, background: col.bg }}
                  >
                    {card.op}
                  </span>
                  {card.urgent && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold" style={{ color: '#dc2626' }}>
                      <AlertTriangle className="w-2.5 h-2.5" />
                      URG
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold leading-tight mb-1" style={{ color: '#1e293b' }}>{card.product}</p>
                <p className="text-[10px] mb-2" style={{ color: '#94a3b8' }}>{card.client}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: '#64748b' }}>
                    <Package className="w-3 h-3" />
                    {card.qty}
                  </span>
                  <span
                    className="flex items-center gap-1 text-[10px] font-medium"
                    style={{
                      color: card.deadline === '0d' ? '#dc2626' :
                             card.deadline === '1d' ? '#d97706' : '#64748b'
                    }}
                  >
                    <Clock className="w-3 h-3" />
                    {card.deadline === '0d' ? 'Hoje' : card.deadline === '1d' ? 'Amanhã' : card.deadline}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff' }}
      >
        <span style={{ color: '#94a3b8', fontSize: 10 }}>Atualizado há 2 min</span>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: '#059669' }}>
          <CheckCircle2 className="w-3 h-3" />
          Sistema operando normalmente
        </div>
      </div>
    </div>
  );
}
