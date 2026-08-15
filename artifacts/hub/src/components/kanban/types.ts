export type Fase =
  | 'inicio' | 'espera' | 'modelagem' | 'tecido' | 'risco' | 'corte'
  | 'beneficiamento' | 'costura' | 'lavanderia' | 'acabamento'
  | 'passadoria' | 'expedicao' | 'faturamento' | 'concluido';

export const FASES: Fase[] = [
  'inicio','espera','modelagem','tecido','risco','corte',
  'beneficiamento','costura','lavanderia','acabamento',
  'passadoria','expedicao','faturamento','concluido'
];

export const FASES_PRODUTIVAS = new Set<string>([
  'corte','beneficiamento','costura','lavanderia','acabamento','passadoria'
]);

export const FASES_ORIGEM_COM_POPUP = new Set<string>([
  'corte','beneficiamento','costura','lavanderia','acabamento','passadoria'
]);

export const FASE_LABEL: Record<string, string> = {
  inicio: 'Início', espera: 'Fila de Espera', modelagem: 'Modelagem',
  tecido: 'Tecido', risco: 'Risco', corte: 'Corte',
  beneficiamento: 'Beneficiamento', costura: 'Costura', lavanderia: 'Lavanderia',
  acabamento: 'Acabamento', passadoria: 'Passadoria', expedicao: 'Expedição',
  faturamento: 'Faturamento', concluido: 'Concluído',
};

export const FASE_COLOR: Record<string, string> = {
  inicio: 'bg-slate-100 text-slate-700 border-slate-200',
  espera: 'bg-slate-100 text-slate-700 border-slate-200',
  modelagem: 'bg-blue-100 text-blue-700 border-blue-200',
  tecido: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  risco: 'bg-blue-100 text-blue-700 border-blue-200',
  corte: 'bg-violet-100 text-violet-700 border-violet-200',
  beneficiamento: 'bg-purple-100 text-purple-700 border-purple-200',
  costura: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  lavanderia: 'bg-sky-100 text-sky-700 border-sky-200',
  acabamento: 'bg-teal-100 text-teal-700 border-teal-200',
  passadoria: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  expedicao: 'bg-orange-100 text-orange-700 border-orange-200',
  faturamento: 'bg-amber-100 text-amber-700 border-amber-200',
  concluido: 'bg-green-100 text-green-700 border-green-200',
};

export type FichaData = {
  id: string;
  referencia: string;
  modelagem: number;
  piloto: number;
  corte: number;
  beneficiamento: number;
  costura: number;
  lavanderia: number;
  acabamento: number;
  passadoria: number;
  tecido: number;
  aviamento: number;
  custoMO: number;
  custoMP: number;
  custoTotal: number;
};

export const FASE_FICHA_CMO: Record<string, keyof FichaData> = {
  corte: 'corte',
  costura: 'costura',
  beneficiamento: 'beneficiamento',
  lavanderia: 'lavanderia',
  acabamento: 'acabamento',
  passadoria: 'passadoria',
};

export type Referencia = {
  id: string;
  tenant_id: string;
  codigo: string;
  descricao?: string;
  descricao_modelo?: string;
  fase_atual: string;
  quantidade: number;
  quantidade_inicial: number;
  quantidade_total?: number;
  nome_cliente?: string;
  cliente_id?: string;
  numero_op?: string;
  numero_pedido?: string;
  ficha_id?: string;
  fichaData?: FichaData | null;
  cmp?: number;
  cmo?: number;
  valor_venda?: string | number;
  fornecedor?: string;
  fornecedor_id?: string;
  foto_url?: string;
  cores?: string;
  grade?: string;
  data_entrada?: string;
  data_prevista_entrega?: string;
  previsao_conclusao?: string;
  data_inicio?: string;
  data_termino_prevista?: string;
  data_termino_real?: string;
  observacoes?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  imagens?: { id: string; url: string; principal: boolean; nome?: string }[];
  cliente?: { id: string; nome: string } | null;
};

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj?: string;
  pix?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
};

export type Cliente = {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
};

export type Movimentacao = {
  id: string;
  referencia_id: string;
  fase_origem: string;
  fase_destino: string;
  quantidade: number;
  quantidade_conferida?: number;
  perda_quantidade?: number;
  cmp?: number;
  cmo?: number;
  fornecedor_id?: string;
  data_prevista?: string;
  data_real?: string;
  detalhes_corte?: Array<{ cor: string; tamanho: string; quantidade: number }>;
  observacoes?: string;
  created_at: string;
};
