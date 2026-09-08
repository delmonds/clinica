import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueTicket } from "@/lib/queue-service";
import { PUBLIC_TICKET_FIELDS } from "@/lib/ticket-fields";
import { normalizePhone } from "@/lib/whatsapp";

/** Busca a senha de hoje pelo número e fila, para o paciente consultar sem precisar do link direto. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queueId = searchParams.get("queueId") ?? "";
  const number = Number(searchParams.get("number"));

  if (!queueId || !Number.isFinite(number)) {
    return NextResponse.json({ error: "Informe a fila e o número da senha." }, { status: 400 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const ticket = await prisma.ticket.findFirst({
    where: { queueId, number, createdAt: { gte: startOfDay } },
    select: PUBLIC_TICKET_FIELDS,
  });

  if (!ticket) {
    return NextResponse.json({ error: "Senha não encontrada para hoje." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = typeof body.queueId === "string" ? body.queueId : "";
  const patientName = typeof body.patientName === "string" ? body.patientName.trim() : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!queueId || !patientName) {
    return NextResponse.json({ error: "Fila e nome do paciente são obrigatórios." }, { status: 400 });
  }

  // O WhatsApp é opcional, mas se vier preenchido precisa ser um número válido.
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return NextResponse.json(
      { error: "WhatsApp inválido. Use DDD + número, ex: (11) 99888-7777." },
      { status: 400 },
    );
  }

  const queue = await prisma.queue.findUnique({ where: { id: queueId } });
  if (!queue || !queue.active) {
    return NextResponse.json({ error: "Fila não encontrada." }, { status: 404 });
  }

  const ticket = await issueTicket(queueId, patientName, phone);
  return NextResponse.json({ ticket }, { status: 201 });
}
