import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { deviceHash } from "@/lib/server/crypto";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as null | {
    deviceId?: string;
    displayName?: string;
  };

  const displayName = body?.displayName?.trim();
  const deviceId = body?.deviceId?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "displayName required" }, { status: 400 });
  }

  // deviceId が空ならサーバー側で仮ID生成（最低限）
  const effectiveDeviceId = deviceId && deviceId.length > 0 ? deviceId : `anon-${crypto.randomUUID()}`;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const dHash = deviceHash(effectiveDeviceId);

  await prisma.device.upsert({
    where: { roomId_deviceHash: { roomId, deviceHash: dHash } },
    update: { displayName },
    create: { roomId, deviceHash: dHash, displayName },
  });

  return NextResponse.json({ ok: true });
}
