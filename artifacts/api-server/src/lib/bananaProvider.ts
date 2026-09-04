import { randomUUID } from "crypto";
import { generateImage } from "@workspace/integrations-gemini-ai/image";
import { objectStorageClient } from "./objectStorage";
import { logger } from "./logger";

export class BananaConfigError extends Error {
  constructor() {
    super("Integração Gemini (Banana) não configurada — AI_INTEGRATIONS_GEMINI_BASE_URL/API_KEY ausentes");
    this.name = "BananaConfigError";
  }
}

export class BananaApiError extends Error {
  cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "BananaApiError";
    this.cause = cause;
  }
}

function isConfigured(): boolean {
  return Boolean(process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"]) && Boolean(process.env["AI_INTEGRATIONS_GEMINI_API_KEY"]);
}

export function getBananaAvailability(): boolean {
  return isConfigured();
}

function resolveBucketAndDir(): { bucketName: string; dirInBucket: string } {
  const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
  const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
  const slashIdx = clean.indexOf("/");
  const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
  const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
  return { bucketName, dirInBucket };
}

export interface BananaImageRequest {
  prompt: string;
  tenantId: string;
  campaignId?: string | null;
}

export interface BananaImageResult {
  outputUrl: string;
  storagePath: string;
  mimeType: string;
  requestPayload: unknown;
  responsePayload: unknown;
}

export async function generateBananaImage(input: BananaImageRequest): Promise<BananaImageResult> {
  if (!isConfigured()) {
    throw new BananaConfigError();
  }

  let b64_json: string;
  let mimeType: string;
  try {
    const result = await generateImage(input.prompt);
    b64_json = result.b64_json;
    mimeType = result.mimeType;
  } catch (err: any) {
    logger.error({ err: err.message, tenantId: input.tenantId }, "bananaProvider: falha ao gerar imagem via Gemini");
    throw new BananaApiError(`Falha ao gerar imagem via Gemini (Banana): ${err.message}`, err);
  }

  const imageBuffer = Buffer.from(b64_json, "base64");
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  const uid = randomUUID();
  const assetPath = `growth-assets/${input.tenantId}/${input.campaignId ?? "no-campaign"}/${uid}.${extension}`;

  const { bucketName, dirInBucket } = resolveBucketAndDir();
  const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

  const bucket = objectStorageClient.bucket(bucketName);
  await bucket.file(objectName).save(imageBuffer, { contentType: mimeType, resumable: false });

  const storagePath = `/objects/${assetPath}`;

  return {
    outputUrl: storagePath,
    storagePath,
    mimeType,
    requestPayload: { prompt: input.prompt, model: "gemini-2.5-flash-image" },
    responsePayload: { mimeType, storagePath },
  };
}
