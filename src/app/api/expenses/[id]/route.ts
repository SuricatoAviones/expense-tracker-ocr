import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCurrency } from "@/lib/currency";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findFirst({ where: { id, userId: session.id } });
  if (!expense) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const expense = await prisma.expense.findFirst({ where: { id, userId: session.id } });
  if (!expense) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  const body = await req.json();

  let accountCurrency: "USD" | "VES" | undefined;
  if (body.accountId) {
    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId: session.id } });
    if (!account) return NextResponse.json({ error: "Cuenta no valida" }, { status: 400 });
    accountCurrency = account.currency;
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      amount: body.amount ? Number(body.amount) : undefined,
      currency: accountCurrency || (body.currency ? parseCurrency(body.currency) : undefined),
      description: body.description || undefined,
      date: body.date ? new Date(body.date) : undefined,
      categoryId: body.categoryId || undefined,
      accountId: body.accountId || undefined,
    },
    include: { category: true, account: true },
  });

  return NextResponse.json(updated);
}
