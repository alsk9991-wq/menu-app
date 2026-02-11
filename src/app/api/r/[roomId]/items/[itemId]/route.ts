import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor } from "@/lib/server/auth";

async function loadItem(roomId: string, itemId: string) {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { dailyMenu: true },
  });
  if (!item || item.deletedAt) return null;
  if (item.dailyMenu.roomId !== roomId) return null;
  return item;
}

function canEdit(actor: { isOwner: boolean; deviceHash: string }, item: { createdByDeviceHash: string }) {
  return actor.isOwner || actor.deviceHash === item.createdByDeviceHash;
}

// 名前変更
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ roomId: string; itemId: string }> }
) {
  const { roomId, itemId } = await ctx.params;
  const actor = await requireActor(req, roomId);

  const item = await loadItem(roomId, itemId);
  if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });
  if (!canEdit(actor, item)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { name: string };
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "name too long" }, { status: 400 });

  const updated = await prisma.menuItem.update({
    where: { id: item.id },
    data: { name },
    select: { id: true, name: true, orderIndex: true, createdByDisplayName: true },
  });

  return NextResponse.json({
    item: { id: updated.id, name: updated.name, addedBy: updated.createdByDisplayName, orderIndex: updated.orderIndex },
  });
}

// 論理削除
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ roomId: string; itemId: string }> }
) {
  const { roomId, itemId } = await ctx.params;
  const actor = await requireActor(req, roomId);

  const item = await loadItem(roomId, itemId);
  if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });
  if (!canEdit(actor, item)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
