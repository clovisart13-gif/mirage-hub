import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { createR2pbFormCardEventsTableIfNeeded } from "../../migrate";

// Associação persistente entre webhooks da R2PB. Não cria cards ou envia mensagens.
const PANEL_ID = "6d046deb-0c01-41db-8f19-046adab15b85";
const WTS_CRM = "https://api.wts.chat/crm";
const WINDOW_MS = 3 * 60_000;
let schemaReady: Promise<void> | undefined;
let cleanupStarted = false;

export function ensureFormCardStoreReady(): Promise<void> {
  if (!schemaReady) {
    schemaReady = createR2pbFormCardEventsTableIfNeeded().catch(error => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

export function startFormCardCleanup(log: Log): void {
  if (cleanupStarted) return;
  cleanupStarted = true;
  const clean = () => pool.query(
    "DELETE FROM r2pb_form_card_events WHERE tenant_id = 'r2pb' AND created_at < NOW() - INTERVAL '7 days'"
  ).catch(error => log.error({ error: String(error) }, "[FormCard] falha na limpeza de registros antigos"));
  void clean();
  setInterval(clean, 24 * 60 * 60_000).unref();
}

type Log = {
  info: (data: object, message: string) => void;
  warn: (data: object, message: string) => void;
  error: (data: object, message: string) => void;
};
type Card = {
  id: string;
  panelId: string;
  title: string | null;
  description: string | null;
  createdAt: string;
  contactIds?: string[];
  contacts?: Array<{ id?: string; name?: string; email?: string | null; phonenumber?: string; phonenumberFormatted?: string }>;
  customFields?: Record<string, unknown> | null;
};
type Field = { name: string; key: string; type: string; entityType: string };
type Pair = { messageId: string; cardRowId: string; text: string; data: Record<string, string>; card: Card };

export function normalizeFormPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function isR2pbFormMessage(text: string): boolean {
  return /vim pelo (plano pro|site da r2pb)/i.test(text)
    && /(?:^|\n)segmento\s*:/i.test(text)
    && /(?:^|\n)volume\s*:/i.test(text)
    && /(?:^|\n)investimento\s*:/i.test(text);
}

function extract(text: string): Record<string, string> {
  const line = (label: string) =>
    text.match(new RegExp(`(?:^|\\n)${label}\\s*:\\s*([^\\n\\r]+)`, "i"))?.[1]?.trim() ?? "";
  return {
    "Origem": /vim pelo plano pro/i.test(text) ? "LP PRO" : "SITE",
    "Segmento": line("Segmento"),
    "Volume": line("Volume"),
    "Investimento": line("Investimento"),
    "Estágio da marca": line("Est[aá]gio da marca"),
    "E-mail": line("E-?mail"),
    "UTM / Campanha": line("UTM\\s*\\/\\s*Campanha"),
    "Nome": text.match(/meu nome [eé]\s+(.+?)\s+e vim pelo (?:plano pro|site da r2pb)/i)?.[1]?.trim()
      ?? line("Nome"),
  };
}

export async function saveFormMessage(
  tenant: string, phoneRaw: string, text: string, timestamp: string | undefined,
  eventId: string | undefined, log: Log,
): Promise<void> {
  if (tenant !== "r2pb" || !isR2pbFormMessage(text)) return;
  await ensureFormCardStoreReady();
  const phone = normalizeFormPhone(phoneRaw);
  const at = timestamp && Number.isFinite(Date.parse(timestamp)) ? new Date(timestamp) : new Date();
  // Sem ID/horário do provedor, retries próximos compartilham a mesma chave.
  const keyTime = timestamp && Number.isFinite(Date.parse(timestamp))
    ? at.toISOString() : String(Math.floor(at.getTime() / WINDOW_MS));
  const eventKey = eventId || createHash("sha256").update(`${phone}:${keyTime}:${text}`).digest("hex");
  await pool.query(
    `INSERT INTO r2pb_form_card_events
       (tenant_id, phone, event_kind, event_key, occurred_at, original_text, parsed_data)
     VALUES ($1, $2, 'MESSAGE', $3, $4, $5, $6::jsonb)
     ON CONFLICT DO NOTHING`,
    [tenant, phone, eventKey, at, text, JSON.stringify(extract(text))],
  );
  await reconcile(tenant, phone, log);
}

export async function saveFormCard(tenant: string, event: Card, log: Log): Promise<void> {
  if (tenant !== "r2pb" || event.panelId !== PANEL_ID
    || !event.title?.toLowerCase().includes("#vimdoformulario")
    || !/^[0-9a-f-]{36}$/i.test(event.id)) return;
  const contact = event.contacts?.find(c => c.id && c.phonenumber);
  if (!contact?.phonenumber) {
    log.warn({ cardId: event.id }, "[FormCard] card sem telefone — não associado");
    return;
  }
  await ensureFormCardStoreReady();
  const phone = normalizeFormPhone(contact.phonenumber);
  const at = Number.isFinite(Date.parse(event.createdAt)) ? new Date(event.createdAt) : new Date();
  await pool.query(
    `INSERT INTO r2pb_form_card_events
       (tenant_id, phone, event_kind, event_key, occurred_at, card_id, card_payload)
     VALUES ($1, $2, 'CARD', $3, $4, $3, $5::jsonb)
     ON CONFLICT DO NOTHING`,
    [tenant, phone, event.id, at, JSON.stringify(event)],
  );
  await reconcile(tenant, phone, log);
}

async function claimPair(tenant: string, phone: string): Promise<Pair | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Todas as instâncias disputam o mesmo lock do telefone no Neon.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [`${tenant}:${phone}`]);
    const result = await client.query<{
      message_id: string; card_row_id: string;
      original_text: string; parsed_data: Record<string, string>; card_payload: Card;
    }>(`
      SELECT m.id AS message_id, c.id AS card_row_id,
             m.original_text, m.parsed_data, c.card_payload
      FROM r2pb_form_card_events m
      JOIN r2pb_form_card_events c
        ON c.tenant_id = m.tenant_id AND c.phone = m.phone AND c.event_kind = 'CARD'
      WHERE m.tenant_id = $1 AND m.phone = $2 AND m.event_kind = 'MESSAGE'
        AND m.occurred_at BETWEEN NOW() - INTERVAL '3 minutes' AND NOW() + INTERVAL '1 minute'
        AND c.occurred_at BETWEEN NOW() - INTERVAL '3 minutes' AND NOW() + INTERVAL '1 minute'
        AND ABS(EXTRACT(EPOCH FROM (m.occurred_at - c.occurred_at))) <= $3
        AND (m.status = 'pending' OR (m.status = 'processing' AND m.lease_until < NOW()))
        AND (c.status = 'pending' OR (c.status = 'processing' AND c.lease_until < NOW()))
        AND (m.match_id IS NULL OR m.match_id = c.id)
        AND (c.match_id IS NULL OR c.match_id = m.id)
      ORDER BY (CASE WHEN m.match_id = c.id THEN 0 ELSE 1 END),
               ABS(EXTRACT(EPOCH FROM (m.occurred_at - c.occurred_at))), m.occurred_at DESC
      LIMIT 1
    `, [tenant, phone, WINDOW_MS / 1000]);
    const row = result.rows[0];
    if (row) {
      await client.query(
        `UPDATE r2pb_form_card_events
         SET match_id = CASE WHEN id = $1 THEN $2::bigint ELSE $1::bigint END,
             status = 'processing', lease_until = NOW() + INTERVAL '2 minutes'
         WHERE id IN ($1, $2)`,
        [row.message_id, row.card_row_id],
      );
    }
    await client.query("COMMIT");
    return row ? {
      messageId: row.message_id, cardRowId: row.card_row_id, text: row.original_text,
      data: row.parsed_data, card: row.card_payload,
    } : null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function reconcile(tenant: string, phone: string, log: Log): Promise<void> {
  const pair = await claimPair(tenant, phone);
  if (!pair) {
    log.info({ tenant, phone }, "[FormCard] par mensagem/card ainda não encontrado na janela");
    return;
  }
  let success = false;
  try {
    success = await enrichFormCard(tenant, pair.card, pair.text, pair.data, log);
  } finally {
    // Uma única instrução conclui/libera ambas as pontas; um retry pode retomar após expirar a lease.
    await pool.query(
      `UPDATE r2pb_form_card_events SET status = $3, lease_until = NULL,
         used_at = CASE WHEN $3 = 'used' THEN NOW() ELSE used_at END
       WHERE id IN ($1, $2) AND status = 'processing'
         AND match_id IN ($1, $2)`,
      [pair.messageId, pair.cardRowId, success ? "used" : "pending"],
    );
  }
}

async function wtsGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${WTS_CRM}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`WTS GET ${path.split("?")[0]}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function enrichFormCard(
  tenant: string, event: Card, text: string, parsed: Record<string, string>,
  log: Log, token = process.env.HELENA_API_TOKEN,
): Promise<boolean> {
  if (tenant !== "r2pb" || event.panelId !== PANEL_ID || !/^[0-9a-f-]{36}$/i.test(event.id)) return false;
  const contact = event.contacts?.find(c => c.id && c.phonenumber);
  if (!contact?.phonenumber) {
    log.warn({ cardId: event.id }, "[FormCard] card sem telefone — não enriquecido");
    return false;
  }
  const phone = normalizeFormPhone(contact.phonenumber);
  try {
    if (!token) throw new Error("HELENA_API_TOKEN ausente");
    const card = await wtsGet<Card>(`/v2/panel/card/${event.id}?IncludeDetails=Contacts&IncludeDetails=CustomFields`, token);
    if (card.panelId !== PANEL_ID || !card.contactIds?.includes(contact.id ?? "")) {
      log.warn({ cardId: event.id }, "[FormCard] card alterado ou contato divergente — sem sobrescrever");
      return false;
    }
    // O PUT pode ter ocorrido antes de uma queda: completar apenas campos ausentes.
    const originalTitle = card.title?.toLowerCase().includes("#vimdoformulario");
    if (!originalTitle && !card.description?.includes(text)) {
      log.warn({ cardId: event.id }, "[FormCard] título editado por outro ator — sem sobrescrever");
      return false;
    }
    const values = parsed;
    if (!values["E-mail"] && contact.email?.trim()) values["E-mail"] = contact.email.trim();
    const name = values["Nome"] || contact.name?.trim() || "";
    const displayPhone = contact.phonenumberFormatted?.trim() || phone;
    const title = originalTitle && name ? `${name} - ${displayPhone}` : card.title;
    const detail = [
      `Origem: ${values["Origem"]}`,
      `Nome: ${name || "Não informado"}`,
      `Telefone: ${displayPhone}`,
      ...["Segmento", "Volume", "Investimento", "Estágio da marca", "E-mail", "UTM / Campanha"]
        .filter(label => values[label]).map(label => `${label}: ${values[label]}`),
      `Mensagem original:\n${text}`,
    ].join("\n");
    const description = card.description?.includes(text)
      ? card.description
      : [card.description?.trim(), detail].filter(Boolean).join("\n\n").slice(0, 8000);

    const fields = await wtsGet<Field[]>(`/v1/panel/${PANEL_ID}/custom-fields`, token);
    const customFields: Record<string, string> = {};
    for (const label of ["Origem", "Segmento", "Volume", "Investimento", "Estágio da marca", "E-mail", "UTM / Campanha"]) {
      const value = values[label];
      if (!value) continue;
      const field = fields.find(f => f.name?.trim().toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR")
        && f.entityType === "PANEL" && f.type === "STRING" && f.key);
      if (!field) {
        log.warn({ cardId: card.id, label }, "[FormCard] campo personalizado ausente ou incompatível");
        continue;
      }
      // Nunca substitui um valor previamente preenchido, inclusive em retries.
      if (card.customFields?.[field.key] != null && card.customFields[field.key] !== "") continue;
      customFields[field.key] = value;
    }
    const update: Record<string, unknown> = {};
    const changed: string[] = [];
    if (title && title !== card.title) { update.title = title; changed.push("Title"); }
    if (description !== card.description) { update.description = description; changed.push("Description"); }
    if (Object.keys(customFields).length) {
      // Preserva valores anteriores mesmo se o WTS tratar CustomFields como substituição integral.
      update.customFields = {
        ...Object.fromEntries(Object.entries(card.customFields ?? {}).filter(([, value]) => value != null && value !== "")),
        ...customFields,
      };
      changed.push("CustomFields");
    }
    if (!changed.length) return true;
    update.fields = changed;
    const res = await fetch(`${WTS_CRM}/v3/panel/card/${card.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(update),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`WTS PUT /v3/panel/card/{id}: HTTP ${res.status}`);
    const reread = await wtsGet<Card>(`/v2/panel/card/${card.id}?IncludeDetails=Contacts&IncludeDetails=CustomFields`, token);
    const ignored = Object.entries(customFields)
      .filter(([fieldKey, value]) => reread.customFields?.[fieldKey] !== value)
      .map(([fieldKey]) => fieldKey);
    if (reread.title !== title) ignored.push("Title");
    if (reread.description !== description) ignored.push("Description");
    log[ignored.length ? "warn" : "info"]({ cardId: card.id, ignored, updated: changed },
      ignored.length ? "[FormCard] atualização parcial; campos ignorados pelo WTS" : "[FormCard] card enriquecido e relido");
    return ignored.length === 0;
  } catch (error) {
    log.error({ cardId: event.id, error: error instanceof Error ? error.message : String(error) }, "[FormCard] falha ao enriquecer card");
    return false;
  }
}