import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const queues = await prisma.queue.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    include: {
      tickets: {
        where: { status: { in: ["WAITING", "CALLED", "IN_SERVICE"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const data = queues.map((queue) => {
    const waiting = queue.tickets.filter((t) => t.status === "WAITING");
    const current = queue.tickets.find((t) => t.status === "IN_SERVICE" || t.status === "CALLED") ?? null;
    return {
      id: queue.id,
      name: queue.name,
      description: queue.description,
      defaultServiceMins: queue.defaultServiceMins,
      waitingCount: waiting.length,
      current,
      waiting,
    };
  });

  return NextResponse.json({ queues: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Nome da fila é obrigatório." }, { status: 400 });
  }

  const queue = await prisma.queue.create({
    data: {
      name,
      description: typeof body.description === "string" ? body.description.trim() : null,
      defaultServiceMins:
        typeof body.defaultServiceMins === "number" && body.defaultServiceMins > 0
          ? Math.round(body.defaultServiceMins)
          : 15,
    },
  });

  return NextResponse.json({ queue }, { status: 201 });
}
