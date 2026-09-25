export function buildSignupUrl(
  source: string,
  extraParams: Record<string, string> = {},
): string {
  const params = new URLSearchParams(window.location.search);
  params.set("source", source);

  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, value);
  }

  return `/criar-conta?${params.toString()}`;
}