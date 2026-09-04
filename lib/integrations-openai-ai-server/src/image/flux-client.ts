import { Buffer } from "node:buffer";

/**
 * Flux image client — fal.ai provider (flux-schnell)
 *
 * Requires env var:
 *   FAL_KEY — API key from https://fal.ai/dashboard/keys
 *
 * Activate this provider by setting:
 *   IMAGE_PROVIDER=flux
 */

const FAL_BASE = "https://fal.run";

function getKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      "FAL_KEY must be set when IMAGE_PROVIDER=flux. " +
      "Add it as a secret in the Replit Secrets panel.",
    );
  }
  return key;
}

function sizeToFalFormat(size: string): string {
  if (size === "1024x1024") return "square_hd";
  if (size === "512x512")   return "square";
  return "square_hd";
}

interface FalResponse {
  images: Array<{ url: string; width: number; height: number; content_type: string }>;
}

export async function generateImageBufferFlux(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024",
  negativePrompt?: string,
): Promise<Buffer> {
  const key = getKey();

  const negativeSection = negativePrompt
    ? ` | AVOID: ${negativePrompt}`
    : "";

  const res = await fetch(`${FAL_BASE}/fal-ai/flux/schnell`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt + negativeSection,
      image_size: sizeToFalFormat(size),
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)");
    throw Object.assign(
      new Error(`Flux API error ${res.status}: ${body}`),
      { status: res.status },
    );
  }

  const data = await res.json() as FalResponse;
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("Flux: resposta sem URL de imagem");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Flux: falha ao baixar imagem gerada (HTTP ${imgRes.status})`);
  }

  return Buffer.from(await imgRes.arrayBuffer());
}
