"use client";

import { useEffect, useMemo, useState } from "react";
import { CurrencyCode, formatCurrency, getCurrencyLabel } from "@/lib/currency";

interface Account {
  id: string;
  name: string;
  kind: "NATIONAL" | "INTERNATIONAL";
  currency: CurrencyCode;
}

interface Transfer {
  id: string;
  sentAmount: number;
  receivedAmount: number;
  feeAmount: number;
  note: string | null;
  date: string;
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  fromAccount: Account;
  toAccount: Account;
}

export default function TransfersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    sentAmount: "",
    receivedAmount: "",
    feeAmount: "0",
    date: "",
    note: "",
  });

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    loadTransfers();
  }, []);

  function loadTransfers() {
    fetch("/api/transfers").then((r) => r.json()).then(setTransfers);
  }

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === form.fromAccountId) || null,
    [accounts, form.fromAccountId]
  );

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === form.toAccountId) || null,
    [accounts, form.toAccountId]
  );

  const exchangeRate = useMemo(() => {
    const sent = Number(form.sentAmount || 0);
    const received = Number(form.receivedAmount || 0);
    if (!sent || !received) return null;
    return received / sent;
  }, [form.sentAmount, form.receivedAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: form.fromAccountId,
          toAccountId: form.toAccountId,
          sentAmount: Number(form.sentAmount || 0),
          receivedAmount: Number(form.receivedAmount || 0),
          feeAmount: Number(form.feeAmount || 0),
          date: form.date || undefined,
          note: form.note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No se pudo registrar la transferencia");
        return;
      }

      setForm({
        fromAccountId: "",
        toAccountId: "",
        sentAmount: "",
        receivedAmount: "",
        feeAmount: "0",
        date: "",
        note: "",
      });
      loadTransfers();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transferencias</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 space-y-4">
        <h2 className="font-semibold">Nueva transferencia entre cuentas</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={form.fromAccountId}
            onChange={(e) => setForm((prev) => ({ ...prev, fromAccountId: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          >
            <option value="">Cuenta origen</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.kind === "NATIONAL" ? "Nacional" : "Internacional"} - {getCurrencyLabel(a.currency)})
              </option>
            ))}
          </select>

          <select
            value={form.toAccountId}
            onChange={(e) => setForm((prev) => ({ ...prev, toAccountId: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          >
            <option value="">Cuenta destino</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.kind === "NATIONAL" ? "Nacional" : "Internacional"} - {getCurrencyLabel(a.currency)})
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            placeholder={`Monto enviado${fromAccount ? ` (${getCurrencyLabel(fromAccount.currency)})` : ""}`}
            value={form.sentAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, sentAmount: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />

          <input
            type="number"
            step="0.01"
            placeholder={`Monto recibido${toAccount ? ` (${getCurrencyLabel(toAccount.currency)})` : ""}`}
            value={form.receivedAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, receivedAmount: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder={`Comision/Tasa${fromAccount ? ` (${getCurrencyLabel(fromAccount.currency)})` : ""}`}
            value={form.feeAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, feeAmount: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />

          <input
            type="text"
            placeholder="Nota (opcional)"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            className="md:col-span-2 px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {exchangeRate !== null && fromAccount && toAccount && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tasa calculada: 1 {fromAccount.currency} = {exchangeRate.toFixed(4)} {toAccount.currency}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Registrar transferencia"}
        </button>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold">Historial ({transfers.length})</h2>
        </div>

        {transfers.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No hay transferencias registradas</p>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {transfers.map((t) => (
              <div key={t.id} className="p-4 space-y-1 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <p className="font-medium">
                  {t.fromAccount.name} ({getCurrencyLabel(t.sourceCurrency)}) {'->'} {t.toAccount.name} ({getCurrencyLabel(t.targetCurrency)})
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Enviado: {formatCurrency(t.sentAmount, t.sourceCurrency)} | Recibido: {formatCurrency(t.receivedAmount, t.targetCurrency)}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Comision/Tasa: {formatCurrency(t.feeAmount, t.sourceCurrency)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(t.date).toLocaleDateString("es-VE")} {t.note ? `- ${t.note}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
