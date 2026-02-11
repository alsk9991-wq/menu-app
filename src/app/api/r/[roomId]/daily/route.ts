import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor, HttpError } from "@/lib/server/auth";
import { jstMidnightToUtcDate, todayYmdInJst } from "@/lib/server/date";

function getDateParam(url: string): string {
  const u = new URL(url);
  return u.searchParams.get("date") ?? todayYmdInJst();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const actor = await requireActor(req, roomId);

    const dateYmd = getDateParam(req.url);
    const dateUtc = jstMidnightToUtcDate(dateYmd);

    const daily = await prisma.dailyMenu.findUnique({
      where: { roomId_date: { roomId: actor.roomId, date: dateUtc } },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({
      date: dateYmd,
      items:
        daily?.items.map((it) => ({
          id: it.id,
          name: it.name,
          addedBy: it.createdByDisplayName,
          orderIndex: it.orderIndex,
          canEdit: actor.isOwner || it.createdByDeviceHash === actor.deviceHash,
        })) ?? [],
      isOwner: actor.isOwner,
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json(e.payload, { status: e.status });
    }
    return NextResponse.json(
      { error: "internal", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const actor = await requireActor(req, roomId);

    const dateYmd = getDateParam(req.url);
    const body = (await req.json().catch(() => null)) as null | { name: string };
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "name too long" }, { status: 400 });
    }

    const dateUtc = jstMidnightToUtcDate(dateYmd);

    const daily = await prisma.dailyMenu.upsert({
      where: { roomId_date: { roomId: actor.roomId, date: dateUtc } },
      update: {},
      create: { roomId: actor.roomId, date: dateUtc },
      select: { id: true },
    });

    const max = await prisma.menuItem.aggregate({
      where: { dailyMenuId: daily.id, deletedAt: null },
      _max: { orderIndex: true },
    });
    const nextIndex = (max._max.orderIndex ?? -1) + 1;

    const item = await prisma.menuItem.create({
      data: {
        dailyMenuId: daily.id,
        name,
        createdByDeviceHash: actor.deviceHash,
        createdByDisplayName: actor.displayName,
        orderIndex: nextIndex,
      },
      select: { id: true, name: true, createdByDisplayName: true, orderIndex: true },
    });

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        addedBy: item.createdByDisplayName,
        orderIndex: item.orderIndex,
      },
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json(e.payload, { status: e.status });
    }
    return NextResponse.json(
      { error: "internal", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
