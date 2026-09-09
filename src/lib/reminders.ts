import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

const DEFAULTS = {
  /** quanto antes da consulta os lembretes começam */
  leadMinutes: 180,
  /** intervalo entre lembretes fora da reta final */
  stepMinutes: 30,
  /** tamanho da reta final, onde os lembretes ficam mais frequentes */
  finalWindowMinutes: 30,
  /** intervalo entre lembretes dentro da reta final */
  finalStepMinutes: 5,
};

function envMinutes(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} precisa ser um número de minutos maior que zero (recebido: "${raw}").`);
  }
  return Math.round(value);
}

/**
 * As marcas (em minutos antes da consulta) em que um lembrete deve sair,
 * da mais distante para a mais próxima. Com os valores padrão:
 * 180, 150, 120, 90, 60, 30, 25, 20, 15, 10, 5.
 */
export function reminderSchedule(): number[] {
  const lead = envMinutes("REMINDER_LEAD_MINUTES", DEFAULTS.leadMinutes);
  const step = envMinutes("REMINDER_STEP_MINUTES", DEFAULTS.stepMinutes);
  const finalWindow = envMinutes("REMINDER_FINAL_WINDOW_MINUTES", DEFAULTS.finalWindowMinutes);
  const finalStep = envMinutes("REMINDER_FINAL_STEP_MINUTES", DEFAULTS.finalStepMinutes);

  const slots = new Set<number>();
  for (let minutes = lead; minutes > finalWindow; minutes -= step) slots.add(minutes);
  for (let minutes = Math.min(finalWindow, lead); minutes >= finalStep; minutes -= finalStep) slots.add(minutes);

  return Array.from(slots).sort((a, b) => b - a);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "1h40" / "25 min" — quanto falta, em linguagem de paciente. */
export function humanCountdown(minutes: number): string {
  const rounded = Math.max(Math.round(minutes), 1);
  if (rounded < 60) return `${rounded} min`;

  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${pad(rest)}`;
}

export function reminderMessage(params: {
  patientName: string;
  queueName: string;
  scheduledAt: Date;
  minutesUntil: number;
}): string {
  const firstName = params.patientName.trim().split(/\s+/)[0];
  const time = `${pad(params.scheduledAt.getHours())}:${pad(params.scheduledAt.getMinutes())}`;
  return (
    `Olá, ${firstName}! Lembrete da sua consulta de ${params.queueName} às ${time} ` +
    `— faltam ${humanCountdown(params.minutesUntil)}. Se não puder comparecer, avise a clínica.`
  );
}

export type ReminderRun = {
  checked: number;
  sent: number;
  failed: number;
  /** marcas puladas por já terem passado quando o disparador rodou */
  superseded: number;
};

/**
 * Envia os lembretes vencidos. Pensado para rodar de tempos em tempos (cron).
 *
 * Se o disparador ficar parado e várias marcas vencerem de uma vez, apenas a
 * mais próxima da consulta é enviada e as demais são registradas como
 * consumidas — assim o paciente recebe um lembrete atualizado em vez de uma
 * rajada de mensagens atrasadas.
 *
 * Uma tentativa que falha também consome a marca, em vez de repetir a cada
 * rodada: um número inválido não fica em laço, e as marcas seguintes cobrem
 * a falha momentânea.
 */
export async function runDueReminders(now: Date = new Date()): Promise<ReminderRun> {
  const schedule = reminderSchedule();
  const horizon = new Date(now.getTime() + schedule[0] * 60000);

  const appointments = await prisma.appointment.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gt: now, lte: horizon } },
    include: { queue: true, reminders: { select: { minutesBefore: true } } },
  });

  const run: ReminderRun = { checked: appointments.length, sent: 0, failed: 0, superseded: 0 };

  for (const appointment of appointments) {
    const minutesUntil = (appointment.scheduledAt.getTime() - now.getTime()) / 60000;
    const consumed = new Set(appointment.reminders.map((r) => r.minutesBefore));
    const due = schedule.filter((slot) => slot >= minutesUntil && !consumed.has(slot));
    if (due.length === 0) continue;

    const target = Math.min(...due);
    const skipped = due.filter((slot) => slot !== target);

    const delivered = await sendWhatsApp(
      appointment.phone,
      reminderMessage({
        patientName: appointment.patientName,
        queueName: appointment.queue.name,
        scheduledAt: appointment.scheduledAt,
        minutesUntil: minutesUntil,
      }),
    );

    await prisma.appointmentReminder.createMany({
      data: [
        { appointmentId: appointment.id, minutesBefore: target, deliveredAt: delivered ? new Date() : null },
        ...skipped.map((slot) => ({ appointmentId: appointment.id, minutesBefore: slot, deliveredAt: null })),
      ],
    });

    if (delivered) run.sent += 1;
    else run.failed += 1;
    run.superseded += skipped.length;
  }

  return run;
}
