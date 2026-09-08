import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callNext } from "@/lib/queue-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const queue = await prisma.queue.findUnique({ where: { id } });
  if (!queue) {
    return NextResponse.json({ error: "Fila não encontrada." }, { status: 404 });
  }

  const stillPending = await prisma.ticket.findFirst({
    where: { queueId: id, status: { in: ["CALLED", "IN_SERVICE"] } },
  });
  if (stillPending) {
    return NextResponse.json(
      { error: "Já existe uma senha chamada/em atendimento nesta fila." },
      { status: 409 },
    );
  }

  const ticket = await callNext(id);
  if (!ticket) {
    return NextResponse.json({ error: "Não há pacientes aguardando nesta fila." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}
