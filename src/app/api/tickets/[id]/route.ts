import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TICKET_FIELDS } from "@/lib/ticket-fields";
import { estimateWait } from "@/lib/wait-time";

// Rota pública: o paciente acompanha a senha por aqui, sem login.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { ...PUBLIC_TICKET_FIELDS, queue: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada." }, { status: 404 });
  }

  const estimate = await estimateWait(ticket, ticket.queue);

  return NextResponse.json({ ticket, estimate });
}
