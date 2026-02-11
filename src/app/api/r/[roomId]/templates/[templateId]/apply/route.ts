import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor } from "@/lib/server/auth";
import { jstMidnightToUtcDate } from "@/lib/server/date";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string; templateId: string }> }
) {
  const { roomId, templateId } = await ctx.params;
  const actor = await requireActor(req, roomId);

  if (!actor.isOwner) {
    return NextResponse.json({ error: "only owner can apply template" }, { status: 403 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const day = jstMidnightToUtcDate(date);

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });
  if (!template || template.roomId !== roomId) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }

  const daily = await prisma.dailyMenu.upsert({
    where: { roomId_date: { roomId, date: day } },
    update: {},
    create: { roomId, date: day },
    select: { id: true },
  });

  await prisma.menuItem.createMany({
    data: template.items.map((i) => ({
      dailyMenuId: daily.id,
      name: i.name,
      orderIndex: i.orderIndex,
      createdByDeviceHash: actor.deviceHash,
      createdByDisplayName: actor.displayName,
    })),
  });

  return NextResponse.json({ ok: true, applied: template.items.length });
}
