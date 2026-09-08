import { prisma } from "@/lib/prisma";
import type { Queue, Ticket } from "@/generated/prisma/client";

const HISTORY_SAMPLE_SIZE = 20;
const MIN_SERVICE_MINUTES = 3;

/**
 * Tempo médio de atendimento (em minutos) de uma fila, calculado a partir
 * dos últimos atendimentos concluídos. Cai para `defaultServiceMins` da fila
 * enquanto não houver histórico suficiente.
 */
export async function getAverageServiceMinutes(queue: Queue): Promise<number> {
  const recentFinished = await prisma.ticket.findMany({
    where: { queueId: queue.id, status: "DONE", startedAt: { not: null }, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    take: HISTORY_SAMPLE_SIZE,
    select: { startedAt: true, finishedAt: true },
  });

  if (recentFinished.length === 0) {
    return queue.defaultServiceMins;
  }

  const totalMinutes = recentFinished.reduce((sum, t) => {
    const minutes = (t.finishedAt!.getTime() - t.startedAt!.getTime()) / 60000;
    return sum + Math.max(minutes, MIN_SERVICE_MINUTES);
  }, 0);

  return totalMinutes / recentFinished.length;
}

export type WaitEstimate = {
  /** posição do paciente na fila (1 = próximo a ser chamado) */
  position: number;
  /** quantas pessoas estão à frente aguardando */
  peopleAhead: number;
  /** minutos estimados até o paciente ser chamado */
  estimatedMinutes: number;
  /** tempo médio de atendimento usado na estimativa, em minutos */
  averageServiceMinutes: number;
};

/**
 * Estima quanto falta para um ticket ser chamado, considerando quem está
 * à frente na fila (aguardando ou já em atendimento).
 */
export async function estimateWait(ticket: Ticket, queue: Queue): Promise<WaitEstimate | null> {
  if (ticket.status !== "WAITING") {
    return null;
  }

  const avg = await getAverageServiceMinutes(queue);

  const [peopleAhead, inService] = await Promise.all([
    prisma.ticket.count({
      where: { queueId: queue.id, status: "WAITING", createdAt: { lt: ticket.createdAt } },
    }),
    prisma.ticket.findFirst({
      where: { queueId: queue.id, status: { in: ["IN_SERVICE", "CALLED"] } },
      orderBy: { calledAt: "asc" },
    }),
  ]);

  let estimatedMinutes = peopleAhead * avg;

  if (inService) {
    if (inService.status === "IN_SERVICE" && inService.startedAt) {
      const elapsed = (Date.now() - inService.startedAt.getTime()) / 60000;
      estimatedMinutes += Math.max(avg - elapsed, 1);
    } else {
      estimatedMinutes += avg;
    }
  }

  return {
    position: peopleAhead + 1,
    peopleAhead,
    estimatedMinutes: Math.max(Math.round(estimatedMinutes), 0),
    averageServiceMinutes: Math.round(avg),
  };
}
