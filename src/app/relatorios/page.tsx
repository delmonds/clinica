"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type QueueReport = {
  queueId: string;
  queueName: string;
  issued: number;
  attended: number;
  noShows: number;
  cancelled: number;
  open: number;
  avgWaitMinutes: number | null;
  avgServiceMinutes: number | null;
};

type Totals = Omit<QueueReport, "queueId" | "queueName">;

function today(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const minutes = (value: number | null) => (value === null ? "—" : `${value} min`);

export default function RelatoriosPage() {
  const router = useRouter();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [queues, setQueues] = useState<QueueReport[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar o relatório.");
        return;
      }
      setQueues(data.queues);
      setTotals(data.totals);
    } catch {
      setError("Ocorreu um erro de conexão.");
    } finally {
      setLoading(false);
    }
  }, [from, to, router]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    loadRef.current();
  }, []);

  function setPeriod(days: number) {
    setFrom(days === 0 ? today() : daysAgo(days));
    setTo(today());
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Relatório de atendimentos</h1>
            <p className="text-sm text-slate-500">Movimento de cada fila no período escolhido.</p>
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

        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label className="text-sm text-slate-600">
            De
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-600">
            Até
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            Atualizar
          </button>
          <div className="ml-auto flex gap-2 text-sm">
            <PeriodButton label="Hoje" onClick={() => setPeriod(0)} />
            <PeriodButton label="7 dias" onClick={() => setPeriod(6)} />
            <PeriodButton label="30 dias" onClick={() => setPeriod(29)} />
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {totals && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Senhas emitidas" value={String(totals.issued)} />
            <SummaryCard label="Atendimentos concluídos" value={String(totals.attended)} />
            <SummaryCard label="Espera média" value={minutes(totals.avgWaitMinutes)} />
            <SummaryCard label="Duração média" value={minutes(totals.avgServiceMinutes)} />
          </div>
        )}

        {queues === null && !error && <p className="text-slate-500">Carregando...</p>}

        {queues && queues.length === 0 && (
          <p className="text-slate-500">Nenhuma fila cadastrada.</p>
        )}

        {queues && queues.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Fila</th>
                  <th className="px-4 py-3 font-medium text-right">Emitidas</th>
                  <th className="px-4 py-3 font-medium text-right">Atendidas</th>
                  <th className="px-4 py-3 font-medium text-right">Faltas</th>
                  <th className="px-4 py-3 font-medium text-right">Canceladas</th>
                  <th className="px-4 py-3 font-medium text-right">Em aberto</th>
                  <th className="px-4 py-3 font-medium text-right">Espera média</th>
                  <th className="px-4 py-3 font-medium text-right">Duração média</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((queue) => (
                  <tr key={queue.queueId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{queue.queueName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{queue.issued}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{queue.attended}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{queue.noShows}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{queue.cancelled}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{queue.open}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{minutes(queue.avgWaitMinutes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{minutes(queue.avgServiceMinutes)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-medium text-slate-900">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.issued}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.attended}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.noShows}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.cancelled}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totals.open}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{minutes(totals.avgWaitMinutes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{minutes(totals.avgServiceMinutes)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <p className="text-xs text-slate-400">
          As senhas são contadas pela data de emissão. A espera média vai da emissão até a chamada;
          a duração média cobre o tempo de atendimento.
        </p>
      </div>
    </main>
  );
}

function PeriodButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100"
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
