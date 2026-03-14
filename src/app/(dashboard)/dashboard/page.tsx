"use client";

import { useEffect, useState } from "react";
import { CurrencyCode, formatCurrency, getCurrencyLabel, SUPPORTED_CURRENCIES } from "@/lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  CartesianGrid, Legend,
} from "recharts";

interface RecentExpense {
  id: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  date: string;
  receipt: string | null;
  category: { name: string; color: string };
}

interface Stats {
  currency: CurrencyCode;
  total: number;
  prevTotal: number;
  incomeTotal: number;
  prevIncomeTotal: number;
  balance: number;
  prevBalance: number;
  savingsRate: number | null;
  count: number;
  byCategory: { name: string; color: string; total: number; count: number }[];
  byAccount: { account: string; income: number; expense: number; net: number }[];
  accountStats: {
    id: string;
    name: string;
    type: string;
    initialBalance: number;
    incomeTotal: number;
    expenseTotal: number;
    currentBalance: number;
  }[];
  netWorth: number;
  dailyTotals: { date: string; amount: number; cumulative: number }[];
  weeklyTotals: { week: string; amount: number }[];
  alerts: { category: string; budget: number; spent: number; percentage: number }[];
  recentExpenses: RecentExpense[];
  recentIncomes: { id: string; amount: number; currency: CurrencyCode; description: string; date: string; account: string }[];
  topExpense: { amount: number; description: string; category: string } | null;
  topIncome: { amount: number; description: string; account: string } | null;
  allTimeRecent: RecentExpense[];
}

const monthShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetch(`/api/expenses/stats?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setStats);
  }, [month, year]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  if (!stats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-white/5" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-gray-200 dark:bg-white/5" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-gray-200 dark:bg-white/5" />
      </div>
    );
  }

  const monthDiff = stats.prevTotal > 0
    ? Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 100)
    : null;
  const incomeDiff = stats.prevIncomeTotal > 0
    ? Math.round(((stats.incomeTotal - stats.prevIncomeTotal) / stats.prevIncomeTotal) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {monthShort[month - 1]}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/8 bg-gray-100 dark:bg-white/5 text-xs font-medium text-gray-600 dark:text-gray-400">
              {year}
            </span>
            {stats.alerts.length > 0 && (
              <span className="px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
                {stats.alerts.length} alerta{stats.alerts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Budget alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((a) => (
            <div
              key={a.category}
              className={`p-3 rounded-lg text-sm font-medium ${
                a.percentage >= 100
                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
              }`}
            >
              {a.percentage >= 100 ? "Excedido" : "Alerta"}: {a.category} - Gastado ${a.spent.toFixed(2)} de ${a.budget.toFixed(2)} ({a.percentage}%)
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total del Mes</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">${stats.total.toFixed(2)}</p>
          {monthDiff !== null && (
            <p className={`text-xs mt-1 font-medium ${monthDiff > 0 ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}>
              {monthDiff > 0 ? "+" : ""}{monthDiff}% vs mes anterior
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transacciones</p>
          <p className="text-3xl font-bold">{stats.count}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.byCategory.length} categorias</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Promedio por Gasto</p>
          <p className="text-3xl font-bold">${stats.count ? (stats.total / stats.count).toFixed(2) : "0.00"}</p>
          <p className="text-xs text-gray-400 mt-1">por transaccion</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Mayor Gasto</p>
          {stats.topExpense ? (
            <>
              <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">${stats.topExpense.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1 truncate">{stats.topExpense.description}</p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-gray-400 dark:text-gray-600 text-xs">
              Sin datos este mes
            </div>
          )}
        </div>
      </div>

      {/* Charts row 1: Cumulative area + Daily bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gasto Acumulado del Mes</h2>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.dailyTotals}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "cumulative" ? "Acumulado" : "Dia"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={2} fill="url(#colorCumulative)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gastos por Dia</h2>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.dailyTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(8)} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Monto"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>
      </div>

      {/* Charts row 2: Pie + Horizontal bars by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Distribucion por Categoria</h2>
          {stats.byCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.byCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    strokeWidth={2}
                  >
                    {stats.byCategory.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm flex-1">
                {stats.byCategory.map((c) => {
                  const pct = stats.total > 0 ? Math.round((c.total / stats.total) * 100) : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">${c.total.toFixed(2)}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Comparativa por Categoria</h2>
          {stats.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                  contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {stats.byCategory.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No hay datos este mes</p>
          )}
        </div>
      </div>

      {/* Weekly comparison */}
      {stats.weeklyTotals.some((w) => w.amount > 0) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Gastos por Semana</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="amount" name="Gasto semanal" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
