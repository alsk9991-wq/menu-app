import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor } from "@/lib/server/auth";
import { jstMidnightToUtcDate } from "@/lib/server/date";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const actorOrRes = await requireActor(req, roomId);
  if (actorOrRes instanceof Response) return actorOrRes;
  const actor = actorOrRes;

  const templates = await prisma.template.findMany({
    where: { roomId: actor.roomId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { orderIndex: "asc" } } },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      count: t.items.length,
      createdAt: t.createdAt,
    })),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;

    const actorOrRes = await requireActor(req, roomId);
    if (actorOrRes instanceof Response) return actorOrRes;
    const actor = actorOrRes;

    if (!actor.isOwner) {
      return NextResponse.json(
        { error: "only owner can save template" },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as null | {
      name: string;
      date: string;
    };

    const name = body?.name?.trim();
    const date = body?.date?.trim();

    if (!name || !date) {
      return NextResponse.json(
        { error: "name and date required" },
        { status: 400 }
      );
    }
    if (name.length > 50) {
      return NextResponse.json(
        { error: "name too long" },
        { status: 400 }
      );
    }

    const day = jstMidnightToUtcDate(date);

    // ★ roomId は actor.roomId を使う（URLのroomIdを信用しない）
    const daily = await prisma.dailyMenu.findUnique({
      where: { roomId_date: { roomId: actor.roomId, date: day } },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!daily || daily.items.length === 0) {
      return NextResponse.json({ error: "no items to save" }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        roomId: actor.roomId,
        name,
        createdByDeviceHash: actor.deviceHash,
        items: {
          create: daily.items.map((i) => ({
            name: i.name,
            orderIndex: i.orderIndex,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({
      template: { id: template.id, name: template.name, count: template.items.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "internal",
        name: e?.name,
        message: e?.message,
        code: e?.code,
        meta: e?.meta,
      },
      { status: 500 }
    );
  }
}
