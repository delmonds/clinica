import { NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/appointments";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const appointment = await cancelAppointment(id);
  if (!appointment) {
    return NextResponse.json(
      { error: "Consulta não encontrada ou que já saiu da agenda." },
      { status: 409 },
    );
  }

  return NextResponse.json({ appointment });
}
