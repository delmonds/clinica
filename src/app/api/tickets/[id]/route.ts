import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateWait } from "@/lib/wait-time";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { queue: true } });
  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada." }, { status: 404 });
  }

  const estimate = await estimateWait(ticket, ticket.queue);

  return NextResponse.json({ ticket, estimate });
}
