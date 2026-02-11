import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor } from "@/lib/server/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string; itemId: string }> }
) {
  const { roomId, itemId } = await ctx.params;

  const actor = await requireActor(req, roomId);
  const body = (await req.json().catch(() => null)) as null | { direction: "up" | "down" };
  const dir = body?.direction;

  if (dir !== "up" && dir !== "down") {
    return NextResponse.json({ error: "direction must be up/down" }, { status: 400 });
  }

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { dailyMenu: true },
  });
  if (!item || item.deletedAt) return NextResponse.json({ error: "item not found" }, { status: 404 });
  if (item.dailyMenu.roomId !== roomId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const allowed = actor.isOwner || item.createdByDeviceHash === actor.deviceHash;
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const neighbor = await prisma.menuItem.findFirst({
    where: {
      dailyMenuId: item.dailyMenuId,
      deletedAt: null,
      orderIndex: dir === "up" ? { lt: item.orderIndex } : { gt: item.orderIndex },
    },
    orderBy: { orderIndex: dir === "up" ? "desc" : "asc" },
  });

  if (!neighbor) return NextResponse.json({ ok: true, moved: false });

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: item.id }, data: { orderIndex: neighbor.orderIndex } }),
    prisma.menuItem.update({ where: { id: neighbor.id }, data: { orderIndex: item.orderIndex } }),
  ]);

  return NextResponse.json({ ok: true, moved: true });
}
