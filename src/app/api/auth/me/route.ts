import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ staff: null }, { status: 401 });
  }

  const staff = await prisma.staff.findUnique({
    where: { id: session.staffId },
    select: { id: true, name: true, username: true },
  });

  if (!staff) {
    return NextResponse.json({ staff: null }, { status: 401 });
  }

  return NextResponse.json({ staff });
}
