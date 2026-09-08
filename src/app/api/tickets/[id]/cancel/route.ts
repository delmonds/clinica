import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelTicket } from "@/lib/queue-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada." }, { status: 404 });
  }
  if (ticket.status !== "WAITING") {
    return NextResponse.json({ error: "Só é possível cancelar uma senha que ainda está aguardando." }, { status: 409 });
  }

  const updated = await cancelTicket(id);
  return NextResponse.json({ ticket: updated });
}
