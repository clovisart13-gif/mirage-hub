/**
 * openaiImageProvider.ts — OpenAI gpt-image-1 via AI Integrations proxy
 *
 * Vantagens sobre Gemini/Banana para o caso R2PB:
 * - Segue "sem texto na imagem" de forma muito mais confiável
 * - Fotorealismo superior para cenas de chão de fábrica e editorial
 * - Suporta instrução de estilo precisa sem hallucinar marcas/tipografia
 *
 * Ponto de entrada: generateOpenAIImage() — mesma interface que generateBananaImage()
 */

import { randomUUID }          from "crypto";
import { objectStorageClient } from "./objectStorage";
import { logger }               from "./logger";

export class OpenAIImageConfigError extends Error {
  constructor() {
    super("OpenAI Image não configurado — AI_INTEGRATIONS_OPENAI_BASE_URL/API_KEY ausentes");
    this.name = "OpenAIImageConfigError";
  }
}

export class OpenAIImageApiError extends Error {
  cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "OpenAIImageApiError";
    this.cause = cause;
  }
}

function isConfigured(): boolean {
  return (
    Boolean(process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]) &&
    Boolean(process.env["AI_INTEGRATIONS_OPENAI_API_KEY"])
  );
}

export function getOpenAIImageAvailability(): boolean {
  return isConfigured();
}

function resolveBucketAndDir(): { bucketName: string; dirInBucket: string } {
  const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
  const clean      = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
  const slashIdx   = clean.indexOf("/");
  const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
  const dirInBucket= slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
  return { bucketName, dirInBucket };
}

export interface OpenAIImageRequest {
  prompt: string;
  tenantId: string;
  campaignId?: string | null;
  /** "1024x1024" (default/square), "1024x1536" (portrait 4:5), "1536x1024" (landscape) */
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  /** gpt-image-2: "low" | "medium" (default) | "high" | "auto" */
  quality?: "low" | "medium" | "high" | "auto";
}

export interface OpenAIImageResult {
  outputUrl: string;
  storagePath: string;
  mimeType: string;
  requestPayload: unknown;
  responsePayload: unknown;
}

export async function generateOpenAIImage(input: OpenAIImageRequest): Promise<OpenAIImageResult> {
  if (!isConfigured()) {
    throw new OpenAIImageConfigError();
  }

  const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]!.replace(/\/$/, "");
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]!;
  const size    = input.size    ?? "1024x1024";
  const quality = input.quality ?? "medium";

  // gpt-image-2 — geração de imagem de alta qualidade da OpenAI
  // gpt-image-2 não aceita response_format — retorna b64_json por padrão
  const requestPayload = {
    model:   "gpt-image-2",
    prompt:  input.prompt,
    n:       1,
    size,
    quality,
  };

  logger.info(
    { tenantId: input.tenantId, campaignId: input.campaignId, size, quality },
    "openaiImageProvider: chamando gpt-image-1",
  );

  let b64_json: string;
  try {
    const res = await fetch(`${baseUrl}/images/generations`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const json = await res.json() as { data?: { b64_json?: string }[] };
    const b64  = json?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(`Resposta inesperada da API: ${JSON.stringify(json).slice(0, 300)}`);
    }
    b64_json = b64;
  } catch (err: any) {
    logger.error({ err: err.message, tenantId: input.tenantId }, "openaiImageProvider: falha");
    throw new OpenAIImageApiError(`Falha ao gerar imagem via gpt-image-1: ${err.message}`, err);
  }

  // Upload to object storage
  const imageBuffer = Buffer.from(b64_json, "base64");
  const uid         = randomUUID();
  const assetPath   = `growth-assets/${input.tenantId}/${input.campaignId ?? "no-campaign"}/oai-${uid}.png`;

  const { bucketName, dirInBucket } = resolveBucketAndDir();
  const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

  await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .save(imageBuffer, { contentType: "image/png", resumable: false });

  const storagePath = `/objects/${assetPath}`;
  logger.info({ tenantId: input.tenantId, storagePath }, "openaiImageProvider: imagem salva");

  return {
    outputUrl: storagePath,
    storagePath,
    mimeType: "image/png",
    requestPayload,
    responsePayload: { model: "gpt-image-2", size, quality, storagePath },
  };
}

/**
 * Aspect ratio string (from the UI/GPT brief) to OpenAI size string.
 */
export function aspectRatioToOpenAISize(
  ratio: string,
): "1024x1024" | "1024x1536" | "1536x1024" {
  if (ratio === "4:5" || ratio === "9:16") return "1024x1536";
  if (ratio === "16:9")                    return "1536x1024";
  return "1024x1024"; // 1:1 default
}
