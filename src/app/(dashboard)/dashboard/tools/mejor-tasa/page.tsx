"use client";

import { useMemo, useState } from "react";

interface BcvResponse {
  rate: number;
  updatedAt: string | null;
}

interface BinanceResponse {
  medianPrice: number;
  bestPrice: number;
  averagePrice: number;
  updatedAt: string;
  transAmount?: string | null;
  payTypes?: string[];
}

type InputMode = "USD" | "VES";
type MerchantUsdtMode = "RATE" | "DIRECT";

export default function MejorTasaPage() {
  const [mode, setMode] = useState<InputMode>("USD");
  const [merchantUsdtMode, setMerchantUsdtMode] = useState<MerchantUsdtMode>("RATE");
  const [amount, setAmount] = useState("100");
  const [merchantBsRate, setMerchantBsRate] = useState("0");
  const [merchantUsdtRate, setMerchantUsdtRate] = useState("1");
  const [merchantUsdtDirect, setMerchantUsdtDirect] = useState("0");
  const [payTypesInput, setPayTypesInput] = useState("");
  const [p2pRate, setP2pRate] = useState("0");
  const [commissionPct, setCommissionPct] = useState("0");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [lastTransAmountSent, setLastTransAmountSent] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount);
  const bsRate = Number(merchantBsRate);
  const usdtRate = Number(merchantUsdtRate);
  const usdtDirectQuoted = Number(merchantUsdtDirect);
  const p2p = Number(p2pRate);
  const commission = Number(commissionPct);

  const calc = useMemo(() => {
    const baseValid = [numericAmount, bsRate, p2p, commission].every((n) => Number.isFinite(n) && n >= 0);
    if (!baseValid || numericAmount <= 0 || bsRate <= 0 || p2p <= 0) return null;

    const hasRate = Number.isFinite(usdtRate) && usdtRate > 0;
    const hasDirect = Number.isFinite(usdtDirectQuoted) && usdtDirectQuoted > 0;
    if (merchantUsdtMode === "RATE" && !hasRate) return null;
    if (merchantUsdtMode === "DIRECT" && !hasDirect) return null;

    const usdAmount = mode === "USD" ? numericAmount : numericAmount / bsRate;
    const vesAmount = mode === "VES" ? numericAmount : numericAmount * bsRate;

    const usdtDirect = merchantUsdtMode === "DIRECT" ? usdtDirectQuoted : usdAmount * usdtRate;
    const usdtViaP2PBase = vesAmount / p2p;
    const usdtViaP2PTotal = usdtViaP2PBase * (1 + commission / 100);

    const savings = usdtDirect - usdtViaP2PTotal;
    const savingsPct = (savings / usdtDirect) * 100;

    return {
      usdAmount,
      vesAmount,
      usdtDirect,
      usdtViaP2PBase,
      usdtViaP2PTotal,
      savings,
      savingsPct,
      recommendation:
        savings > 0
          ? "Conviene vender USDT en P2P y pagar en bolivares"
          : savings < 0
            ? "Conviene pagar directo en USDT"
            : "Ambas opciones son equivalentes",
    };
  }, [numericAmount, bsRate, usdtRate, usdtDirectQuoted, p2p, commission, mode, merchantUsdtMode]);

  async function loadRates() {
    setLoadingRates(true);
    setError("");
    setLastTransAmountSent(null);

    try {
      const bcvRes = await fetch("/api/rates/bcv", { cache: "no-store" });
      const bcvData = (await bcvRes.json()) as BcvResponse | { error?: string };

      if (!bcvRes.ok || !("rate" in bcvData)) {
        throw new Error((bcvData as { error?: string }).error || "No se pudo consultar BCV");
      }

      const params = new URLSearchParams();
      const normalizedPayTypes = payTypesInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const effectiveBsRate = bsRate > 0 ? bsRate : bcvData.rate;
      const transAmountBs = mode === "VES" ? numericAmount : numericAmount * effectiveBsRate;
      if (Number.isFinite(transAmountBs) && transAmountBs > 0) {
        params.set("transAmount", transAmountBs.toFixed(2));
      }

      if (normalizedPayTypes.length > 0) {
        params.set("payTypes", normalizedPayTypes.join(","));
      }

      const p2pUrl = `/api/rates/binance-p2p${params.toString() ? `?${params.toString()}` : ""}`;

      const p2pRes = await fetch(p2pUrl, { cache: "no-store" });
      const p2pData = (await p2pRes.json()) as BinanceResponse | { error?: string };

      if (!p2pRes.ok || !("bestPrice" in p2pData)) {
        throw new Error((p2pData as { error?: string }).error || "No se pudo consultar Binance P2P");
      }

      setMerchantBsRate(bcvData.rate.toFixed(2));
      setP2pRate(p2pData.bestPrice.toFixed(2));
      setLastUpdate(p2pData.updatedAt || bcvData.updatedAt || new Date().toISOString());
      setLastTransAmountSent(p2pData.transAmount || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron actualizar las tasas";
      setError(message);
    } finally {
      setLoadingRates(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mejor tasa</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compara pagar directo en USDT vs vender en Binance P2P y pagar en bolivares.
          </p>
        </div>
        <button
          onClick={loadRates}
          disabled={loadingRates}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {loadingRates ? "Actualizando..." : "Cargar tasas BCV + Binance"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="font-semibold">Datos de compra</h2>

          <div>
            <label className="text-sm font-medium">Formato de entrada</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as InputMode)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="USD">Monto en USD</option>
              <option value="VES">Monto en VES</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Monto ({mode})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tasa del comercio en bolivares (VES por USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={merchantBsRate}
              onChange={(e) => setMerchantBsRate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Como te cotiza el negocio en USDT</label>
            <select
              value={merchantUsdtMode}
              onChange={(e) => setMerchantUsdtMode(e.target.value as MerchantUsdtMode)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="RATE">Con tasa (USDT por USD)</option>
              <option value="DIRECT">Con precio final en USDT</option>
            </select>
          </div>

          {merchantUsdtMode === "RATE" ? (
            <div>
              <label className="text-sm font-medium">Tasa del comercio en USDT (USDT por USD)</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={merchantUsdtRate}
                onChange={(e) => setMerchantUsdtRate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Precio final del negocio en USDT</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={merchantUsdtDirect}
                onChange={(e) => setMerchantUsdtDirect(e.target.value)}
                className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Puedes comparar usando tasa USDT/USD o pegando directamente el monto en USDT que te dio el negocio.
          </p>

          <div>
            <label className="text-sm font-medium">Filtro payTypes Binance (separados por coma)</label>
            <input
              type="text"
              value={payTypesInput}
              onChange={(e) => setPayTypesInput(e.target.value)}
              placeholder="Ej: PagoMovil,Banesco"
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Opcional. Si lo dejas vacio, Binance busca sin filtrar metodos de pago.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Tasa Binance P2P (VES por USDT)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={p2pRate}
              onChange={(e) => setP2pRate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Comision total de salida (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          {lastUpdate && (
            <p className="text-xs text-gray-400">Ultima actualizacion: {new Date(lastUpdate).toLocaleString()}</p>
          )}
          {Number.isFinite(mode === "VES" ? numericAmount : numericAmount * bsRate) && (mode === "VES" ? numericAmount : numericAmount * bsRate) > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              transAmount local estimado: {(mode === "VES" ? numericAmount : numericAmount * bsRate).toFixed(2)} VES
            </p>
          )}
          {lastTransAmountSent && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              transAmount recibido en respuesta: {lastTransAmountSent} VES
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="font-semibold">Comparacion</h2>

          {!calc && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa todos los valores para calcular la mejor opcion.
            </p>
          )}

          {calc && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Referencia en USD</p>
                  <p className="text-lg font-semibold">{calc.usdAmount.toFixed(2)} USD</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pago en bolivares</p>
                  <p className="text-lg font-semibold">{calc.vesAmount.toFixed(2)} VES</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">USDT directo al comercio</p>
                  <p className="text-lg font-semibold">{calc.usdtDirect.toFixed(4)} USDT</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">USDT via P2P + comision</p>
                  <p className="text-lg font-semibold">{calc.usdtViaP2PTotal.toFixed(4)} USDT</p>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  calc.savings > 0
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700"
                    : calc.savings < 0
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                }`}
              >
                <p className="text-sm font-medium">{calc.recommendation}</p>
                <p className="text-sm mt-1">
                  Diferencia: {calc.savings.toFixed(4)} USDT ({calc.savingsPct.toFixed(2)}%)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
