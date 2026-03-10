"use client";

import { useMemo, useState } from "react";

interface BcvResponse {
  source: string;
  provider: string;
  rate: number;
  updatedAt: string | null;
}

export default function CalculadoraPage() {
  const [amount, setAmount] = useState("100");
  const [mode, setMode] = useState<"USD_TO_VES" | "VES_TO_USD">("USD_TO_VES");
  const [rate, setRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount);

  const result = useMemo(() => {
    if (!rate || !Number.isFinite(numericAmount) || numericAmount <= 0) return null;

    if (mode === "USD_TO_VES") {
      return {
        label: "VES",
        value: numericAmount * rate,
      };
    }

    return {
      label: "USD",
      value: numericAmount / rate,
    };
  }, [mode, numericAmount, rate]);

  async function refreshRate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rates/bcv", { cache: "no-store" });
      const data = (await res.json()) as BcvResponse | { error?: string };
      if (!res.ok || !("rate" in data)) {
        throw new Error((data as { error?: string }).error || "No se pudo obtener la tasa BCV");
      }
      setRate(data.rate);
      setUpdatedAt(data.updatedAt || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al consultar tasa BCV";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Calculadora BCV</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Convierte montos entre USD y VES usando la tasa oficial de referencia BCV.
          </p>
        </div>
        <button
          onClick={refreshRate}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Actualizando..." : "Actualizar tasa"}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Modo</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "USD_TO_VES" | "VES_TO_USD")}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="USD_TO_VES">USD a VES</option>
              <option value="VES_TO_USD">VES a USD</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Monto</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="Ingresa el monto"
            />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasa actual</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {rate ? `${rate.toFixed(2)} VES / USD` : "Sin tasa cargada"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {updatedAt ? `Actualizada: ${new Date(updatedAt).toLocaleString()}` : "Pulsa en Actualizar tasa para consultar BCV"}
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="p-5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">Resultado</p>
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">
            {result ? `${result.value.toFixed(2)} ${result.label}` : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
