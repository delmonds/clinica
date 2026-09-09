import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAppointment, listAppointments } from "@/lib/appointments";
import { endOfDay, formatDay, parseDayStart, todayStart } from "@/lib/reports";
import { normalizePhone } from "@/lib/whatsapp";

// Rota restrita à equipe (protegida em src/proxy.ts): a agenda traz nome e
// telefone dos pacientes.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = parseDayStart(searchParams.get("day")) ?? todayStart();

  const appointments = await listAppointments(day, endOfDay(day));
  return NextResponse.json({ day: formatDay(day), appointments });
}

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = typeof body.queueId === "string" ? body.queueId : "";
  const patientName = typeof body.patientName === "string" ? body.patientName.trim() : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const rawWhen = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";

  if (!queueId || !patientName || !rawPhone || !rawWhen) {
    return NextResponse.json(
      { error: "Fila, nome, WhatsApp e horário da consulta são obrigatórios." },
      { status: 400 },
    );
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "WhatsApp inválido. Use DDD + número, ex: (11) 99888-7777." },
      { status: 400 },
    );
  }

  // O input datetime-local manda "2026-09-10T14:30", sem fuso: é lido no fuso
  // do servidor, que é o horário de funcionamento da clínica.
  const scheduledAt = new Date(rawWhen);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Horário da consulta inválido." }, { status: 400 });
  }
  if (scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "A consulta precisa ser marcada para um horário futuro." },
      { status: 400 },
    );
  }

  const queue = await prisma.queue.findUnique({ where: { id: queueId } });
  if (!queue || !queue.active) {
    return NextResponse.json({ error: "Fila não encontrada." }, { status: 404 });
  }

  const appointment = await createAppointment({ queueId, patientName, phone, scheduledAt });
  return NextResponse.json({ appointment }, { status: 201 });
}
