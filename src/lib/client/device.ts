const K_DID = "menuapp_device_id";
const K_DN  = "menuapp_display_name";

export function getDeviceId() {
  return localStorage.getItem(K_DID) ?? "";
}
export function setDeviceId(v: string) {
  localStorage.setItem(K_DID, v);
}

export function getDisplayName() {
  return localStorage.getItem(K_DN) ?? "";
}
export function setDisplayName(v: string) {
  localStorage.setItem(K_DN, v);
}

export function ensureDeviceId() {
  const cur = getDeviceId().trim();
  if (cur) return cur;
  const gen = `dev-${crypto.randomUUID().slice(0, 12)}`;
  setDeviceId(gen);
  return gen;
}
