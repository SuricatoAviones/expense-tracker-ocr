import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    accounts.map(async (account) => {
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId: session.id, accountId: account.id },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId: session.id, accountId: account.id },
          _sum: { amount: true },
        }),
      ]);

      const incomeTotal = incomeAgg._sum?.amount || 0;
      const expenseTotal = expenseAgg._sum?.amount || 0;

      return {
        ...account,
        incomeTotal,
        expenseTotal,
        currentBalance: account.initialBalance + incomeTotal - expenseTotal,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, type, initialBalance } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        name: String(name).trim(),
        type: type ? String(type).trim() : "bank",
        initialBalance: initialBalance ? Number(initialBalance) : 0,
        userId: session.id,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 400 });
  }
}
