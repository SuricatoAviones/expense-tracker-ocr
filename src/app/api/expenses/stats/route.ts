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

  // Current month expenses
  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.id,
      date: { gte: startDate, lt: endDate },
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  // Current month incomes
  const incomes = await prisma.income.findMany({
    where: {
      userId: session.id,
      date: { gte: startDate, lt: endDate },
    },
    include: { account: true },
    orderBy: { date: "desc" },
  });

  const accounts = await prisma.account.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "asc" },
  });

  // Previous month for comparison
  const prevStart = new Date(Date.UTC(year, month - 2, 1));
  const prevEnd = new Date(Date.UTC(year, month - 1, 1));
  const prevExpenses = await prisma.expense.findMany({
    where: {
      userId: session.id,
      date: { gte: prevStart, lt: prevEnd },
    },
  });
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);

  const prevIncomes = await prisma.income.findMany({
    where: {
      userId: session.id,
      date: { gte: prevStart, lt: prevEnd },
    },
  });
  const prevIncomeTotal = prevIncomes.reduce((s, i) => s + i.amount, 0);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const incomeTotal = incomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = incomeTotal - total;
  const prevBalance = prevIncomeTotal - prevTotal;
  const savingsRate = incomeTotal > 0 ? (balance / incomeTotal) * 100 : null;

  const byAccountMap = new Map<string, { account: string; income: number; expense: number; net: number }>();
  for (const income of incomes) {
    const name = income.account?.name || "Sin cuenta";
    const current = byAccountMap.get(name) || { account: name, income: 0, expense: 0, net: 0 };
    current.income += income.amount;
    current.net = current.income - current.expense;
    byAccountMap.set(name, current);
  }
  for (const expense of expenses) {
    const name = expense.account?.name || "Sin cuenta";
    const current = byAccountMap.get(name) || { account: name, income: 0, expense: 0, net: 0 };
    current.expense += expense.amount;
    current.net = current.income - current.expense;
    byAccountMap.set(name, current);
  }
  const byAccount = Array.from(byAccountMap.values()).sort((a, b) => b.net - a.net);

  const byCategory = expenses.reduce<Record<string, { name: string; color: string; total: number; count: number }>>((acc, e) => {
    const key = e.category.name;
    if (!acc[key]) acc[key] = { name: key, color: e.category.color, total: 0, count: 0 };
    acc[key].total += e.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  // Daily totals - fill all days of the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const maxDay = (year === today.getFullYear() && month === today.getMonth() + 1)
    ? today.getDate()
    : daysInMonth;

  const dailyMap = expenses.reduce<Record<string, number>>((acc, e) => {
    const day = e.date.toISOString().split("T")[0];
    acc[day] = (acc[day] || 0) + e.amount;
    return acc;
  }, {});

  const dailyTotals: { date: string; amount: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let d = 1; d <= maxDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const amount = dailyMap[dateStr] || 0;
    cumulative += amount;
    dailyTotals.push({ date: dateStr, amount, cumulative });
  }

  // Weekly totals (last 4 weeks)
  const weeklyTotals: { week: string; amount: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const wEnd = new Date(today);
    wEnd.setDate(today.getDate() - w * 7);
    const wStart = new Date(wEnd);
    wStart.setDate(wEnd.getDate() - 6);
    const weekAmount = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d >= wStart && d <= wEnd;
      })
      .reduce((s, e) => s + e.amount, 0);
    const label = `${wStart.getDate()}/${wStart.getMonth() + 1}-${wEnd.getDate()}/${wEnd.getMonth() + 1}`;
    weeklyTotals.push({ week: label, amount: weekAmount });
  }

  // Budgets and alerts
  const budgets = await prisma.budget.findMany({
    where: { userId: session.id, month, year },
    include: { category: true },
  });

  const alerts = budgets
    .map((b) => {
      const spent = byCategory[b.category.name]?.total || 0;
      const pct = (spent / b.amount) * 100;
      return { category: b.category.name, budget: b.amount, spent, percentage: Math.round(pct) };
    })
    .filter((a) => a.percentage >= 80);

  // Recent expenses (last 10)
  const recentExpenses = expenses.slice(0, 10).map((e) => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    date: e.date.toISOString(),
    receipt: e.receipt,
    category: { name: e.category.name, color: e.category.color },
  }));

  // Top expense
  const topExpense = expenses.length
    ? expenses.reduce((max, e) => (e.amount > max.amount ? e : max))
    : null;

  const topIncome = incomes.length
    ? incomes.reduce((max, i) => (i.amount > max.amount ? i : max))
    : null;

  const recentIncomes = incomes.slice(0, 10).map((i) => ({
    id: i.id,
    amount: i.amount,
    description: i.description,
    date: i.date.toISOString(),
    account: i.account?.name || "Sin cuenta",
  }));

  const [incomeByAccountAllTime, expenseByAccountAllTime] = await Promise.all([
    prisma.income.groupBy({
      by: ["accountId"],
      where: { userId: session.id },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["accountId"],
      where: { userId: session.id },
      _sum: { amount: true },
    }),
  ]);

  const allIncomeMap = new Map<string, number>();
  for (const row of incomeByAccountAllTime) {
    if (row.accountId) allIncomeMap.set(row.accountId, row._sum.amount || 0);
  }

  const allExpenseMap = new Map<string, number>();
  for (const row of expenseByAccountAllTime) {
    if (row.accountId) allExpenseMap.set(row.accountId, row._sum.amount || 0);
  }

  const accountStats = accounts.map((account) => {
    const incomeAcc = allIncomeMap.get(account.id) || 0;
    const expenseAcc = allExpenseMap.get(account.id) || 0;
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      incomeTotal: incomeAcc,
      expenseTotal: expenseAcc,
      currentBalance: account.initialBalance + incomeAcc - expenseAcc,
    };
  }).sort((a, b) => b.currentBalance - a.currentBalance);

  const netWorth = accountStats.reduce((sum, acc) => sum + acc.currentBalance, 0);

  // All-time recent (when current month is empty, show latest expenses regardless of month)
  let allTimeRecent: typeof recentExpenses = [];
  if (expenses.length === 0) {
    const latest = await prisma.expense.findMany({
      where: { userId: session.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 10,
    });
    allTimeRecent = latest.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      date: e.date.toISOString(),
      receipt: e.receipt,
      category: { name: e.category.name, color: e.category.color },
    }));
  }

  return NextResponse.json({
    total,
    prevTotal,
    incomeTotal,
    prevIncomeTotal,
    balance,
    prevBalance,
    savingsRate,
    count: expenses.length,
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
    byAccount,
    accountStats,
    netWorth,
    dailyTotals,
    weeklyTotals,
    alerts,
    recentExpenses,
    recentIncomes,
    topExpense: topExpense
      ? { amount: topExpense.amount, description: topExpense.description, category: topExpense.category.name }
      : null,
    topIncome: topIncome
      ? { amount: topIncome.amount, description: topIncome.description, account: topIncome.account?.name || "Sin cuenta" }
      : null,
    allTimeRecent,
  });
}
