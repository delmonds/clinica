"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type TicketStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "DONE" | "NO_SHOW" | "CANCELLED";

type Ticket = {
  id: string;
  number: number;
  patientName: string;
  status: TicketStatus;
  createdAt: string;
};

type QueueWithTickets = {
  id: string;
  name: string;
  description: string | null;
  defaultServiceMins: number;
  waitingCount: number;
  current: Ticket | null;
  waiting: Ticket[];
};

const POLL_MS = 4000;

export default function RecepcaoPage() {
  const [queues, setQueues] = useState<QueueWithTickets[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/queues", { cache: "no-store" });
      const data = await res.json();
      setQueues(data.queues);
    } catch {
      setError("Não foi possível carregar as filas.");
    }
  }, []);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const poll = () => loadRef.current();
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  async function runAction(key: string, url: string, method = "POST", body?: unknown) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ocorreu um erro.");
      } else {
        await load();
      }
    } catch {
      setError("Ocorreu um erro de conexão.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Recepção</h1>
            <p className="text-sm text-slate-500">Emita senhas e chame os próximos pacientes.</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← início
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {queues === null && <p className="text-slate-500">Carregando...</p>}

        {queues?.length === 0 && <CreateFirstQueue onCreated={load} />}

        <div className="grid gap-6 md:grid-cols-2">
          {queues?.map((queue) => (
            <QueueCard key={queue.id} queue={queue} busy={busy} onAction={runAction} />
          ))}
        </div>

        {queues && queues.length > 0 && <NewQueueForm onCreated={load} />}
      </div>
    </main>
  );
}

function QueueCard({
  queue,
  busy,
  onAction,
}: {
  queue: QueueWithTickets;
  busy: string | null;
  onAction: (key: string, url: string, method?: string, body?: unknown) => Promise<void>;
}) {
  const [patientName, setPatientName] = useState("");

  const current = queue.current;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-medium text-slate-900">{queue.name}</h2>
        {queue.description && <p className="text-sm text-slate-500">{queue.description}</p>}
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        {current ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              {current.status === "CALLED" ? "Chamado" : "Em atendimento"}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              #{current.number} — {current.patientName}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {current.status === "CALLED" && (
                <>
                  <ActionButton
                    label="Iniciar atendimento"
                    disabled={busy === current.id}
                    onClick={() => onAction(current.id, `/api/tickets/${current.id}/start`)}
                  />
                  <ActionButton
                    label="Não compareceu"
                    variant="secondary"
                    disabled={busy === current.id}
                    onClick={() => onAction(current.id, `/api/tickets/${current.id}/no-show`)}
                  />
                </>
              )}
              {current.status === "IN_SERVICE" && (
                <ActionButton
                  label="Concluir atendimento"
                  disabled={busy === current.id}
                  onClick={() => onAction(current.id, `/api/tickets/${current.id}/finish`)}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma senha chamada no momento.</p>
        )}
      </div>

      <ActionButton
        label={`Chamar próximo (${queue.waitingCount} aguardando)`}
        disabled={!!current || queue.waitingCount === 0 || busy === `call-${queue.id}`}
        onClick={() => onAction(`call-${queue.id}`, `/api/queues/${queue.id}/call-next`)}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Fila de espera</p>
        {queue.waiting.length === 0 ? (
          <p className="text-sm text-slate-400">Ninguém aguardando.</p>
        ) : (
          <ol className="space-y-1 text-sm text-slate-600">
            {queue.waiting.map((t, idx) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>
                  {idx + 1}. #{t.number} {t.patientName}
                </span>
                <button
                  className="text-xs text-red-500 hover:underline disabled:opacity-40"
                  disabled={busy === t.id}
                  onClick={() => onAction(t.id, `/api/tickets/${t.id}/cancel`)}
                >
                  cancelar
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form
        className="flex gap-2 pt-2 border-t border-slate-100"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!patientName.trim()) return;
          await onAction("issue", "/api/tickets", "POST", { queueId: queue.id, patientName });
          setPatientName("");
        }}
      >
        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Nome do paciente"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy === "issue"}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          Emitir senha
        </button>
      </form>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "primary"
          ? "w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      }
    >
      {label}
    </button>
  );
}

function CreateFirstQueue({ onCreated }: { onCreated: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-4">
      <p className="text-slate-600">Ainda não há filas cadastradas.</p>
      <NewQueueForm onCreated={onCreated} />
    </div>
  );
}

function NewQueueForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, defaultServiceMins: minutes }),
      });
      setName("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-slate-500 hover:text-slate-700 underline"
      >
        + nova fila
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <label className="text-sm text-slate-600">
        Nome da fila
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Atendimento Geral"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      <label className="text-sm text-slate-600">
        Tempo médio de atendimento inicial (minutos)
        <input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
      >
        Criar fila
      </button>
    </form>
  );
}
