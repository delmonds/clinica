"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type TicketStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "DONE" | "NO_SHOW" | "CANCELLED";

type Ticket = {
  id: string;
  number: number;
  patientName: string;
  status: TicketStatus;
};

type Estimate = {
  position: number;
  peopleAhead: number;
  estimatedMinutes: number;
  averageServiceMinutes: number;
};

const POLL_MS = 5000;

const STATUS_LABEL: Record<TicketStatus, string> = {
  WAITING: "Aguardando",
  CALLED: "Você foi chamado!",
  IN_SERVICE: "Em atendimento",
  DONE: "Atendimento concluído",
  NO_SHOW: "Não compareceu",
  CANCELLED: "Senha cancelada",
};

export default function SenhaStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Senha não encontrada.");
          return;
        }
        setTicket(data.ticket);
        setEstimate(data.estimate);
        setError(null);
      } catch {
        if (!cancelled) setError("Não foi possível atualizar. Tentando novamente...");
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6 text-center">
        {!ticket && !error && <p className="text-slate-500">Carregando...</p>}

        {error && !ticket && <p className="text-sm text-red-600">{error}</p>}

        {ticket && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
            <p className="text-sm text-slate-500">Senha</p>
            <p className="text-5xl font-bold text-slate-900 tabular-nums">#{ticket.number}</p>
            <p className="text-slate-600">{ticket.patientName}</p>

            <div
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                ticket.status === "CALLED"
                  ? "bg-emerald-100 text-emerald-700"
                  : ticket.status === "IN_SERVICE"
                    ? "bg-blue-100 text-blue-700"
                    : ticket.status === "WAITING"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-100 text-slate-500"
              }`}
            >
              {STATUS_LABEL[ticket.status]}
            </div>

            {ticket.status === "WAITING" && estimate && (
              <div className="space-y-1 pt-2">
                <p className="text-4xl font-semibold text-slate-900">
                  ~{estimate.estimatedMinutes} min
                </p>
                <p className="text-sm text-slate-500">
                  {estimate.peopleAhead === 0
                    ? "Você é o próximo!"
                    : `${estimate.peopleAhead} paciente${estimate.peopleAhead === 1 ? "" : "s"} na sua frente`}
                </p>
              </div>
            )}
          </div>
        )}

        <Link href="/senha" className="text-sm text-slate-500 hover:text-slate-700">
          ← consultar outra senha
        </Link>
      </div>
    </main>
  );
}
