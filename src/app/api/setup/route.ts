import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sha256Hex } from "@/lib/server/crypto"; // 既にある想定

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    deviceId: string;
    displayName: string;
    roomName: string;
  };

  const deviceId = body?.deviceId?.trim();
  const displayName = body?.displayName?.trim();
  const roomName = body?.roomName?.trim();

  if (!deviceId || !displayName || !roomName) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const fixedToken = (process.env.FIXED_INVITE_TOKEN ?? "").trim();
  if (!fixedToken) {
    return NextResponse.json(
      { error: "FIXED_INVITE_TOKEN is not set" },
      { status: 500 }
    );
  }

  const ownerDeviceHash = sha256Hex(deviceId);
  const inviteTokenHash = sha256Hex(fixedToken);

  const room = await prisma.room.create({
    data: {
      name: roomName,
      ownerDeviceHash,
      inviteTokenHash,
    },
    select: { id: true },
  });

  // owner device 作成/更新（既存の実装に合わせてOK）
  await prisma.device.upsert({
    where: { roomId_deviceHash: { roomId: room.id, deviceHash: ownerDeviceHash } },
    update: { displayName },
    create: { roomId: room.id, deviceHash: ownerDeviceHash, displayName },
  });

  // 固定なので inviteToken も固定を返す
  return NextResponse.json({
    roomId: room.id,
    inviteToken: fixedToken,
  });
}
