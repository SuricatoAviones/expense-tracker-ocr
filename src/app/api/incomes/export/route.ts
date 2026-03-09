import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const month = Number(url.searchParams.get("month") || new Date().getMonth() + 1);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const incomes = await prisma.income.findMany({
    where: { userId: session.id, date: { gte: startDate, lt: endDate } },
    orderBy: { date: "asc" },
  });

  const header = "Fecha,Descripcion,Monto\n";
  const rows = incomes
    .map((i) => {
      const date = i.date.toISOString().split("T")[0];
      const desc = i.description.replace(/,/g, ";");
      return `${date},${desc},${i.amount.toFixed(2)}`;
    })
    .join("\n");

  const total = incomes.reduce((s, i) => s + i.amount, 0);
  const footer = `\n\nTotal,,${total.toFixed(2)}`;

  const csv = header + rows + footer;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=\"ingresos-${year}-${String(month).padStart(2, "0")}.csv\"`,
    },
  });
}
