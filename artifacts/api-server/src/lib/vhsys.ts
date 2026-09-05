import https from "https";

const VHSYS_HOST = "api.vhsys.com";

function vhsysRequest(
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options: https.RequestOptions = {
      hostname: VHSYS_HOST,
      path: `/v2${path}`,
      method,
      headers: {
        "access-token": process.env.VHSYS_ACCESS_TOKEN ?? "",
        "secret-access-token": process.env.VHSYS_SECRET_ACCESS_TOKEN ?? "",
        "cache-control": "no-cache",
        "Content-Type": "application/json",
        "User-Agent": "MirageHub/1.0",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function vhsysBuscarProduto(codigo: string) {
  const { data } = await vhsysRequest(
    "GET",
    `/produtos/?cod_produto=${encodeURIComponent(codigo)}&limit=1`
  );
  return (data?.data?.[0] ?? null) as VhsysProduto | null;
}

export async function vhsysCriarProduto(payload: VhsysProdutoPayload) {
  const { data } = await vhsysRequest("POST", "/produtos/", payload);
  return (data?.data ?? null) as VhsysProduto | null;
}

export async function vhsysAtualizarProduto(
  id_produto: number,
  payload: Partial<VhsysProdutoPayload>
) {
  const { data } = await vhsysRequest(
    "PUT",
    `/produtos/${id_produto}/`,
    payload
  );
  return (data?.data ?? null) as VhsysProduto | null;
}

export async function vhsysBuscarClientePorCnpj(cnpj: string) {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  const { data } = await vhsysRequest(
    "GET",
    `/clientes/?cnpj_cliente=${encodeURIComponent(cnpjLimpo)}&limit=1`
  );
  return (data?.data?.[0] ?? null) as VhsysCliente | null;
}

export async function vhsysBuscarClientePorId(id: number) {
  const { data } = await vhsysRequest("GET", `/clientes/${id}/`);
  return (data?.data ?? null) as VhsysCliente | null;
}

export async function vhsysCriarCliente(payload: VhsysClientePayload) {
  const { data } = await vhsysRequest("POST", "/clientes/", payload);
  return (data?.data ?? null) as VhsysCliente | null;
}

export async function vhsysAtualizarCliente(
  id_cliente: number,
  payload: Partial<VhsysClientePayload>
) {
  const { data } = await vhsysRequest("PUT", `/clientes/${id_cliente}/`, payload);
  return (data?.data ?? null) as VhsysCliente | null;
}

export interface VhsysCliente {
  id_cliente: number;
  razao_cliente: string;
  fantasia_cliente?: string;
  cnpj_cliente?: string;
  email_cliente?: string;
  fone_cliente?: string;
  endereco_cliente?: string;
  cidade_cliente?: string;
  uf_cliente?: string;
  cep_cliente?: string;
}

export interface VhsysClientePayload {
  tipo_pessoa?: "PF" | "PJ";
  tipo_cadastro?: string;
  razao_cliente: string;
  fantasia_cliente?: string;
  cnpj_cliente?: string;
  email_cliente?: string;
  fone_cliente?: string;
  celular_cliente?: string;
  endereco_cliente?: string;
  numero_cliente?: string;
  bairro_cliente?: string;
  cidade_cliente?: string;
  uf_cliente?: string;
  cep_cliente?: string;
}

export interface VhsysProduto {
  id_produto: number;
  cod_produto: string;
  desc_produto: string;
  estoque_produto: string;
  obs_produto: string;
}

export interface VhsysProdutoPayload {
  cod_produto?: string;
  desc_produto?: string;
  obs_produto?: string;
  unidade_produto?: string;
  valor_produto?: number;
}

// ── PEDIDO DE VENDA ────────────────────────────────────────────────────────────

export interface VhsysPedidoItem {
  id_produto: number;
  desc_produto: string;
  qtde_produto: string;
  valor_unit_produto: string;
}

export interface VhsysPedidoPayload {
  id_cliente?: number;
  nome_cliente: string;
  status_pedido: string;
  data_pedido: string;        // YYYY-MM-DD
  prazo_entrega?: string;     // quantidade de dias
  referencia_pedido?: string;
  obs_pedido?: string;
}

export async function vhsysCriarPedidoVenda(
  payload: VhsysPedidoPayload
): Promise<{ id_ped?: number; id_pedido?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("POST", "/pedidos/", payload);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys pedido [${status}]: ${JSON.stringify(data)}`);
  }
  return data?.data ?? null;
}

export async function vhsysBuscarPedidoVenda(
  idPedido: number
): Promise<{ id_ped?: number; id_pedido?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("GET", `/pedidos/${idPedido}/`);
  if (status !== 200) return null;
  return data?.data ?? null;
}

export async function vhsysListarProdutosPedido(
  idPedido: number
): Promise<Array<{ id_produto: number; qtde_produto?: string; valor_unit_produto?: string }>> {
  const { status, data } = await vhsysRequest("GET", `/pedidos/${idPedido}/produtos/`);
  if (status !== 200) {
    throw new Error(`VHSys produtos do pedido [${status}]: ${JSON.stringify(data)}`);
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export async function vhsysCadastrarProdutosPedido(
  idPedido: number,
  produtos: VhsysPedidoItem[]
): Promise<Array<{ id_ped_produto: number; id_produto: number; [k: string]: any }>> {
  const { status, data } = await vhsysRequest(
    "POST",
    `/pedidos/${idPedido}/produtos/`,
    produtos
  );
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys produtos do pedido [${status}]: ${JSON.stringify(data)}`);
  }
  return Array.isArray(data?.data) ? data.data : [];
}

// ── CONTA A RECEBER ────────────────────────────────────────────────────────────

export interface VhsysContaReceberPayload {
  descricao?: string;
  valor: string;
  data_vencimento?: string;   // DD/MM/YYYY
  nome_cliente?: string;
  observacoes?: string;
}

export async function vhsysCriarContaReceber(
  payload: VhsysContaReceberPayload
): Promise<{ id?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("POST", "/financeiro/contas-receber/", payload);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys contas-receber [${status}]: ${JSON.stringify(data)}`);
  }
  return data?.data ?? data ?? null;
}

// ── CONTA A PAGAR ──────────────────────────────────────────────────────────────

export interface VhsysContaPagarPayload {
  descricao?: string;
  valor: string;
  data_vencimento?: string;   // DD/MM/YYYY
  nome_fornecedor?: string;
  observacoes?: string;
}

export async function vhsysCriarContaPagar(
  payload: VhsysContaPagarPayload
): Promise<{ id?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("POST", "/financeiro/contas-pagar/", payload);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys contas-pagar [${status}]: ${JSON.stringify(data)}`);
  }
  return data?.data ?? data ?? null;
}
