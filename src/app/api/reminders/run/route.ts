import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { runDueReminders } from "@/lib/reminders";

/**
 * Chamado por um agendador externo (cron) a cada poucos minutos.
 *
 * Não usa a sessão da recepção — um cron não faz login. Em vez disso exige o
 * CRON_SECRET no cabeçalho Authorization, porque uma rota aberta aqui deixaria
 * qualquer um disparar mensagens no seu nome.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor." },
      { status: 500 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || !safeEqual(header.slice(7), secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const run = await runDueReminders();
    return NextResponse.json(run);
  } catch (error) {
    // Configuração inválida da régua não pode derrubar o cron em silêncio.
    console.error("[lembretes] falha ao processar a rodada:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao processar lembretes." },
      { status: 500 },
    );
  }
}
