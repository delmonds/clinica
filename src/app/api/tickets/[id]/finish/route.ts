import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finishService } from "@/lib/queue-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada." }, { status: 404 });
  }
  if (ticket.status !== "IN_SERVICE") {
    return NextResponse.json({ error: "A senha precisa estar em atendimento para ser concluída." }, { status: 409 });
  }

  const updated = await finishService(id);
  return NextResponse.json({ ticket: updated });
}
