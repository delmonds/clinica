"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Queue = { id: string; name: string };

export default function ConsultarSenhaPage() {
  const router = useRouter();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueId, setQueueId] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/queues")
      .then((res) => res.json())
      .then((data) => {
        setQueues(data.queues);
        if (data.queues[0]) setQueueId(data.queues[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!queueId || !number) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets?queueId=${queueId}&number=${number}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Senha não encontrada.");
        return;
      }
      router.push(`/senha/${data.ticket.id}`);
    } catch {
      setError("Ocorreu um erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Consultar minha senha</h1>
          <p className="text-sm text-slate-500">Veja sua posição e o tempo estimado de espera.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm text-slate-600">
            Fila
            <select
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-600">
            Número da senha
            <input
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ex: 12"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            Consultar
          </button>
        </form>

        <div className="text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← início
          </Link>
        </div>
      </div>
    </main>
  );
}
