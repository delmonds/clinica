"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  number: number;
  patientName: string;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "DONE" | "NO_SHOW" | "CANCELLED";
};

type QueueWithTickets = {
  id: string;
  name: string;
  waitingCount: number;
  current: Ticket | null;
  waiting: Ticket[];
};

const POLL_MS = 3000;

export default function PainelPage() {
  const [queues, setQueues] = useState<QueueWithTickets[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/queues", { cache: "no-store" });
        const data = await res.json();
        setQueues(data.queues);
      } catch {
        // mantém o último estado visível em caso de falha momentânea de rede
      }
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex-1 bg-slate-950 px-8 py-10 text-white">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight">
        Painel de Chamadas
      </h1>

      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {queues?.map((queue) => (
          <div key={queue.id} className="rounded-2xl bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-medium text-slate-300">{queue.name}</h2>

            <div className="mt-4 min-h-32 flex flex-col items-center justify-center rounded-xl bg-slate-800 py-6">
              {queue.current ? (
                <>
                  <span className="text-5xl font-bold tabular-nums">#{queue.current.number}</span>
                  <span className="mt-2 text-xl text-slate-200">{queue.current.patientName}</span>
                  <span className="mt-1 text-xs uppercase tracking-wide text-emerald-400">
                    {queue.current.status === "CALLED" ? "chamando" : "em atendimento"}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">Aguardando chamada</span>
              )}
            </div>

            <p className="mt-4 text-sm text-slate-400">
              {queue.waitingCount} paciente{queue.waitingCount === 1 ? "" : "s"} na fila
            </p>
          </div>
        ))}
      </div>

      {queues?.length === 0 && (
        <p className="text-center text-slate-400">Nenhuma fila ativa no momento.</p>
      )}
    </main>
  );
}
