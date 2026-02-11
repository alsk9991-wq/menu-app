const KEY_ID = "menuapp_device_id";
const KEY_NAME = "menuapp_display_name";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_ID) ?? "";
}
export function setDeviceId(v: string) {
  localStorage.setItem(KEY_ID, v);
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_NAME) ?? "";
}
export function setDisplayName(v: string) {
  localStorage.setItem(KEY_NAME, v);
}
