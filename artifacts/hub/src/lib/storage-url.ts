export function storageUrl(value?: string | null): string {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  let path = value.trim();
  path = path.replace(/^\/api\/storage\/objects\/objects\//, '/objects/');
  path = path.replace(/^\/api\/storage\/objects\//, '/objects/');
  path = path.replace(/^\/storage\/objects\//, '/objects/');

  if (path.startsWith('/objects/')) return `/api/storage${path}`;
  return path;
}