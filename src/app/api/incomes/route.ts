import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCurrency } from "@/lib/currency";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  const accountId = url.searchParams.get("accountId");
  const currency = url.searchParams.get("currency");

  const where: Record<string, unknown> = { userId: session.id };

  if (month && year) {
    const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const endDate = new Date(Date.UTC(Number(year), Number(month), 1));
    where.date = { gte: startDate, lt: endDate };
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (currency) {
    where.currency = parseCurrency(currency);
  }

  const incomes = await prisma.income.findMany({
    where,
    include: { account: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(incomes);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const { amount, description, date, accountId } = body;

    if (!amount || !description || !accountId) {
      return NextResponse.json({ error: "Campos requeridos: amount, description, accountId" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({ where: { id: accountId, userId: session.id } });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no valida" }, { status: 400 });
    }

    const income = await prisma.income.create({
      data: {
        amount: Number(amount),
        currency: account.currency,
        description,
        date: date ? new Date(date) : new Date(),
        accountId,
        userId: session.id,
      },
      include: { account: true },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear ingreso" }, { status: 500 });
  }
}
