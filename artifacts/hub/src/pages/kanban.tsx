import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiFetch, API_BASE } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Search, RefreshCw, Loader2, AlertTriangle, Clock,
  Calendar, Package, Edit, Trash2, Image as ImageIcon, User, X,
  Printer, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FASES, FASES_PRODUTIVAS, FASES_ORIGEM_COM_POPUP, FASE_LABEL,
  type Referencia, type Fornecedor, type Cliente
} from '@/components/kanban/types';
import NovoCartaoDialog from '@/components/kanban/NovoCartaoDialog';
import EditarCartaoDialog from '@/components/kanban/EditarCartaoDialog';
import ConcluirFaseDialog from '@/components/kanban/ConcluirFaseDialog';
import IniciarProximaFaseDialog from '@/components/kanban/IniciarProximaFaseDialog';
import IniciarTecidoDialog from '@/components/kanban/IniciarTecidoDialog';
import ConcluirTecidoDialog from '@/components/kanban/ConcluirTecidoDialog';
import IniciarExpedicaoDialog from '@/components/kanban/IniciarExpedicaoDialog';
import ExpedicaoDialog from '@/components/kanban/ExpedicaoDialog';

// ─── Paleta de cores ─────────────────────────────────────────────────────────
const PALETA = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#06b6d4','#f97316','#6b7280','#6366f1',
];

const COR_PADRAO_FASE: Record<string, string> = {
  inicio:'#64748b', espera:'#94a3b8', modelagem:'#3b82f6',
  tecido:'#06b6d4', risco:'#60a5fa', corte:'#7c3aed',
  beneficiamento:'#9333ea', costura:'#4f46e5', lavanderia:'#0ea5e9',
  acabamento:'#0d9488', passadoria:'#059669', expedicao:'#ea580c',
  faturamento:'#d97706', concluido:'#16a34a',
};

// ─── Helper functions ─────────────────────────────────────────────────────────
const fmtBRL = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const diasDesde = (d?: string | null) => {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

const diasAteTermino = (d?: string | null) => {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth();

  // Board data
  const [board, setBoard] = useState<Record<string, Referencia[]>>({});
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('TODOS');

  // Column customization (inicializa do localStorage; sobrescreve com API)
  const [nomes, setNomes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('kanban-nomes') || '{}'); } catch { return {}; }
  });
  const [cores, setCores] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('kanban-cores') || '{}'); } catch { return {}; }
  });
  const [ocultas, setOcultas] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('kanban-ocultas') || '[]'); } catch { return []; }
  });
  const [faseConfigSaving, setFaseConfigSaving] = useState(false);
  const [corSelecionando, setCorSelecionando] = useState<string | null>(null);

  // Company config (for printed cards)
  const [empresa, setEmpresa] = useState<{ nome_empresa?: string; logo_url?: string } | null>(null);

  const kanbanRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ isPanning: false, startX: 0, scrollLeft: 0 });

  // Dialog states
  const [novoOpen, setNovoOpen] = useState(false);
  const [editarCartao, setEditarCartao] = useState<Referencia | null>(null);

  // Phase flow dialogs
  const [cartaoEmFoco, setCartaoEmFoco] = useState<Referencia | null>(null);
  const [proximaFase, setProximaFase] = useState('');
  const [concluirFaseOpen, setConcluirFaseOpen] = useState(false);
  const [iniciarProximaOpen, setIniciarProximaOpen] = useState(false);
  const [iniciarTecidoOpen, setIniciarTecidoOpen] = useState(false);
  const [concluirTecidoOpen, setConcluirTecidoOpen] = useState(false);
  const [etapaDestinoTecido, setEtapaDestinoTecido] = useState('');
  const [iniciarExpedicaoOpen, setIniciarExpedicaoOpen] = useState(false);
  const [expedicaoOpen, setExpedicaoOpen] = useState(false);

  // ─── Load data ─────────────────────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (filtroCliente !== 'TODOS') params.set('cliente_id', filtroCliente);
      const data = await apiFetch(`/kanban/referencias/board?${params}`);
      setBoard(data.board ?? {});
    } catch (err: any) {
      toast.error('Erro ao carregar o quadro: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [busca, filtroCliente]);

  const loadSideData = useCallback(async () => {
    try {
      const [fornData, cliData, empresaData] = await Promise.all([
        apiFetch('/kanban/fornecedores'),
        apiFetch('/kanban/clientes'),
        apiFetch('/tenants/empresa').catch(() => null),
      ]);
      setFornecedores(fornData);
      setClientes(cliData);
      if (empresaData) setEmpresa(empresaData);
    } catch { /* non-blocking */ }
  }, []);

  // ─── Load fase config from DB (overrides localStorage) ──────────────────────
  useEffect(() => {
    apiFetch('/kanban/fase-config').then((data: { config: Array<{ fase_id: string; nomeExibicao: string; cor: string | null; oculta: boolean; ordem: number }> }) => {
      if (!data?.config) return;
      const nomesDB: Record<string, string> = {};
      const coresDB: Record<string, string> = {};
      const ocultasDB: string[] = [];
      for (const f of data.config) {
        nomesDB[f.fase_id] = f.nomeExibicao;
        if (f.cor) coresDB[f.fase_id] = f.cor;
        if (f.oculta) ocultasDB.push(f.fase_id);
      }
      setNomes(nomesDB);
      setCores(coresDB);
      setOcultas(ocultasDB);
      // Sincronizar localStorage
      localStorage.setItem('kanban-nomes', JSON.stringify(nomesDB));
      localStorage.setItem('kanban-cores', JSON.stringify(coresDB));
      localStorage.setItem('kanban-ocultas', JSON.stringify(ocultasDB));
    }).catch(() => { /* usa localStorage como fallback */ });
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);
  useEffect(() => { loadSideData(); }, [loadSideData]);

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => loadBoard(), 300);
    return () => clearTimeout(t);
  }, [busca]);

  // ─── Pan by click-drag on empty board area ─────────────────────────────────
  useEffect(() => {
    const el = kanbanRef.current;
    if (!el) return;

    const isInteractive = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return !!target.closest('button, a, input, select, textarea, [role="button"], [tabindex="0"]');
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isInteractive(e.target)) return;
      panRef.current = { isPanning: true, startX: e.clientX, scrollLeft: el.scrollLeft };
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panRef.current.isPanning) return;
      const dx = e.clientX - panRef.current.startX;
      el.scrollLeft = panRef.current.scrollLeft - dx;
    };

    const onMouseUp = () => {
      if (!panRef.current.isPanning) return;
      panRef.current.isPanning = false;
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [loading]); // re-run when loading → false so kanbanRef.current is valid

  // ─── Column customization ──────────────────────────────────────────────────
  const salvarFaseConfigAPI = async (faseId: string, patch: { nomeExibicao?: string; cor?: string; oculta?: boolean }) => {
    try {
      setFaseConfigSaving(true);
      await apiFetch('/kanban/fase-config', {
        method: 'PUT',
        body: JSON.stringify({ config: [{ fase_id: faseId, ...patch }] }),
      });
    } catch { /* silencioso — localStorage já manteve a mudança */ } finally {
      setFaseConfigSaving(false);
    }
  };

  const renomearFase = (faseId: string) => {
    const atual = nomes[faseId] || FASE_LABEL[faseId] || faseId;
    const novo = prompt(`Renomear "${atual}":`, atual);
    if (novo?.trim()) {
      const updated = { ...nomes, [faseId]: novo.trim() };
      setNomes(updated);
      localStorage.setItem('kanban-nomes', JSON.stringify(updated));
      salvarFaseConfigAPI(faseId, { nomeExibicao: novo.trim(), cor: cores[faseId] ?? undefined, oculta: ocultas.includes(faseId) });
      toast.success('Fase renomeada!');
    }
  };

  const escolherCor = (faseId: string, cor: string) => {
    const updated = { ...cores, [faseId]: cor };
    setCores(updated);
    localStorage.setItem('kanban-cores', JSON.stringify(updated));
    setCorSelecionando(null);
    salvarFaseConfigAPI(faseId, { nomeExibicao: nomes[faseId] ?? undefined, cor, oculta: ocultas.includes(faseId) });
    toast.success('Cor atualizada!');
  };

  const ocultarFase = (faseId: string) => {
    const qtd = (board[faseId] ?? []).length;
    if (qtd > 0 && !confirm(`Esta fase tem ${qtd} cartão(ões). Ocultar mesmo assim?`)) return;
    const updated = [...ocultas, faseId];
    setOcultas(updated);
    localStorage.setItem('kanban-ocultas', JSON.stringify(updated));
    salvarFaseConfigAPI(faseId, { nomeExibicao: nomes[faseId] ?? undefined, cor: cores[faseId] ?? undefined, oculta: true });
    toast.success('Fase ocultada!');
  };

  const executarMovimentacao = async (cartao: Referencia, faseOrigem: string, faseDestino: string) => {
    const exigePopup = FASES_ORIGEM_COM_POPUP.has(faseOrigem);
    const destinoExigeIniciar = FASES_PRODUTIVAS.has(faseDestino);

    // TECIDO: saindo
    if (faseOrigem === 'tecido') {
      setCartaoEmFoco(cartao);
      setEtapaDestinoTecido(faseDestino);
      setConcluirTecidoOpen(true);
      return;
    }

    // TECIDO: entrando
    if (faseDestino === 'tecido') {
      setCartaoEmFoco(cartao);
      setIniciarTecidoOpen(true);
      return;
    }

    // EXPEDICAO: saindo
    if (faseOrigem === 'expedicao') {
      setCartaoEmFoco(cartao);
      setExpedicaoOpen(true);
      return;
    }

    // EXPEDICAO: entrando com popup obrigatório
    if (faseDestino === 'expedicao') {
      if (exigePopup) {
        setCartaoEmFoco(cartao);
        setProximaFase(faseDestino);
        setConcluirFaseOpen(true);
      } else {
        setCartaoEmFoco(cartao);
        setIniciarExpedicaoOpen(true);
      }
      return;
    }

    // Fases produtivas saindo
    if (exigePopup) {
      setCartaoEmFoco(cartao);
      setProximaFase(faseDestino);
      setConcluirFaseOpen(true);
      return;
    }

    // Qualquer fase não-produtiva → fase produtiva: abre modal para definir CMO, fornecedor e datas
    if (destinoExigeIniciar) {
      setCartaoEmFoco(cartao);
      setProximaFase(faseDestino);
      setIniciarProximaOpen(true);
      return;
    }

    // Mover direto (fases administrativas)
    try {
      await apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
        method: 'POST',
        body: JSON.stringify({ fase_destino: faseDestino, quantidade: cartao.quantidade }),
      });
      loadBoard();
    } catch (err: any) {
      toast.error('Erro ao mover: ' + err.message);
      loadBoard(); // revert
    }
  };

  const handleConcluirFaseSuccess = async () => {
    setConcluirFaseOpen(false);
    await loadBoard();
    // Fetch updated card
    const faseAtual = proximaFase;
    if (faseAtual === 'concluido' || faseAtual === 'espera') return;
    if (faseAtual === 'expedicao') {
      setTimeout(() => { setIniciarExpedicaoOpen(true); }, 100);
    } else {
      setTimeout(() => { setIniciarProximaOpen(true); }, 100);
    }
  };

  // ─── Move modal (button-based) ─────────────────────────────────────────────
  const [moverTarget, setMoverTarget] = useState<Referencia | null>(null);
  const [moverFaseDst, setMoverFaseDst] = useState('');

  const handleAbrirMover = (cartao: Referencia) => {
    setMoverTarget(cartao);
    setMoverFaseDst('');
  };

  const handleConfirmarMover = async () => {
    if (!moverTarget || !moverFaseDst) return;
    const faseSrc = moverTarget.fase_atual;
    const faseDst = moverFaseDst;
    setMoverTarget(null);
    // Optimistic update
    setBoard(prev => {
      const b = { ...prev };
      b[faseSrc] = (b[faseSrc] ?? []).filter(r => r.id !== moverTarget.id);
      b[faseDst] = [{ ...moverTarget, fase_atual: faseDst }, ...(b[faseDst] ?? [])];
      return b;
    });
    await executarMovimentacao(moverTarget, faseSrc, faseDst);
  };

  const handleReverter = (cartao: Referencia) => {
    const idx = FASES.indexOf(cartao.fase_atual as any);
    if (idx <= 0) { toast.error('Não há fase anterior'); return; }
    const fasePrev = FASES[idx - 1];
    if (!confirm(`Reverter "${cartao.codigo}" para "${FASE_LABEL[fasePrev]}"?`)) return;
    setBoard(prev => {
      const b = { ...prev };
      b[cartao.fase_atual] = (b[cartao.fase_atual] ?? []).filter(r => r.id !== cartao.id);
      b[fasePrev] = [{ ...cartao, fase_atual: fasePrev }, ...(b[fasePrev] ?? [])];
      return b;
    });
    apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
      method: 'POST',
      body: JSON.stringify({ fase_destino: fasePrev, quantidade: cartao.quantidade }),
    }).then(() => loadBoard()).catch((err: any) => {
      toast.error('Erro ao reverter: ' + err.message);
      loadBoard();
    });
  };

  // ─── Print Cartão de Produção ───────────────────────────────────────────────
  const imprimirCartao = async (cartao: Referencia) => {
    const fmtD = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '--/--/----';
    const fmtR = (c?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c ?? 0) / 100);

    // Buscar itens_pedido desta referência (grade real com quantidades por tamanho)
    interface ItemImpressao { corNome: string; gradeNome: string; gradeTamanhos: string[]; quantidadeTotal: number; quantidadePorTamanho: Record<string, number>; }
    let itensRef: ItemImpressao[] = [];
    try { itensRef = await apiFetch(`/kanban/referencias/${cartao.id}/itens`); } catch { /* sem itens, usa fallback */ }

    // Monta a tabela grade de corte dinamicamente
    const buildGradeTable = () => {
      if (itensRef.length === 0) {
        // Fallback: grade do texto livre do cartão
        const gradeTexto = cartao.grade || '';
        const tamanhos = gradeTexto.split('/').map(s => s.trim()).filter(Boolean);
        if (tamanhos.length === 0) tamanhos.push(...['P', 'M', 'G', 'GG']);
        const header = `<tr><th>Cor</th>${tamanhos.map(t => `<th>${t}</th>`).join('')}<th>Total</th></tr>`;
        const row = `<tr><td>${cartao.cores ?? '--'}</td>${tamanhos.map(() => '<td></td>').join('')}<td>${cartao.quantidade ?? 0}</td></tr>`;
        const total = `<tr><td colspan="${tamanhos.length + 1}" style="text-align:right;font-weight:bold">TOTAL</td><td>${cartao.quantidade ?? 0}</td></tr>`;
        return `<table><thead>${header}</thead><tbody>${row}${total}</tbody></table>`;
      }
      // Coleta todos tamanhos únicos (mantém ordem da grade)
      const allTam: string[] = [];
      itensRef.forEach(i => {
        const sizes = (i.gradeTamanhos && i.gradeTamanhos.length > 0) ? i.gradeTamanhos : Object.keys(i.quantidadePorTamanho || {});
        sizes.forEach(s => { if (!allTam.includes(s)) allTam.push(s); });
      });
      if (allTam.length === 0) {
        // Itens sem grade estruturada — usar grade texto do cartão como colunas de cabeçalho
        const gradeTexto = cartao.grade || '';
        const tamFallback = gradeTexto.split('/').map((s: string) => s.trim()).filter(Boolean);
        if (tamFallback.length === 0) tamFallback.push(...['P', 'M', 'G', 'GG']);
        const totalGeral = itensRef.reduce((s, i) => s + i.quantidadeTotal, 0);
        const header = `<tr><th>Cor</th>${tamFallback.map((t: string) => `<th>${t}</th>`).join('')}<th>Total</th></tr>`;
        const rows = itensRef.map(i => `<tr><td>${i.corNome || (cartao.cores ?? '--')}</td>${tamFallback.map(() => '<td></td>').join('')}<td style="text-align:center;font-weight:bold">${i.quantidadeTotal}</td></tr>`).join('');
        const totalRow = `<tr><td colspan="${tamFallback.length + 1}" style="text-align:right;font-weight:bold">TOTAL</td><td style="text-align:center;font-weight:bold">${totalGeral}</td></tr>`;
        return `<table><thead>${header}</thead><tbody>${rows}${totalRow}</tbody></table>`;
      }
      const header = `<tr><th>Cor</th><th>Grade</th>${allTam.map(t => `<th>${t}</th>`).join('')}<th>Total</th></tr>`;
      const rows = itensRef.map(i => {
        const qtds = i.quantidadePorTamanho || {};
        const cells = allTam.map(t => { const v = qtds[t]; return `<td style="text-align:center">${(v != null && v > 0) ? v : '–'}</td>`; }).join('');
        return `<tr><td>${i.corNome || '--'}</td><td>${i.gradeNome || '--'}</td>${cells}<td style="text-align:center;font-weight:bold">${i.quantidadeTotal}</td></tr>`;
      }).join('');
      const totalGeral = itensRef.reduce((s, i) => s + i.quantidadeTotal, 0);
      const totalRow = `<tr><td colspan="${allTam.length + 2}" style="text-align:right;font-weight:bold">TOTAL</td><td style="text-align:center;font-weight:bold">${totalGeral}</td></tr>`;
      return `<table><thead>${header}</thead><tbody>${rows}${totalRow}</tbody></table>`;
    };

    // Converte URL relativa (/objects/...) para absoluta (API_BASE/storage/...)
    const resolveImgUrl = (url?: string | null): string => {
      if (!url) return '';
      if (url.startsWith('/objects/')) return `${API_BASE}/storage${url}`;
      return url;
    };

    // Foto principal: primeiro tenta imagens[], depois foto_url
    const fotoUrl: string =
      resolveImgUrl(cartao.imagens?.find(i => i.principal)?.url) ||
      resolveImgUrl(cartao.imagens?.[0]?.url) ||
      resolveImgUrl(cartao.foto_url) ||
      '';

    const gradeTableHtml = buildGradeTable();

    const buildRetornoTable = () => {
      if (itensRef.length === 0) {
        const gradeTexto = cartao.grade || '';
        const tam = gradeTexto.split('/').map((s: string) => s.trim()).filter(Boolean);
        if (tam.length === 0) tam.push(...['P', 'M', 'G', 'GG']);
        return `<table><thead><tr><th>Cor</th>${tam.map((t: string) => `<th>${t}</th>`).join('')}<th>Total</th></tr></thead><tbody><tr><td>&nbsp;</td>${tam.map(() => '<td></td>').join('')}<td></td></tr><tr><td colspan="${tam.length + 1}" style="text-align:right;font-weight:bold">TOTAL</td><td></td></tr></tbody></table>`;
      }
      const allTam: string[] = [];
      itensRef.forEach(i => {
        const sizes = (i.gradeTamanhos && i.gradeTamanhos.length > 0) ? i.gradeTamanhos : Object.keys(i.quantidadePorTamanho || {});
        sizes.forEach((s: string) => { if (!allTam.includes(s)) allTam.push(s); });
      });
      if (allTam.length === 0) {
        return `<table><thead><tr><th>Cor</th><th>Grade</th><th>Total</th></tr></thead><tbody><tr><td>&nbsp;</td><td></td><td></td></tr><tr><td colspan="2" style="text-align:right;font-weight:bold">TOTAL</td><td></td></tr></tbody></table>`;
      }
      const header = `<tr><th>Cor</th><th>Grade</th>${allTam.map((t: string) => `<th>${t}</th>`).join('')}<th>Total</th></tr>`;
      const rows = itensRef.map(i => `<tr><td>${i.corNome || '--'}</td><td>${i.gradeNome || '--'}</td>${allTam.map(() => '<td></td>').join('')}<td></td></tr>`).join('');
      const totalRow = `<tr><td colspan="${allTam.length + 2}" style="text-align:right;font-weight:bold">TOTAL</td><td></td></tr>`;
      return `<table><thead>${header}</thead><tbody>${rows}${totalRow}</tbody></table>`;
    };

    const empresaLogoHtml = empresa?.logo_url
      ? `<img src="${empresa.logo_url}" alt="${empresa.nome_empresa ?? ''}" style="height:26px;max-width:90px;object-fit:contain;filter:brightness(0) invert(1);opacity:0.9">`
      : '';
    const empresaNomeHtml = empresa?.nome_empresa
      ? `<div style="font-size:8px;color:#a0c4f1;margin-top:2px;font-weight:bold;letter-spacing:.5px">${empresa.nome_empresa}</div>`
      : '';

    const fotoHtml = fotoUrl
      ? `<div style="margin:8px 0 4px;text-align:center">
           <img src="${fotoUrl}" alt="Referência"
             style="max-width:100%;max-height:90px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#f9f9f9;padding:2px">
         </div>`
      : '';

    const via = (dest: string) => `
<div class="cartao">
  <div class="header">
    <div class="header-left">
      ${empresaLogoHtml}
      <div class="header-title" style="margin-top:${empresa?.logo_url ? '3px' : '0'}">CARTÃO DE PRODUÇÃO</div>
      ${empresaNomeHtml}
      <div class="header-sub">${cartao.codigo} · ${cartao.nome_cliente ?? ''}</div>
    </div>
    <div class="header-right">
      <div class="dest-badge">${dest}</div>
      <div class="fase-badge">${FASE_LABEL[cartao.fase_atual] ?? cartao.fase_atual ?? 'PRODUÇÃO'}</div>
    </div>
  </div>
  <div class="body">
    <div class="grid3">
      <div class="col-info">
        <div class="label">Cliente</div><div class="value">${cartao.nome_cliente ?? '--'}</div>
        <div class="label">Código / Referência</div><div class="value">${cartao.codigo}</div>
        <div class="label">Modelo / Descrição</div><div class="value">${cartao.descricao_modelo ?? cartao.descricao ?? '--'}</div>
        <div class="label">Fornecedor</div><div class="value">${cartao.fornecedor ?? '--'}</div>
        <div class="row2" style="margin-top:6px">
          <div><div class="label">Início</div><div class="value">${fmtD(cartao.data_inicio)}</div></div>
          <div><div class="label">Vencimento</div><div class="value">${fmtD(cartao.previsao_conclusao ?? cartao.data_prevista_entrega)}</div></div>
        </div>
      </div>
      <div class="col-qtd">
        <div class="label">Nº Pedido</div><div class="value">${cartao.numero_pedido ?? '--'}</div>
        <div class="label">OP</div><div class="value">${cartao.numero_op ?? '--'}</div>
        <div class="label">Quantidade</div>
        <div class="qtd-box">${cartao.quantidade ?? 0}</div>
        <div class="row2" style="margin-top:6px">
          <div><div class="label">CMO Unit.</div><div class="value">${fmtR(cartao.cmo)}</div></div>
          <div><div class="label">CMO Total</div><div class="value">${fmtR((cartao.cmo ?? 0) * (cartao.quantidade ?? 0))}</div></div>
        </div>
      </div>
      ${fotoUrl ? `<div class="col-foto">${fotoHtml}</div>` : ''}
    </div>

    <h3>Grade de Corte</h3>
    ${gradeTableHtml}

    <h3>Retorno / Quantidade Produzida</h3>
    ${buildRetornoTable()}

    ${cartao.observacoes ? `<h3>Observações</h3><div class="obs-area">${cartao.observacoes}</div>` : ''}

    <div class="footer">
      <span>Impresso em: ${new Date().toLocaleString('pt-BR')}</span>
      <div class="sig">Assinatura / Responsável</div>
    </div>
  </div>
</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Cartão de Produção — ${cartao.codigo}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:10px;color:#111;background:#fff}
@page{size:A4 portrait;margin:10mm}

/* Duas vias por página */
.page{display:flex;flex-direction:column;gap:0}
.cartao{display:flex;flex-direction:column;margin-bottom:4mm}

/* Linha de corte */
.corte{display:flex;align-items:center;gap:6px;color:#999;font-size:9px;padding:2mm 0;margin-bottom:4mm}
.corte-line{flex:1;border-top:1px dashed #aaa}
.corte-icon{font-size:13px;transform:rotate(90deg);display:inline-block}

/* Header */
.header{display:flex;justify-content:space-between;align-items:flex-start;background:#1e3a5f;color:white;padding:7px 10px;border-radius:4px 4px 0 0}
.header-title{font-size:13px;font-weight:bold;letter-spacing:1px}
.header-sub{font-size:9px;color:#a0c4f1;margin-top:2px}
.header-left{display:flex;flex-direction:column}
.header-right{text-align:right;display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.dest-badge{background:#f59e0b;color:#111;font-weight:bold;padding:2px 10px;border-radius:3px;font-size:10px}
.fase-badge{background:#ffffff22;color:#fff;font-size:9px;padding:1px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:1px}

/* Body */
.body{border:1px solid #ccc;border-top:none;padding:8px 10px;border-radius:0 0 4px 4px}
.grid3{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:start}
.col-info{}
.col-qtd{}
.col-foto{display:flex;align-items:flex-start;justify-content:center;padding-top:2px}
.label{color:#888;font-size:8px;text-transform:uppercase;margin-bottom:1px;margin-top:5px}
.value{font-weight:bold;font-size:11px}
.qtd-box{border:2px solid #1e3a5f;border-radius:4px;text-align:center;padding:4px;font-size:22px;font-weight:bold;color:#1e3a5f;margin-top:3px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
table{width:100%;border-collapse:collapse;margin-top:4px;font-size:9px}
th{background:#e8f0fe;border:1px solid #ccc;padding:3px 4px;text-align:center;font-size:8px}
td{border:1px solid #ccc;padding:3px 4px;text-align:center}
td:first-child{text-align:left}
h3{font-size:8px;color:#555;margin:8px 0 3px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #eee;padding-bottom:2px}
.obs-area{border:1px solid #ccc;border-radius:3px;min-height:30px;padding:5px;font-size:9px;margin-top:2px}
.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;padding-top:5px;border-top:1px solid #eee}
.sig{border-top:1px solid #333;width:140px;text-align:center;padding-top:2px;font-size:8px;color:#555}
</style></head><body>
<div class="page">
  ${via('FORNECEDOR')}
  <div class="corte">
    <div class="corte-line"></div>
    <span class="corte-icon">✂</span>
    <span>recorte aqui</span>
    <div class="corte-line"></div>
  </div>
  ${via('FÁBRICA')}
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=1000');
    if (!w) { toast.error('Popup bloqueado — permita popups para imprimir'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  // ─── Delete card ───────────────────────────────────────────────────────────
  const excluirCartao = async (cartao: Referencia) => {
    if (!confirm(`Excluir referência ${cartao.codigo}?`)) return;
    try {
      await apiFetch(`/kanban/referencias/${cartao.id}`, { method: 'DELETE' });
      toast.success('Referência excluída!');
      loadBoard();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };


  // ─── Keyboard shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setNovoOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Filter colors picker close ────────────────────────────────────────────
  useEffect(() => {
    if (!corSelecionando) return;
    const handler = () => setCorSelecionando(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [corSelecionando]);

  // ─── Totals per column ─────────────────────────────────────────────────────
  const totalFase = (faseId: string) => {
    const cards = board[faseId] ?? [];
    return {
      qtd: cards.reduce((s, r) => s + (r.quantidade ?? 0), 0),
      cmo: cards.reduce((s, r) => s + ((r.cmo ?? 0) * (r.quantidade ?? 0)), 0),
      count: cards.length,
    };
  };

  // All unique clients from board
  const clientesBoard = Array.from(new Set(
    Object.values(board).flat().map(r => r.nome_cliente).filter(Boolean)
  )).sort() as string[];

  // ─── Resumo global (aplica filtros ativos) ─────────────────────────────────
  // Exclui fase "concluido" — cartões concluídos já foram lançados em contas a pagar
  // O total geral mostra apenas o que ainda está em produção
  const resumo = useMemo(() => {
    const cards = Object.entries(board).flatMap(([faseId, cs]) =>
      faseId === 'concluido' ? [] : cs
    ).filter(r => {
      const matchBusca = !busca || r.codigo.toLowerCase().includes(busca.toLowerCase());
      const matchCliente = filtroCliente === 'TODOS' || r.nome_cliente === filtroCliente;
      return matchBusca && matchCliente;
    });
    return {
      ops: cards.length,
      pecas: cards.reduce((s, r) => s + (r.quantidade ?? 0), 0),
      cmo: cards.reduce((s, r) => s + ((r.cmo ?? 0) * (r.quantidade ?? 0)), 0),
    };
  }, [board, busca, filtroCliente]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <KanbanLayout fullWidth>
    <div className="bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-violet-600" />
          <h1 className="text-lg font-bold text-gray-800">Kanban de Produção</h1>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <Input
              placeholder="Buscar código..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-8 h-9 w-48"
            />
            {busca && <button onClick={() => setBusca('')} className="absolute right-2 top-2.5"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>

          {/* Filtro cliente */}
          <select
            value={filtroCliente}
            onChange={e => { setFiltroCliente(e.target.value); setTimeout(loadBoard, 50); }}
            className="h-9 border border-input rounded-md px-3 text-sm bg-background"
          >
            <option value="TODOS">Todos os clientes</option>
            {clientesBoard.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Ocultas */}
          {ocultas.length > 0 && (
            <Button variant="outline" size="sm" onClick={async () => {
              setOcultas([]);
              localStorage.removeItem('kanban-ocultas');
              // Limpar ocultas no banco para todas as fases
              const payload = ocultas.map(f => ({ fase_id: f, nomeExibicao: nomes[f] ?? undefined, cor: cores[f] ?? undefined, oculta: false }));
              try { await apiFetch('/kanban/fase-config', { method: 'PUT', body: JSON.stringify({ config: payload }) }); } catch { /* silencioso */ }
            }}>
              Mostrar tudo ({ocultas.length} oculta{ocultas.length > 1 ? 's' : ''})
            </Button>
          )}

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadBoard} title="Recarregar">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button size="sm" onClick={() => setNovoOpen(true)} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" /> Novo Cartão <kbd className="ml-1 text-xs opacity-70">N</kbd>
          </Button>
        </div>
      </header>

      {/* ─── Barra de resumo ─── */}
      {!loading && (
        <div className="bg-violet-700 text-white px-4 py-2 flex items-center gap-6 text-xs font-medium shrink-0 flex-wrap">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-white/70 uppercase tracking-wide text-[10px]">Qtd OPs</span>
            <span className="text-base font-bold leading-tight">{resumo.ops}</span>
          </div>
          <div className="w-px h-7 bg-white/20 hidden sm:block" />
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="text-white/70 uppercase tracking-wide text-[10px]">Total CMO</span>
            <span className="text-base font-bold leading-tight">{fmtBRL(resumo.cmo)}</span>
          </div>
          <div className="w-px h-7 bg-white/20 hidden sm:block" />
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="text-white/70 uppercase tracking-wide text-[10px]">Qtde Peças</span>
            <span className="text-base font-bold leading-tight">{resumo.pecas.toLocaleString('pt-BR')}</span>
          </div>
          {(busca || filtroCliente !== 'TODOS') && (
            <span className="ml-auto opacity-70 italic text-[10px]">filtrado</span>
          )}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 p-3 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <div
              ref={kanbanRef}
              className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-120px)]"
              style={{ cursor: 'grab' }}
            >
              {FASES.filter(f => !ocultas.includes(f)).map(faseId => {
                const cor = cores[faseId] || COR_PADRAO_FASE[faseId] || '#6366f1';
                const nome = nomes[faseId] || FASE_LABEL[faseId] || faseId;
                const cards = (board[faseId] ?? []).filter(r => {
                  const matchBusca = !busca || r.codigo.toLowerCase().includes(busca.toLowerCase());
                  const matchCliente = filtroCliente === 'TODOS' || r.nome_cliente === filtroCliente;
                  return matchBusca && matchCliente;
                });
                const totais = totalFase(faseId);

                return (
                  <div key={faseId} className="flex-shrink-0 flex flex-col" style={{ width: 300 }}>
                    {/* Column header */}
                    <div
                      className="rounded-xl px-4 py-3 mb-2 text-white font-bold flex items-center justify-between shadow-md"
                      style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}cc 100%)` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm">{nome}</span>
                        <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">{totais.count}</span>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button onClick={() => renomearFase(faseId)} className="hover:bg-white/20 p-1 rounded text-xs" title="Renomear">✏️</button>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); setCorSelecionando(corSelecionando === faseId ? null : faseId); }}
                          onKeyDown={e => e.key === 'Enter' && setCorSelecionando(corSelecionando === faseId ? null : faseId)}
                          className="hover:bg-white/20 p-1 rounded relative cursor-pointer"
                          title="Cor"
                        >
                          🎨
                          {corSelecionando === faseId && (
                            <div onClick={e => e.stopPropagation()} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl p-3 z-50 grid grid-cols-5 gap-1.5 border">
                              {PALETA.map(c => (
                                <button key={c} onClick={() => escolherCor(faseId, c)} className="w-7 h-7 rounded-full border-2 border-transparent hover:scale-125 transition-transform" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => ocultarFase(faseId)} className="hover:bg-white/20 p-1 rounded text-xs" title="Ocultar">👁️</button>
                      </div>
                    </div>

                    {/* Column totals */}
                    <div className="px-1 mb-2 text-xs text-gray-500 leading-5">
                      {faseId === 'concluido' ? (
                        <div>CMO: <span className="font-medium text-green-600">Já faturado</span></div>
                      ) : (
                        <div>Total: <span className="font-medium text-gray-700">{fmtBRL(totais.cmo)}</span></div>
                      )}
                      <div>Qtd: <span className="font-medium text-gray-700">{totais.qtd}</span></div>
                    </div>

                    {/* Cards area */}
                    <div
                      className="flex-1 overflow-y-auto space-y-2 px-0.5 pb-2 rounded-xl min-h-[120px]"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {cards.map(cartao => (
                        <KanbanCard
                          key={cartao.id}
                          cartao={cartao}
                          onEdit={() => setEditarCartao(cartao)}
                          onDelete={() => excluirCartao(cartao)}
                          onMover={() => handleAbrirMover(cartao)}
                          onImprimir={() => imprimirCartao(cartao)}
                          onReverter={() => handleReverter(cartao)}
                        />
                      ))}
                      {cards.length === 0 && (
                        <div className="text-center py-8 text-gray-300 text-sm">
                          Nenhum cartão
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        )}
      </div>

      {/* Dialogs */}
      <NovoCartaoDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        onSuccess={() => loadBoard()}
        clientes={clientes}
      />

      <EditarCartaoDialog
        open={!!editarCartao}
        onOpenChange={open => { if (!open) setEditarCartao(null); }}
        referencia={editarCartao}
        onSuccess={() => { setEditarCartao(null); loadBoard(); }}
        clientes={clientes}
      />

      <ConcluirFaseDialog
        open={concluirFaseOpen}
        onOpenChange={open => { if (!open) { setConcluirFaseOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        proximaEtapa={proximaFase}
        fornecedores={fornecedores}
        onSuccess={() => { setConcluirFaseOpen(false); loadBoard(); }}
      />

      <IniciarProximaFaseDialog
        open={iniciarProximaOpen}
        onOpenChange={open => { if (!open) { setIniciarProximaOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        proximaEtapa={proximaFase}
        fornecedores={fornecedores}
        onSuccess={() => { setIniciarProximaOpen(false); loadBoard(); }}
        onMoverEspera={() => { setIniciarProximaOpen(false); loadBoard(); }}
      />

      <IniciarTecidoDialog
        open={iniciarTecidoOpen}
        onOpenChange={open => { if (!open) { setIniciarTecidoOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        fornecedores={fornecedores}
        onSuccess={() => { setIniciarTecidoOpen(false); loadBoard(); }}
      />

      <ConcluirTecidoDialog
        open={concluirTecidoOpen}
        onOpenChange={open => { if (!open) { setConcluirTecidoOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        etapaDestino={etapaDestinoTecido}
        onSuccess={() => { setConcluirTecidoOpen(false); loadBoard(); }}
      />

      <IniciarExpedicaoDialog
        open={iniciarExpedicaoOpen}
        onOpenChange={open => { if (!open) { setIniciarExpedicaoOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        onSuccess={() => { setIniciarExpedicaoOpen(false); loadBoard(); }}
      />

      <ExpedicaoDialog
        open={expedicaoOpen}
        onOpenChange={open => { if (!open) { setExpedicaoOpen(false); loadBoard(); } }}
        cartao={cartaoEmFoco}
        onSuccess={() => { setExpedicaoOpen(false); loadBoard(); }}
      />

      {/* ─── Mover Cartão para Outra Fase ─── */}
      <Dialog open={!!moverTarget} onOpenChange={open => { if (!open) setMoverTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded bg-blue-600" />
              Mover Cartão para Outra Fase
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground">Cartão: <span className="font-semibold text-foreground">{moverTarget?.codigo}</span></p>
              <p className="text-sm text-muted-foreground">Fase atual: <span className="font-semibold text-foreground">{FASE_LABEL[moverTarget?.fase_atual ?? ''] ?? moverTarget?.fase_atual}</span></p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione a fase de destino:</label>
              <Select value={moverFaseDst} onValueChange={setMoverFaseDst}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Selecione uma fase --" />
                </SelectTrigger>
                <SelectContent>
                  {FASES.filter(f => f !== moverTarget?.fase_atual).map(f => (
                    <SelectItem key={f} value={f}>{FASE_LABEL[f] ?? f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoverTarget(null)}>Cancelar</Button>
            <Button disabled={!moverFaseDst} onClick={handleConfirmarMover} className="bg-blue-600 hover:bg-blue-700">
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </KanbanLayout>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
interface CardProps {
  cartao: Referencia;
  onEdit: () => void;
  onDelete: () => void;
  onMover: () => void;
  onImprimir: () => void;
  onReverter: () => void;
}

function KanbanCard({ cartao, onEdit, onDelete, onMover, onImprimir, onReverter }: CardProps) {
  const diasFase = diasDesde(cartao.updated_at);
  const diasEntrega = diasAteTermino(cartao.previsao_conclusao ?? cartao.data_prevista_entrega);
  const atrasado = diasEntrega !== null && diasEntrega < 0;
  const urgente  = diasEntrega !== null && diasEntrega >= 0 && diasEntrega < 3;

  const toImgSrc = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('/objects/')) return `${API_BASE}/storage${url}`;
    return url;
  };
  const capaUrl = toImgSrc(cartao.foto_url ?? cartao.imagens?.find(i => i.principal)?.url ?? cartao.imagens?.[0]?.url);

  // Badge de dias — cor conforme tempo (verde→amarelo→vermelho)
  const badgeCor =
    diasFase >= 15 ? 'bg-red-500 text-white' :
    diasFase >= 7  ? 'bg-amber-400 text-white' :
    'bg-green-500 text-white';

  return (
    <div
      onDoubleClick={onEdit}
      className={`bg-white rounded-xl shadow-sm border overflow-hidden group transition-all hover:shadow-md select-none ${
        atrasado ? 'border-red-300' : urgente ? 'border-amber-300' : 'border-gray-200'
      }`}
    >
          {/* ─── Foto com badge de dias sobreposto ─── */}
          {capaUrl ? (
            <div className="relative h-36 overflow-hidden">
              <img src={capaUrl} alt={cartao.codigo} className="w-full h-full object-cover" />
              {/* Badge de dias no canto superior esquerdo, sobre a foto */}
              <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full shadow ${badgeCor}`}>
                {diasFase}d
              </div>
              {cartao.imagens && cartao.imagens.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />{cartao.imagens.length}
                </div>
              )}
            </div>
          ) : (
            /* Sem foto: badge de dias no topo do card */
            <div className="flex justify-start px-3 pt-2 pb-0">
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${badgeCor}`}>
                {diasFase}d
              </div>
            </div>
          )}

          {/* ─── Corpo do cartão ─── */}
          <div className="px-3 py-2 space-y-1 text-xs">
            {/* Linha: CLIENTE */}
            {cartao.nome_cliente && (
              <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline">
                <span className="text-gray-400 font-semibold tracking-wide">CLIENTE:</span>
                <span className="font-bold text-gray-800 truncate">{cartao.nome_cliente}</span>
              </div>
            )}

            {/* Linha: PEDIDO */}
            {cartao.numero_pedido && (
              <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline">
                <span className="text-gray-400 font-semibold tracking-wide">PEDIDO:</span>
                <span className="font-bold text-gray-800 truncate">{cartao.numero_pedido}</span>
              </div>
            )}

            {/* Linha: PREV. ENTREGA */}
            {(cartao.previsao_conclusao || cartao.data_prevista_entrega) && (
              <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline">
                <span className={`font-semibold tracking-wide ${atrasado ? 'text-red-500' : 'text-gray-400'}`}>
                  PREV. ENTREGA:
                </span>
                <span className={`font-bold truncate ${atrasado ? 'text-red-600' : urgente ? 'text-amber-600' : 'text-gray-800'}`}>
                  {fmtDate(cartao.previsao_conclusao ?? cartao.data_prevista_entrega)}
                  {atrasado && <span className="ml-1 text-red-500">⚠</span>}
                </span>
              </div>
            )}

            {/* ─── Separador + código OP em destaque ─── */}
            <div className="border-t border-gray-100 pt-1.5 mt-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-violet-600 font-bold text-sm truncate">{cartao.codigo}</p>
                {(cartao.cmo ?? 0) > 0 && (
                  <span className="flex-shrink-0 bg-violet-100 text-violet-700 font-black text-xs px-2 py-0.5 rounded-full border border-violet-200">
                    {fmtBRL(cartao.cmo ?? 0)}
                  </span>
                )}
              </div>
              {cartao.descricao_modelo && (
                <p className="text-gray-400 text-xs truncate">{cartao.descricao_modelo}</p>
              )}
            </div>

            {/* Linha: FORNECEDOR */}
            <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline">
              <span className="text-gray-400 font-semibold tracking-wide">FORNECEDOR:</span>
              <span className="font-bold text-gray-800 truncate">{cartao.fornecedor ?? '-'}</span>
            </div>

            {/* Linha: Cores / Grade */}
            {(cartao.cores || cartao.grade) && (
              <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline">
                <span className="text-gray-400 font-semibold tracking-wide">GRADE:</span>
                <span className="font-bold text-gray-800 truncate">
                  {[cartao.cores, cartao.grade].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            {/* Linha: QTD — alinhada à direita */}
            <div className="grid grid-cols-[100px_1fr] gap-1 items-baseline pt-0.5">
              <span className="text-gray-400 font-semibold tracking-wide">QTD:</span>
              <span className="font-bold text-gray-900 text-right pr-1">
                {cartao.quantidade ?? cartao.quantidade_total ?? 0}
              </span>
            </div>
          </div>

          {/* ─── Botões de ação sempre visíveis ─── */}
          <div className="flex gap-1.5 justify-end px-3 pb-2.5 pt-1 border-t border-gray-100">
            {/* → Mover para fase */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onMover(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
              title="Mover para outra fase"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
            {/* 🖨 Imprimir cartão */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onImprimir(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
              title="Imprimir Cartão de Produção"
            >
              <Printer className="w-3 h-3" />
            </button>
            {/* ✎ Editar */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
              title="Editar cartão"
            >
              <Edit className="w-3 h-3" />
            </button>
            {/* ↺ Reverter */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onReverter(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors"
              title="Reverter para fase anterior"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            {/* 🗑 Excluir cartão */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
              title="Excluir cartão (libera edição no pedido)"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
    </div>
  );
}
