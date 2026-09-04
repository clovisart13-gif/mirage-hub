import { generateImageBuffer as _generateOpenAI, editImages } from "./client";
import { generateImageBufferFlux } from "./flux-client";
import type { Buffer } from "node:buffer";

export { openai } from "./client";
export { editImages };

/**
 * Unified image generation — provider selected by IMAGE_PROVIDER env var.
 *
 * IMAGE_PROVIDER=openai  (default) → gpt-image-1 via Replit AI Integrations
 * IMAGE_PROVIDER=flux              → Flux Schnell via fal.ai (requires FAL_KEY)
 *
 * Both providers return a raw PNG/image Buffer with the same interface,
 * so the rest of the pipeline (branding overlay, QA gate, storage) is unchanged.
 *
 * @param negativePrompt  Optional guidance for what to avoid (embedded in prompt for Flux)
 */
export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024",
  negativePrompt?: string,
): Promise<Buffer> {
  const provider = (process.env.IMAGE_PROVIDER ?? "openai").toLowerCase().trim();

  if (provider === "flux") {
    return generateImageBufferFlux(prompt, size, negativePrompt);
  }

  return _generateOpenAI(prompt, size);
}
