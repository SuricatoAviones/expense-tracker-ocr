import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const categoryId = url.searchParams.get("categoryId");
  const accountId = url.searchParams.get("accountId");

  const where: Record<string, unknown> = { userId: session.id };

  if (month && year) {
    const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endDate = new Date(Date.UTC(Number(year), Number(month), 1));
    where.date = { gte: startDate, lt: endDate };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, description, date, categoryId, accountId, ocrText, receipt } = body;

    if (!amount || !description || !categoryId || !accountId) {
      return NextResponse.json({ error: "Campos requeridos: amount, description, categoryId, accountId" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({ where: { id: accountId, userId: session.id } });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no valida" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        description,
        date: date ? new Date(date) : new Date(),
        categoryId,
        accountId,
        receipt: receipt || null,
        ocrText: ocrText || null,
        userId: session.id,
      },
      include: { category: true, account: true },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear gasto" }, { status: 500 });
  }
}
