const NAV_ITEMS = ['Atendimentos', 'CRM', 'Apps', 'Relatórios', 'Ajustes', 'Admin'];

const TAGS = [
  { label: 'marca_definida', v1: 85, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'tempo_definido', v1: 80, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'plano_definido', v1: 75, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'menos de 1 ano', v1: 70, v2: 10, v3: 0, color: '#f59e0b' },
  { label: 'Básic Starter', v1: 60, v2: 15, v3: 5, color: '#10b981' },
  { label: 'publico_definido', v1: 55, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'segmento_definido', v1: 50, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'Investimento_defini...', v1: 45, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'Publico A/B', v1: 35, v2: 8, v3: 0, color: '#8b5cf6' },
  { label: 'Publico C/D', v1: 28, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'Casual', v1: 20, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'abaixo de 5k', v1: 15, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'acima de 5k', v1: 12, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'Fitness', v1: 10, v2: 0, v3: 0, color: '#ec4899' },
  { label: 'Acima de 5k', v1: 8, v2: 0, v3: 0, color: '#3b82f6' },
  { label: 'acima de 2 anos', v1: 5, v2: 2, v3: 0, color: '#f59e0b' },
  { label: 'fora de R$ 10k', v1: 3, v2: 0, v3: 0, color: '#3b82f6' },
];

const HOURS = ['22:00','21:00','20:00','19:00','18:00','17:00','16:00','15:00','14:00','13:00','12:00'];
const HOUR_DATA = [
  [30, 45, 0],
  [0, 0, 0],
  [0, 0, 0],
  [20, 0, 0],
  [45, 60, 10],
  [50, 40, 0],
  [10, 20, 0],
  [0, 0, 0],
  [60, 80, 20],
  [70, 90, 30],
  [85, 100, 40],
];

function TopNav() {
  return (
    <header className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-6 text-xs shrink-0">
      <div className="flex items-center gap-1 mr-2">
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">M</span>
        </div>
      </div>
      {NAV_ITEMS.map(item => (
        <button key={item} className={`text-gray-500 hover:text-gray-800 text-[11px] flex items-center gap-1 ${item === 'Relatórios' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5' : ''}`}>
          {item}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">🔔</div>
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs">↔</div>
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">M</div>
      </div>
    </header>
  );
}

function DonutChart() {
  const total = 226 + 16 + 15;
  const r = 52, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const segments = [
    { pct: 226 / total, color: '#3b82f6', label: '(11) 99439-3480' },
    { pct: 16 / total, color: '#f59e0b', label: 'Instância Goblet' },
    { pct: 15 / total, color: '#10b981', label: '@j2pbfabricaderoupas' },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {segments.map((seg, i) => {
          const dash = seg.pct * circumference;
          const gap = circumference - dash;
          const rotation = offset * 360 - 90;
          offset += seg.pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={seg.color} strokeWidth={20}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={35} fill="white" />
      </svg>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-[11px] text-gray-600">{seg.label}</span>
            <span className="text-[11px] font-bold text-gray-800 ml-2">
              {i === 0 ? '226' : i === 1 ? '16' : '15'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CRMRelatorios() {
  const maxTag = 85;
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      <TopNav />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Atendimentos por canal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Atendimentos por canal</h3>
            <p className="text-xs text-gray-400 mb-4">Total de atendimentos iniciados por canal</p>
            <DonutChart />
          </div>

          {/* Etiquetas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-800">Etiquetas</h3>
              <button className="text-[11px] text-blue-500 flex items-center gap-1">▲ Mais usados</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Exibindo as 50 etiquetas mais usadas</p>
            <div className="space-y-1 overflow-y-auto max-h-48">
              {TAGS.map((tag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-500 w-32 truncate text-right shrink-0">{tag.label}</span>
                  <div className="flex-1 flex items-center gap-0.5 h-3">
                    <div className="h-2.5 rounded-sm" style={{ width: `${(tag.v1 / maxTag) * 100}%`, background: '#3b82f6' }} />
                    {tag.v2 > 0 && <div className="h-2.5 rounded-sm" style={{ width: `${(tag.v2 / maxTag) * 100}%`, background: '#f59e0b' }} />}
                    {tag.v3 > 0 && <div className="h-2.5 rounded-sm" style={{ width: `${(tag.v3 / maxTag) * 100}%`, background: '#10b981' }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Volume diário */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Volume diário de atendimentos</h3>
          <p className="text-xs text-gray-400 mb-4">Foram considerados <strong>264</strong> atendimentos <strong>iniciados pelos clientes</strong> dentro do período selecionado.</p>
          <div className="flex gap-3">
            <div className="flex flex-col justify-between py-1">
              {HOURS.map(h => (
                <span key={h} className="text-[9px] text-gray-400 leading-none">{h}</span>
              ))}
            </div>
            <div className="flex-1">
              <div className="grid gap-0.5" style={{ gridTemplateRows: `repeat(${HOURS.length}, 1fr)` }}>
                {HOUR_DATA.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-0.5 h-5">
                    {Array.from({ length: 30 }).map((_, ci) => {
                      const intensity = ci < 10 ? row[0] : ci < 20 ? row[1] : row[2];
                      const opacity = Math.min(intensity / 100, 1);
                      return (
                        <div key={ci} className="flex-1 h-4 rounded-sm"
                          style={{ background: `rgba(59,130,246,${opacity * 0.9 + 0.05})` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end text-right pl-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Pico de atendimento ⓘ</p>
                <p className="text-3xl font-bold text-gray-800">12:00h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
