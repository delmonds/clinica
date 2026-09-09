"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AppointmentStatus = "SCHEDULED" | "CHECKED_IN" | "CANCELLED";

type Appointment = {
  id: string;
  patientName: string;
  scheduledAt: string;
  status: AppointmentStatus;
  queue: { id: string; name: string };
  ticket: { number: number; status: string } | null;
  reminders: { minutesBefore: number; deliveredAt: string | null }[];
};

type Queue = { id: string; name: string };

const POLL_MS = 20000;

function today(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function timeOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CHECKED_IN: "Paciente chegou",
  CANCELLED: "Cancelada",
};

export default function AgendaPage() {
  const router = useRouter();
  const [day, setDay] = useState(today());
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [agenda, filas] = await Promise.all([
        fetch(`/api/appointments?day=${day}`, { cache: "no-store" }),
        fetch("/api/queues", { cache: "no-store" }),
      ]);
      if (agenda.status === 401) {
        router.push("/login");
        return;
      }
      const dados = await agenda.json();
      setAppointments(dados.appointments);
      setQueues((await filas.json()).queues);
    } catch {
      setError("Não foi possível carregar a agenda.");
    }
  }, [day, router]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const poll = () => loadRef.current();
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [day]);

  async function runAction(key: string, url: string, body?: unknown) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) {
        router.push("/login");
        return false;
      }
      const dados = await res.json();
      if (!res.ok) {
        setError(dados.error ?? "Ocorreu um erro.");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Ocorreu um erro de conexão.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Agenda de consultas</h1>
            <p className="text-sm text-slate-500">
              Consultas marcadas e os lembretes já enviados por WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/recepcao" className="text-sm text-slate-500 hover:text-slate-700">
              recepção
            </Link>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
              ← início
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <NewAppointmentForm queues={queues} onCreate={runAction} busy={busy} />

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">
            Dia
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
        </div>

        {appointments === null && <p className="text-slate-500">Carregando...</p>}

        {appointments?.length === 0 && (
          <p className="text-slate-500">Nenhuma consulta marcada para este dia.</p>
        )}

        {appointments && appointments.length > 0 && (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const sent = appointment.reminders.filter((r) => r.deliveredAt).length;
              return (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="text-lg font-semibold tabular-nums text-slate-900">
                    {timeOf(appointment.scheduledAt)}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="font-medium text-slate-900">{appointment.patientName}</p>
                    <p className="text-sm text-slate-500">{appointment.queue.name}</p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      appointment.status === "SCHEDULED"
                        ? "bg-slate-100 text-slate-700"
                        : appointment.status === "CHECKED_IN"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {STATUS_LABEL[appointment.status]}
                    {appointment.ticket ? ` — senha #${appointment.ticket.number}` : ""}
                  </span>

                  <span className="text-xs text-slate-500">
                    {sent === 0 ? "nenhum lembrete enviado" : `${sent} lembrete${sent === 1 ? "" : "s"} enviado${sent === 1 ? "" : "s"}`}
                  </span>

                  {appointment.status === "SCHEDULED" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => runAction(appointment.id, `/api/appointments/${appointment.id}/check-in`)}
                        disabled={busy === appointment.id}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                      >
                        Paciente chegou
                      </button>
                      <button
                        onClick={() => runAction(appointment.id, `/api/appointments/${appointment.id}/cancel`)}
                        disabled={busy === appointment.id}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400">
          &quot;Paciente chegou&quot; emite a senha na fila da consulta e interrompe os lembretes.
        </p>
      </div>
    </main>
  );
}

function NewAppointmentForm({
  queues,
  onCreate,
  busy,
}: {
  queues: Queue[];
  onCreate: (key: string, url: string, body?: unknown) => Promise<boolean>;
  busy: string | null;
}) {
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [queueId, setQueueId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const selectedQueue = queueId || queues[0]?.id || "";

  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!patientName.trim() || !phone.trim() || !scheduledAt) return;
        const ok = await onCreate("new", "/api/appointments", {
          queueId: selectedQueue,
          patientName,
          phone,
          scheduledAt,
        });
        if (ok) {
          setPatientName("");
          setPhone("");
          setScheduledAt("");
        }
      }}
    >
      <label className="text-sm text-slate-600 sm:col-span-2">
        Paciente
        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Nome do paciente"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      <label className="text-sm text-slate-600">
        WhatsApp
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99888-7777"
          inputMode="tel"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      <label className="text-sm text-slate-600">
        Fila
        <select
          value={selectedQueue}
          onChange={(e) => setQueueId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          {queues.map((queue) => (
            <option key={queue.id} value={queue.id}>
              {queue.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-600">
        Data e hora
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      <div className="sm:col-span-5">
        <button
          type="submit"
          disabled={busy === "new"}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          Marcar consulta
        </button>
      </div>
    </form>
  );
}
