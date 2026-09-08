import { prisma } from "@/lib/prisma";
import { calledTicketMessage, sendWhatsApp } from "@/lib/whatsapp";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Emite uma nova senha para a fila informada, numerada a partir de 1 a cada dia. */
export async function issueTicket(queueId: string, patientName: string, phone: string | null = null) {
  const ticketsToday = await prisma.ticket.count({
    where: { queueId, createdAt: { gte: startOfToday() } },
  });

  return prisma.ticket.create({
    data: {
      queueId,
      patientName,
      phone,
      number: ticketsToday + 1,
    },
  });
}

/** Chama o próximo paciente aguardando na fila (mais antigo primeiro). */
export async function callNext(queueId: string) {
  const next = await prisma.ticket.findFirst({
    where: { queueId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    include: { queue: true },
  });

  if (!next) return null;

  const called = await prisma.ticket.update({
    where: { id: next.id },
    data: { status: "CALLED", calledAt: new Date() },
  });

  if (!next.phone) return called;

  const sent = await sendWhatsApp(
    next.phone,
    calledTicketMessage({
      patientName: next.patientName,
      ticketNumber: next.number,
      queueName: next.queue.name,
    }),
  );

  if (!sent) return called;

  return prisma.ticket.update({
    where: { id: called.id },
    data: { notifiedAt: new Date() },
  });
}

export async function startService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "IN_SERVICE", startedAt: new Date() },
  });
}

export async function finishService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "DONE", finishedAt: new Date() },
  });
}

export async function markNoShow(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "NO_SHOW" },
  });
}

export async function cancelTicket(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CANCELLED" },
  });
}
