import https from "https";

const VHSYS_HOST = "api.vhsys.com";

export interface VhsysCredentials {
  accessToken: string;
  secretAccessToken: string;
}

function vhsysRequest(
  method: string,
  path: string,
  body?: object,
  credentials?: VhsysCredentials,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options: https.RequestOptions = {
      hostname: VHSYS_HOST,
      path: `/v2${path}`,
      method,
      headers: {
        "access-token": credentials?.accessToken ?? process.env.VHSYS_ACCESS_TOKEN ?? "",
        "secret-access-token": credentials?.secretAccessToken ?? process.env.VHSYS_SECRET_ACCESS_TOKEN ?? "",
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

function extrairEntidadeVhsys(data: any) {
  const conteudo = data?.data ?? data;
  if (Array.isArray(conteudo)) return conteudo[0] ?? null;
  if (conteudo?.data) return extrairEntidadeVhsys(conteudo);
  return conteudo && typeof conteudo === "object" ? conteudo : null;
}

export async function vhsysBuscarProduto(codigo: string, credentials?: VhsysCredentials) {
  const { status, data } = await vhsysRequest(
    "GET",
    `/produtos/?cod_produto=${encodeURIComponent(codigo)}&limit=1`,
    undefined,
    credentials,
  );
  if (status !== 200) return null;
  return extrairEntidadeVhsys(data) as VhsysProduto | null;
}

export async function vhsysCriarProduto(payload: VhsysProdutoPayload, credentials?: VhsysCredentials) {
  const { status, data } = await vhsysRequest("POST", "/produtos/", payload, credentials);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys produto [${status}]: ${JSON.stringify(data)}`);
  }
  return extrairEntidadeVhsys(data) as VhsysProduto | null;
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

export interface VhsysMovimentoEstoque {
  id_estoque?: number;
  id_produto?: number;
  tipo_estoque?: "Entrada" | "Saida";
  qtde_estoque?: string;
  identificacao?: string;
  [key: string]: any;
}

export async function vhsysConsultarEstoque(
  idProduto: number,
  credentials?: VhsysCredentials,
): Promise<VhsysMovimentoEstoque[]> {
  const { status, data } = await vhsysRequest("GET", `/produtos/${idProduto}/estoque`, undefined, credentials);
  if (status !== 200) {
    throw new Error(`VHSys consultar estoque [${status}]: ${JSON.stringify(data)}`);
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export async function vhsysLancarEstoque(
  idProduto: number,
  payload: {
    tipo_estoque: "Entrada" | "Saida";
    qtde_estoque: number;
    valor_estoque?: number;
    obs_estoque?: string;
    identificacao?: string;
  },
  credentials?: VhsysCredentials,
): Promise<VhsysMovimentoEstoque | null> {
  const { status, data } = await vhsysRequest("POST", `/produtos/${idProduto}/estoque`, payload, credentials);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys lançar estoque [${status}]: ${JSON.stringify(data)}`);
  }
  return extrairEntidadeVhsys(data) as VhsysMovimentoEstoque | null;
}

export async function vhsysBuscarClientePorCnpj(cnpj: string, credentials?: VhsysCredentials) {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  const { data } = await vhsysRequest(
    "GET",
    `/clientes/?cnpj_cliente=${encodeURIComponent(cnpjLimpo)}&limit=1`,
    undefined,
    credentials,
  );
  return (data?.data?.[0] ?? null) as VhsysCliente | null;
}

export async function vhsysBuscarClientePorId(id: number, credentials?: VhsysCredentials) {
  const { data } = await vhsysRequest("GET", `/clientes/${id}/`, undefined, credentials);
  return (data?.data ?? null) as VhsysCliente | null;
}

export async function vhsysCriarCliente(payload: VhsysClientePayload, credentials?: VhsysCredentials) {
  const { data } = await vhsysRequest("POST", "/clientes/", payload, credentials);
  return (data?.data ?? null) as VhsysCliente | null;
}

export async function vhsysAtualizarCliente(
  id_cliente: number,
  payload: Partial<VhsysClientePayload>,
  credentials?: VhsysCredentials,
) {
  const { data } = await vhsysRequest("PUT", `/clientes/${id_cliente}/`, payload, credentials);
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
  payload: VhsysPedidoPayload,
  credentials?: VhsysCredentials,
): Promise<{ id_ped?: number; id_pedido?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("POST", "/pedidos/", payload, credentials);
  if (status !== 200 && status !== 201) {
    throw new Error(`VHSys pedido [${status}]: ${JSON.stringify(data)}`);
  }
  return extrairEntidadeVhsys(data);
}

export async function vhsysBuscarPedidoVenda(
  idPedido: number,
  credentials?: VhsysCredentials,
): Promise<{ id_ped?: number; id_pedido?: number; [k: string]: any } | null> {
  const { status, data } = await vhsysRequest("GET", `/pedidos/${idPedido}/`, undefined, credentials);
  if (status !== 200) return null;
  return extrairEntidadeVhsys(data);
}

export async function vhsysListarProdutosPedido(
  idPedido: number,
  credentials?: VhsysCredentials,
): Promise<Array<{ id_produto: number; qtde_produto?: string; valor_unit_produto?: string }>> {
  const { status, data } = await vhsysRequest("GET", `/pedidos/${idPedido}/produtos/`, undefined, credentials);
  const mensagem = typeof data?.data === "string"
    ? data.data
    : JSON.stringify(data?.data ?? "");
  if (status === 403 && /nenhum produto para o pedido encontrado/i.test(mensagem)) {
    return [];
  }
  if (status !== 200) {
    throw new Error(`VHSys produtos do pedido [${status}]: ${JSON.stringify(data)}`);
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export async function vhsysCadastrarProdutosPedido(
  idPedido: number,
  produtos: VhsysPedidoItem[],
  credentials?: VhsysCredentials,
): Promise<Array<{ id_ped_produto: number; id_produto: number; [k: string]: any }>> {
  const { status, data } = await vhsysRequest(
    "POST",
    `/pedidos/${idPedido}/produtos/`,
    produtos,
    credentials,
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
