"use client";

import { useEffect, useState } from "react";
import { CurrencyCode, formatCurrency, getCurrencyLabel, SUPPORTED_CURRENCIES } from "@/lib/currency";

interface Account {
  id: string;
  name: string;
  type: string;
  kind: "NATIONAL" | "INTERNATIONAL";
  currency: CurrencyCode;
  initialBalance: number;
  currentBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  transferSentTotal: number;
  transferFeeTotal: number;
  transferReceivedTotal: number;
}

const accountTypes = [
  { value: "bank", label: "Banco" },
  { value: "wallet", label: "Billetera" },
  { value: "digital", label: "Digital (PayPal, Wise, etc.)" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otra" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "bank",
    kind: "NATIONAL" as "NATIONAL" | "INTERNATIONAL",
    currency: "VES" as CurrencyCode,
    initialBalance: "0",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  function loadAccounts() {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editId ? `/api/accounts/${editId}` : "/api/accounts";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          kind: form.kind,
          currency: form.currency,
          initialBalance: Number(form.initialBalance || 0),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }

      setForm({ name: "", type: "bank", kind: "NATIONAL", currency: "VES", initialBalance: "0" });
      setEditId(null);
      loadAccounts();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta cuenta?")) return;
    setError("");

    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al eliminar");
      return;
    }

    loadAccounts();
  }

  function handleEdit(account: Account) {
    setEditId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      kind: account.kind,
      currency: account.currency,
      initialBalance: String(account.initialBalance),
    });
    setError("");
  }

  function handleCancel() {
    setEditId(null);
    setForm({ name: "", type: "bank", kind: "NATIONAL", currency: "VES", initialBalance: "0" });
    setError("");
  }

  const availableCurrencies = form.kind === "INTERNATIONAL"
    ? SUPPORTED_CURRENCIES.filter((c) => c === "USD")
    : SUPPORTED_CURRENCIES;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cuentas</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 space-y-4">
        <h2 className="font-semibold">{editId ? "Editar Cuenta" : "Nueva Cuenta"}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: para una cuenta nacional con Bs y USD (ej: Banco de Venezuela), crea dos cuentas con el mismo nombre y distinta moneda.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Nombre (ej: BBVA, PayPal, Wise)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={form.kind}
            onChange={(e) => {
              const kind = e.target.value as "NATIONAL" | "INTERNATIONAL";
              setForm((prev) => ({
                ...prev,
                kind,
                currency: kind === "INTERNATIONAL" ? "USD" : prev.currency,
              }));
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="NATIONAL">Nacional</option>
            <option value="INTERNATIONAL">Internacional</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Saldo inicial"
            value={form.initialBalance}
            onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            {availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {getCurrencyLabel(currency)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {editId ? "Actualizar" : "Agregar"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-semibold">Lista de Cuentas ({accounts.length})</h2>
        </div>
        {accounts.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No hay cuentas registradas</p>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.kind === "NATIONAL" ? "Nacional" : "Internacional"} - {accountTypes.find((t) => t.value === account.type)?.label || "Otra"} - {getCurrencyLabel(account.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo actual</p>
                    <p className={`font-semibold ${account.currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatCurrency(account.currentBalance, account.currency)}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      +{formatCurrency(account.incomeTotal, account.currency)} / -{formatCurrency(account.expenseTotal, account.currency)}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      T: -{formatCurrency(account.transferSentTotal + account.transferFeeTotal, account.currency)} / +{formatCurrency(account.transferReceivedTotal, account.currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEdit(account)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
