/**
 * Campos da senha que podem ser devolvidos por rotas públicas.
 * O telefone do paciente fica de fora de propósito.
 */
export const PUBLIC_TICKET_FIELDS = {
  id: true,
  number: true,
  patientName: true,
  status: true,
  queueId: true,
  createdAt: true,
  calledAt: true,
  startedAt: true,
  finishedAt: true,
  notifiedAt: true,
} as const;
