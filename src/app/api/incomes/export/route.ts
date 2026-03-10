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

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const incomes = await prisma.income.findMany({
    where: { userId: session.id, currency, date: { gte: startDate, lt: endDate } },
    include: { account: true },
    orderBy: { date: "asc" },
  });

  const header = "Fecha,Descripcion,Cuenta,Moneda,Monto\n";
  const rows = incomes
    .map((i) => {
      const date = i.date.toISOString().split("T")[0];
      const desc = i.description.replace(/,/g, ";");
      const accountName = i.account?.name?.replace(/,/g, ";") || "Sin cuenta";
      return `${date},${desc},${accountName},${i.currency},${i.amount.toFixed(2)}`;
    })
    .join("\n");

  const total = incomes.reduce((s, i) => s + i.amount, 0);
  const footer = `\n\nTotal,,,${currency},${total.toFixed(2)}`;

  const csv = header + rows + footer;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=\"ingresos-${currency}-${year}-${String(month).padStart(2, "0")}.csv\"`,
    },
  });
}
