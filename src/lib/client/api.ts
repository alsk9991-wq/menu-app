import { getDeviceId, getDisplayName, setDeviceId } from "./device";

type ApiOptions = {
  method?: string;
  json?: any;
};

function ensureDeviceId() {
  let id = getDeviceId()?.trim();
  if (!id) {
    // 端末ごとに一意
    id = `dev-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    setDeviceId(id);
  }
  return id;
}

export async function api<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const deviceId = ensureDeviceId(); // ★必ず入る
  const displayName = getDisplayName()?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-device-id": deviceId,
  };

  // ★日本語対応：ヘッダーにはASCIIしか載せない（%エンコード）
  if (displayName) headers["x-display-name"] = encodeURIComponent(displayName);

  console.log("[api]", url, headers);

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.json ? JSON.stringify(opts.json) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}
