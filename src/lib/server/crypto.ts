import crypto from "crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function makeInviteToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function deviceHash(deviceId: string): string {
  const salt = process.env.DEVICE_SALT ?? "dev_salt_change_me";
  return sha256Hex(`${deviceId}:${salt}`);
}
