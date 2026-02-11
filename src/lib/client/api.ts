import { getDeviceId, getDisplayName } from "./device";

type ApiOptions = {
  method?: string;
  json?: any;
};

export async function api<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const deviceId = getDeviceId();
  const displayName = getDisplayName();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (deviceId) headers["x-device-id"] = deviceId;
  if (displayName) headers["x-display-name"] = displayName;

  console.log("[api]", url, headers); // ★デバッグ用（必須）

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
