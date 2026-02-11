import { prisma } from "@/lib/db/prisma";
import { deviceHash as calcDeviceHash } from "@/lib/server/crypto";

export type Actor = {
  roomId: string;
  deviceHash: string;
  displayName: string;
  isOwner: boolean;
};

export class HttpError extends Error {
  status: number;
  payload: any;

  constructor(status: number, payload: any) {
    super(payload?.error ?? `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

export async function requireActor(req: Request, roomId: string): Promise<Actor> {
  const deviceId = req.headers.get("x-device-id");
  const displayName = req.headers.get("x-display-name");

  if (!deviceId || !displayName) {
    throw new HttpError(401, { error: "missing device info" });
  }

  const deviceHash = calcDeviceHash(deviceId);

  // 未参加なら自動で参加扱い（displayNameは更新）
  const device = await prisma.device.upsert({
    where: { roomId_deviceHash: { roomId, deviceHash } },
    update: { displayName },
    create: { roomId, deviceHash, displayName },
    select: { deviceHash: true, displayName: true },
  });

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerDeviceHash: true },
  });

  if (!room) {
    throw new HttpError(404, { error: "room not found" });
  }

  return {
    roomId,
    deviceHash: device.deviceHash,
    displayName: device.displayName,
    isOwner: room.ownerDeviceHash === device.deviceHash,
  };
}
