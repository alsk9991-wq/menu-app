import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sha256Hex } from "@/lib/server/crypto";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as null | {
    deviceId: string;
    displayName: string;
    inviteToken?: string; // 省略OK
  };

  const deviceId = body?.deviceId?.trim();
  const displayName = body?.displayName?.trim();

  if (!deviceId || !displayName) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, inviteTokenHash: true },
  });
  if (!room) return NextResponse.json({ error: "room not found" }, { status: 404 });

  const fixedToken = (process.env.FIXED_INVITE_TOKEN ?? "").trim();
  if (!fixedToken) {
    return NextResponse.json({ error: "FIXED_INVITE_TOKEN is not set" }, { status: 500 });
  }

  // 送られてきたtokenがあればそれを、無ければ固定トークンを採用
  const token = (body?.inviteToken ?? "").trim() || fixedToken;

  // DBのhashと一致チェック（固定運用でもチェックは残す）
  const tokenHash = sha256Hex(token);
  if (tokenHash !== room.inviteTokenHash) {
    return NextResponse.json({ error: "invalid invite" }, { status: 403 });
  }

  const dHash = sha256Hex(deviceId);

  await prisma.device.upsert({
    where: { roomId_deviceHash: { roomId, deviceHash: dHash } },
    update: { displayName },
    create: { roomId, deviceHash: dHash, displayName },
  });

  return NextResponse.json({ ok: true });
}
