import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRANSFER_FEE_CATEGORY_NAME = "Comisiones y tasas";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const transfers = await prisma.transfer.findMany({
    where: { userId: session.id },
    include: {
      fromAccount: { select: { id: true, name: true, currency: true, kind: true } },
      toAccount: { select: { id: true, name: true, currency: true, kind: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transfers);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const fromAccountId = String(body.fromAccountId || "");
    const toAccountId = String(body.toAccountId || "");
    const sentAmount = Number(body.sentAmount || 0);
    const receivedAmount = Number(body.receivedAmount || 0);
    const feeAmount = Number(body.feeAmount || 0);
    const note = body.note ? String(body.note).trim() : null;
    const date = body.date ? new Date(body.date) : new Date();

    if (!fromAccountId || !toAccountId) {
      return NextResponse.json({ error: "Debes seleccionar cuenta origen y destino" }, { status: 400 });
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: "La cuenta origen y destino no pueden ser la misma" }, { status: 400 });
    }

    if (!Number.isFinite(sentAmount) || sentAmount <= 0) {
      return NextResponse.json({ error: "El monto enviado debe ser mayor a 0" }, { status: 400 });
    }

    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      return NextResponse.json({ error: "El monto recibido debe ser mayor a 0" }, { status: 400 });
    }

    if (!Number.isFinite(feeAmount) || feeAmount < 0) {
      return NextResponse.json({ error: "La comision/tasa no puede ser negativa" }, { status: 400 });
    }

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: fromAccountId, userId: session.id } }),
      prisma.account.findFirst({ where: { id: toAccountId, userId: session.id } }),
    ]);

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: "Cuenta origen o destino no valida" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let feeCategory = await tx.category.findFirst({
        where: { userId: session.id, name: TRANSFER_FEE_CATEGORY_NAME, parentId: null },
      });

      if (!feeCategory) {
        feeCategory = await tx.category.create({
          data: {
            userId: session.id,
            name: TRANSFER_FEE_CATEGORY_NAME,
            icon: "percent",
            color: "#f59e0b",
          },
        });
      }

      const transfer = await tx.transfer.create({
        data: {
          userId: session.id,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          sentAmount,
          receivedAmount,
          feeAmount,
          sourceCurrency: fromAccount.currency,
          targetCurrency: toAccount.currency,
          note,
          date,
        },
        include: {
          fromAccount: { select: { id: true, name: true, currency: true, kind: true } },
          toAccount: { select: { id: true, name: true, currency: true, kind: true } },
        },
      });

      if (feeAmount > 0) {
        await tx.expense.create({
          data: {
            userId: session.id,
            amount: feeAmount,
            currency: fromAccount.currency,
            description: note
              ? `Comision/tasa por transferencia: ${note}`
              : `Comision/tasa por transferencia a ${toAccount.name}`,
            date,
            categoryId: feeCategory.id,
            accountId: fromAccount.id,
          },
        });
      }

      return transfer;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo registrar la transferencia" }, { status: 400 });
  }
}
