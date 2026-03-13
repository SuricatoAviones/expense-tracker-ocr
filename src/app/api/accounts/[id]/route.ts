import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCurrency } from "@/lib/currency";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const exists = await prisma.account.findFirst({ where: { id, userId: session.id } });
  if (!exists) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  try {
    const body = await req.json();
    const nextKind: "NATIONAL" | "INTERNATIONAL" = body.kind
      ? (String(body.kind).toUpperCase() === "INTERNATIONAL" ? "INTERNATIONAL" : "NATIONAL")
      : exists.kind;
    const parsedCurrency = body.currency ? parseCurrency(body.currency) : exists.currency;

    if (nextKind === "INTERNATIONAL" && parsedCurrency !== "USD") {
      return NextResponse.json(
        { error: "Las cuentas internacionales solo pueden ser en USD" },
        { status: 400 }
      );
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        type: body.type ? String(body.type).trim() : undefined,
        kind: body.kind ? nextKind : undefined,
        currency: body.currency ? parsedCurrency : undefined,
        initialBalance: body.initialBalance !== undefined ? Number(body.initialBalance) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la cuenta" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const exists = await prisma.account.findFirst({ where: { id, userId: session.id } });
  if (!exists) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const [incomeCount, expenseCount, transferCount] = await Promise.all([
    prisma.income.count({ where: { userId: session.id, accountId: id } }),
    prisma.expense.count({ where: { userId: session.id, accountId: id } }),
    prisma.transfer.count({ where: { userId: session.id, OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
  ]);

  if (incomeCount > 0 || expenseCount > 0 || transferCount > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene ingresos, gastos o transferencias asociadas" },
      { status: 400 }
    );
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
