import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const income = await prisma.income.findFirst({ where: { id, userId: session.id } });
  if (!income) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const income = await prisma.income.findFirst({ where: { id, userId: session.id } });
  if (!income) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.income.update({
    where: { id },
    data: {
      amount: body.amount ? Number(body.amount) : undefined,
      description: body.description || undefined,
      date: body.date ? new Date(body.date) : undefined,
    },
  });

  return NextResponse.json(updated);
}
