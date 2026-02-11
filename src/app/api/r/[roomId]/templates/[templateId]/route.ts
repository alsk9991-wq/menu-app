import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireActor, HttpError } from "@/lib/server/auth";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ roomId: string; templateId: string }> }
) {
  try {
    const { roomId, templateId } = await ctx.params;
    const actor = await requireActor(req, roomId);

    if (!actor.isOwner) {
      return NextResponse.json({ error: "only owner can delete template" }, { status: 403 });
    }

    // roomIdも必ず条件に入れる（別ルームのテンプレ消し防止）
    const deleted = await prisma.template.deleteMany({
      where: { id: templateId, roomId: actor.roomId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "template not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
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
