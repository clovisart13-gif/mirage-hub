const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${basePath}${path}`, {
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message || "Não foi possível concluir a operação.",
      payload?.error?.code,
    );
  }
  return payload as T;
}

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "curator" | "viewer";
};

export type MeResponse = {
  authenticated: boolean;
  user?: { id: string; name: string; email: string };
  workspaces?: Workspace[];
  currentWorkspace?: Workspace | null;
};

export type Brand = {
  id: string;
  workspace_id: string;
  display_name: string;
  instagram_handle: string | null;
  instagram_url: string | null;
  website_url: string | null;
  city: string | null;
  state: string;
  market_segment: string | null;
  identity_status: string;
  lifecycle_status: string;
  discovery_summary: string | null;
  total_score: number | null;
  score_band: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandDetail = Brand & {
  evidence: Array<{
    id: string;
    source_type: string;
    source_url: string | null;
    claim: string;
    excerpt: string | null;
    confidence: string;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    author_name: string;
    note_type: string;
    body: string;
    decision_after_note: string | null;
    created_at: string;
  }>;
  assessments: Array<{
    id: string;
    total_score: number;
    dimension_scores: string;
    rationale: string;
    rubric_version: string;
    author_name: string;
    created_at: string;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    actor_name: string | null;
    created_at: string;
  }>;
};

export type DashboardSummary = {
  totalBrands: number;
  needingReview: number;
  scoredBrands: number;
  evidenceCount: number;
};