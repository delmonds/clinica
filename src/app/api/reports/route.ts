import { NextResponse } from "next/server";
import { buildQueueReports, endOfDay, formatDay, parseDayStart, todayStart } from "@/lib/reports";

// Rota restrita à equipe (protegida em src/proxy.ts): consolida o movimento
// das filas, não deve ficar aberta como as consultas do paciente.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const from = parseDayStart(searchParams.get("from")) ?? todayStart();
  const to = parseDayStart(searchParams.get("to")) ?? from;

  if (from > to) {
    return NextResponse.json(
      { error: "A data inicial não pode ser maior que a final." },
      { status: 400 },
    );
  }

  const { reports, totals } = await buildQueueReports(from, endOfDay(to));

  return NextResponse.json({
    from: formatDay(from),
    to: formatDay(to),
    queues: reports,
    totals,
  });
}
