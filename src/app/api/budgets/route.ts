import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCurrency } from "@/lib/currency";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = Number(url.searchParams.get("month") || new Date().getMonth() + 1);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());
  const currency = parseCurrency(url.searchParams.get("currency"));

  const budgets = await prisma.budget.findMany({
    where: { userId: session.id, month, year, currency },
    include: { category: true },
  });

  return NextResponse.json(budgets);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { amount, categoryId, month, year, currency } = await req.json();
  const normalizedCurrency = parseCurrency(currency);

  if (!amount || !categoryId || !month || !year) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: session.id } });
  if (!category) {
    return NextResponse.json({ error: "Categoria no valida" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year_currency: {
        userId: session.id,
        categoryId: category.id,
        month: Number(month),
        year: Number(year),
        currency: normalizedCurrency,
      },
    },
    update: { amount: Number(amount) },
    create: {
      amount: Number(amount),
      currency: normalizedCurrency,
      categoryId: category.id,
      month: Number(month),
      year: Number(year),
      userId: session.id,
    },
    include: { category: true },
  });

  return NextResponse.json(budget);
}
