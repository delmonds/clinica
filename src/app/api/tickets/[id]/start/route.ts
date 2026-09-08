import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startService } from "@/lib/queue-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada." }, { status: 404 });
  }
  if (ticket.status !== "CALLED") {
    return NextResponse.json({ error: "A senha precisa estar chamada antes de iniciar o atendimento." }, { status: 409 });
  }

  const updated = await startService(id);
  return NextResponse.json({ ticket: updated });
}
