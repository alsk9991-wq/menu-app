import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { deviceHash } from "@/lib/server/crypto";

export async function requireActor(req: Request, roomId: string) {
  const deviceId = req.headers.get("x-device-id")?.trim();
  const displayNameRaw = req.headers.get("x-display-name") ?? "";
  const displayName = displayNameRaw ? decodeURIComponent(displayNameRaw) : undefined;

  if (!deviceId) {
    return NextResponse.json({ error: "missing device info" }, { status: 401 });
  }

  const dHash = deviceHash(deviceId);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  // device が無ければ作る。displayName があれば更新/作成に反映
  await prisma.device.upsert({
    where: { roomId_deviceHash: { roomId, deviceHash: dHash } },
    update: displayName ? { displayName } : {},
    create: { roomId, deviceHash: dHash, displayName: displayName ?? "guest" },
  });

  return {
    roomId,
    deviceHash: dHash,
    displayName: displayName ?? "guest",
    isOwner: room.ownerDeviceHash === dHash,
  };
}
