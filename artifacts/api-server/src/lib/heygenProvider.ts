import { logger } from "./logger";

const HEYGEN_API_BASE = "https://api.heygen.com";

export class HeygenConfigError extends Error {
  constructor() {
    super("HEYGEN_API_KEY não configurada no ambiente");
    this.name = "HeygenConfigError";
  }
}

export class HeygenApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "HeygenApiError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env["HEYGEN_API_KEY"];
  if (!key) throw new HeygenConfigError();
  return key;
}

export interface HeygenVideoRequest {
  title?: string | null;
  script: string;
  avatarId?: string | null;
  avatarType?: "avatar" | "talking_photo" | null;
  voiceId?: string | null;
  aspectRatio?: string | null;
}

const DEFAULT_AVATAR_ID = process.env["HEYGEN_DEFAULT_AVATAR_ID"] ?? "";
const DEFAULT_VOICE_ID = process.env["HEYGEN_DEFAULT_VOICE_ID"] ?? "";
const DEFAULT_AVATAR_TYPE = process.env["HEYGEN_DEFAULT_AVATAR_TYPE"] === "talking_photo" ? "talking_photo" : "avatar";

function dimensionsForAspectRatio(aspectRatio?: string | null): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1280, height: 720 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "9:16":
    default:
      return { width: 720, height: 1280 };
  }
}

export async function createHeygenVideoJob(
  input: HeygenVideoRequest
): Promise<{ externalJobId: string; requestPayload: unknown; responsePayload: unknown }> {
  const apiKey = getApiKey();

  const avatarId = input.avatarId?.trim() || DEFAULT_AVATAR_ID;
  const voiceId = input.voiceId?.trim() || DEFAULT_VOICE_ID;
  const avatarType = input.avatarType ?? DEFAULT_AVATAR_TYPE;

  if (!avatarId || !voiceId) {
    throw new Error(
      "avatar_id/voice_id ausentes e nenhum padrão configurado (HEYGEN_DEFAULT_AVATAR_ID / HEYGEN_DEFAULT_VOICE_ID)"
    );
  }

  const dimension = dimensionsForAspectRatio(input.aspectRatio);

  const character =
    avatarType === "talking_photo"
      ? { type: "talking_photo", talking_photo_id: avatarId }
      : { type: "avatar", avatar_id: avatarId, avatar_style: "normal" };

  const requestPayload = {
    video_inputs: [
      {
        character,
        voice: {
          type: "text",
          input_text: input.script,
          voice_id: voiceId,
        },
      },
    ],
    dimension,
    title: input.title ?? undefined,
  };

  let response: Response;
  try {
    response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "heygenProvider: falha de rede ao criar job");
    throw new Error(`Falha de rede ao chamar HeyGen: ${err.message}`);
  }

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    logger.error({ status: response.status, responsePayload }, "heygenProvider: erro da API ao criar job");
    throw new HeygenApiError(
      `HeyGen retornou erro ao criar job (status ${response.status})`,
      response.status,
      responsePayload
    );
  }

  const externalJobId = (responsePayload as any)?.data?.video_id;
  if (!externalJobId) {
    logger.error({ responsePayload }, "heygenProvider: resposta sem video_id");
    throw new Error("Resposta inválida do HeyGen: video_id ausente");
  }

  return { externalJobId, requestPayload, responsePayload };
}

export interface HeygenJobStatus {
  status: "queued" | "running" | "success" | "failed";
  outputUrl?: string | null;
  errorMessage?: string | null;
  rawResponse: unknown;
}

export function normalizeHeygenResponse(responsePayload: any): HeygenJobStatus {
  const data = responsePayload?.data ?? {};
  const rawStatus: string = data.status ?? "unknown";

  let status: HeygenJobStatus["status"];
  switch (rawStatus) {
    case "completed":
      status = "success";
      break;
    case "failed":
      status = "failed";
      break;
    case "processing":
    case "pending":
    case "waiting":
      status = rawStatus === "pending" || rawStatus === "waiting" ? "queued" : "running";
      break;
    default:
      status = "running";
  }

  return {
    status,
    outputUrl: data.video_url ?? null,
    errorMessage: status === "failed" ? data.error?.message ?? "Falha reportada pelo HeyGen" : null,
    rawResponse: responsePayload,
  };
}

export async function getHeygenVideoJob(jobId: string): Promise<HeygenJobStatus> {
  const apiKey = getApiKey();

  let response: Response;
  try {
    response = await fetch(`${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, jobId }, "heygenProvider: falha de rede ao consultar job");
    throw new Error(`Falha de rede ao consultar HeyGen: ${err.message}`);
  }

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    logger.error({ status: response.status, jobId, responsePayload }, "heygenProvider: erro da API ao consultar job");
    throw new HeygenApiError(
      `HeyGen retornou erro ao consultar job (status ${response.status})`,
      response.status,
      responsePayload
    );
  }

  return normalizeHeygenResponse(responsePayload);
}
