"use client";

import { useEffect, useState } from "react";

interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  incomeTotal: number;
  expenseTotal: number;
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
  const [form, setForm] = useState({ name: "", type: "bank", initialBalance: "0" });
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
          initialBalance: Number(form.initialBalance || 0),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }

      setForm({ name: "", type: "bank", initialBalance: "0" });
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
      initialBalance: String(account.initialBalance),
    });
    setError("");
  }

  function handleCancel() {
    setEditId(null);
    setForm({ name: "", type: "bank", initialBalance: "0" });
    setError("");
  }

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <input
            type="number"
            step="0.01"
            placeholder="Saldo inicial"
            value={form.initialBalance}
            onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
          />
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
                    Tipo: {accountTypes.find((t) => t.value === account.type)?.label || "Otra"}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo actual</p>
                    <p className={`font-semibold ${account.currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      ${account.currentBalance.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      +${account.incomeTotal.toFixed(2)} / -${account.expenseTotal.toFixed(2)}
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
