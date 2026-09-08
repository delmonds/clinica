import { prisma } from "@/lib/prisma";

export type QueueReport = {
  queueId: string;
  queueName: string;
  /** senhas emitidas no período */
  issued: number;
  /** atendimentos concluídos */
  attended: number;
  noShows: number;
  cancelled: number;
  /** senhas do período que ainda estão abertas (aguardando, chamadas ou em atendimento) */
  open: number;
  /** média de minutos entre emitir a senha e chamar o paciente */
  avgWaitMinutes: number | null;
  /** média de minutos de duração do atendimento */
  avgServiceMinutes: number | null;
};

export type ReportTotals = Omit<QueueReport, "queueId" | "queueName">;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60000;
}

/**
 * Consolida os atendimentos de cada fila no período, contando as senhas pela
 * data de emissão. O volume diário de uma clínica é pequeno, então a agregação
 * é feita em memória — isso mantém o cálculo dos tempos médios legível.
 */
export async function buildQueueReports(from: Date, to: Date) {
  const queues = await prisma.queue.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      tickets: {
        where: { createdAt: { gte: from, lte: to } },
        select: {
          status: true,
          createdAt: true,
          calledAt: true,
          startedAt: true,
          finishedAt: true,
        },
      },
    },
  });

  const reports: QueueReport[] = queues.map((queue) => {
    const waits: number[] = [];
    const services: number[] = [];
    let attended = 0;
    let noShows = 0;
    let cancelled = 0;
    let open = 0;

    for (const ticket of queue.tickets) {
      if (ticket.status === "DONE") attended++;
      else if (ticket.status === "NO_SHOW") noShows++;
      else if (ticket.status === "CANCELLED") cancelled++;
      else open++;

      if (ticket.calledAt) {
        waits.push(minutesBetween(ticket.createdAt, ticket.calledAt));
      }
      if (ticket.startedAt && ticket.finishedAt) {
        services.push(minutesBetween(ticket.startedAt, ticket.finishedAt));
      }
    }

    return {
      queueId: queue.id,
      queueName: queue.name,
      issued: queue.tickets.length,
      attended,
      noShows,
      cancelled,
      open,
      avgWaitMinutes: average(waits),
      avgServiceMinutes: average(services),
    };
  });

  return { reports, totals: sumTotals(reports, queues) };
}

/**
 * Os tempos médios do total são recalculados sobre todas as senhas — a média
 * das médias por fila distorceria o número quando as filas têm volumes
 * diferentes.
 */
function sumTotals(
  reports: QueueReport[],
  queues: { tickets: { createdAt: Date; calledAt: Date | null; startedAt: Date | null; finishedAt: Date | null }[] }[],
): ReportTotals {
  const waits: number[] = [];
  const services: number[] = [];

  for (const queue of queues) {
    for (const ticket of queue.tickets) {
      if (ticket.calledAt) waits.push(minutesBetween(ticket.createdAt, ticket.calledAt));
      if (ticket.startedAt && ticket.finishedAt) {
        services.push(minutesBetween(ticket.startedAt, ticket.finishedAt));
      }
    }
  }

  const sum = (pick: (r: QueueReport) => number) => reports.reduce((total, r) => total + pick(r), 0);

  return {
    issued: sum((r) => r.issued),
    attended: sum((r) => r.attended),
    noShows: sum((r) => r.noShows),
    cancelled: sum((r) => r.cancelled),
    open: sum((r) => r.open),
    avgWaitMinutes: average(waits),
    avgServiceMinutes: average(services),
  };
}

/**
 * Converte "YYYY-MM-DD" no início do dia. Retorna null se a data for inválida.
 * As datas do relatório são sempre tratadas no fuso do servidor — usar UTC aqui
 * faria o "hoje" virar antes (ou depois) da meia-noite da clínica.
 */
export function parseDayStart(raw: string | null): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayStart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Formata a data como "YYYY-MM-DD" no fuso local. */
export function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
