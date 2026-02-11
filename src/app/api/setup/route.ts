import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { deviceHash, makeInviteToken, sha256Hex } from "@/lib/server/crypto";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    deviceId: string;
    displayName: string;
    roomName?: string;
  };

  if (!body?.deviceId || !body?.displayName) {
    return NextResponse.json({ error: "deviceId and displayName required" }, { status: 400 });
  }

  const ownerHash = deviceHash(body.deviceId);
  const inviteToken = makeInviteToken();
  const inviteTokenHash = sha256Hex(inviteToken);

  const room = await prisma.room.create({
    data: {
      name: body.roomName ?? null,
      ownerDeviceHash: ownerHash,
      inviteTokenHash,
      devices: {
        create: {
          deviceHash: ownerHash,
          displayName: body.displayName,
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({
    roomId: room.id,
    inviteToken, // ← これを招待URLに付ける
  });
}
