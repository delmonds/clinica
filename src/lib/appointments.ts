import { prisma } from "@/lib/prisma";
import { issueTicket } from "@/lib/queue-service";

export async function createAppointment(params: {
  queueId: string;
  patientName: string;
  phone: string;
  scheduledAt: Date;
}) {
  return prisma.appointment.create({
    data: {
      queueId: params.queueId,
      patientName: params.patientName,
      phone: params.phone,
      scheduledAt: params.scheduledAt,
    },
  });
}

/**
 * O paciente chegou: emite a senha na fila da consulta e liga as duas coisas,
 * para o agendamento entrar no fluxo normal de chamada.
 */
export async function checkInAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.status !== "SCHEDULED") return null;

  const ticket = await issueTicket(appointment.queueId, appointment.patientName, appointment.phone);

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), ticketId: ticket.id },
    include: { ticket: true },
  });
}

export async function cancelAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.status !== "SCHEDULED") return null;

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });
}

/** Agenda de um dia, da consulta mais cedo para a mais tarde. */
export async function listAppointments(from: Date, to: Date) {
  return prisma.appointment.findMany({
    where: { scheduledAt: { gte: from, lte: to } },
    orderBy: { scheduledAt: "asc" },
    include: {
      queue: { select: { id: true, name: true } },
      ticket: { select: { number: true, status: true } },
      reminders: { select: { minutesBefore: true, deliveredAt: true } },
    },
  });
}
