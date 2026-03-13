import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCurrency } from "@/lib/currency";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    accounts.map(async (account) => {
      const [incomeAgg, expenseAgg, sentTransferAgg, receivedTransferAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId: session.id, accountId: account.id, currency: account.currency },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId: session.id, accountId: account.id, currency: account.currency },
          _sum: { amount: true },
        }),
        prisma.transfer.aggregate({
          where: { userId: session.id, fromAccountId: account.id, sourceCurrency: account.currency },
          _sum: { sentAmount: true, feeAmount: true },
        }),
        prisma.transfer.aggregate({
          where: { userId: session.id, toAccountId: account.id, targetCurrency: account.currency },
          _sum: { receivedAmount: true },
        }),
      ]);

      const incomeTotal = incomeAgg._sum?.amount || 0;
      const expenseTotal = expenseAgg._sum?.amount || 0;
      const sentTotal = sentTransferAgg._sum?.sentAmount || 0;
      const transferFeeTotal = sentTransferAgg._sum?.feeAmount || 0;
      const receivedTotal = receivedTransferAgg._sum?.receivedAmount || 0;

      return {
        ...account,
        incomeTotal,
        expenseTotal,
        transferSentTotal: sentTotal,
        transferFeeTotal,
        transferReceivedTotal: receivedTotal,
        currentBalance: account.initialBalance + incomeTotal - expenseTotal - sentTotal - transferFeeTotal + receivedTotal,
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
    const { name, type, initialBalance, currency } = body;
    const kindInput = body.kind ? String(body.kind).toUpperCase() : "NATIONAL";
    const kind = kindInput === "INTERNATIONAL" ? "INTERNATIONAL" : "NATIONAL";
    const parsedCurrency = parseCurrency(currency);

    if (kind === "INTERNATIONAL" && parsedCurrency !== "USD") {
      return NextResponse.json(
        { error: "Las cuentas internacionales solo pueden ser en USD" },
        { status: 400 }
      );
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        name: String(name).trim(),
        type: type ? String(type).trim() : "bank",
        kind,
        currency: parsedCurrency,
        initialBalance: initialBalance ? Number(initialBalance) : 0,
        userId: session.id,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 400 });
  }
}
