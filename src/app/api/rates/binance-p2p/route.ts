import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface BinanceAdv {
  price?: string;
  minSingleTransAmount?: string;
  maxSingleTransAmount?: string;
}

interface BinanceAdvertiser {
  nickName?: string;
  userNo?: string;
}

interface BinanceItem {
  adv?: BinanceAdv;
  advertiser?: BinanceAdvertiser;
}

interface BinanceResponse {
  code?: string;
  message?: string;
  data?: BinanceItem[];
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const rows = Math.min(Number(url.searchParams.get("rows") || "10"), 20);
  const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
  const transAmountRaw = url.searchParams.get("transAmount");
  const transAmountValue = transAmountRaw ? Number(transAmountRaw) : null;
  const transAmount =
    transAmountValue !== null && Number.isFinite(transAmountValue) && transAmountValue > 0
      ? transAmountValue.toFixed(2)
      : undefined;
  const payTypesParam = url.searchParams.get("payTypes") || "";
  const payTypes = payTypesParam
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  try {
    const body = {
      asset: "USDT",
      fiat: "VES",
      tradeType: "SELL",
      publisherType: "merchant",
      page,
      rows,
      transAmount,
      payTypes,
    };

    const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: 20 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar Binance P2P" }, { status: 502 });
    }

    const payload = (await res.json()) as BinanceResponse;
    const rowsData = payload.data || [];

    const offers = rowsData
      .map((item) => {
        const price = toNumber(item.adv?.price);
        if (!price || price <= 0) return null;
        return {
          price,
          min: toNumber(item.adv?.minSingleTransAmount),
          max: toNumber(item.adv?.maxSingleTransAmount),
          merchant: item.advertiser?.nickName || item.advertiser?.userNo || "Anuncio",
        };
      })
      .filter((item): item is { price: number; min: number | null; max: number | null; merchant: string } => !!item);

    if (offers.length === 0) {
      return NextResponse.json({ error: "Sin ofertas P2P disponibles" }, { status: 502 });
    }

    const prices = offers.map((o) => o.price);
    const bestPrice = Math.max(...prices);
    const medianPrice = median(prices);
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return NextResponse.json({
      source: "Binance P2P",
      pair: "USDT/VES",
      tradeType: "SELL",
      publisherType: "merchant",
      rowsRequested: rows,
      page,
      transAmount: transAmount || null,
      payTypes,
      count: offers.length,
      bestPrice,
      medianPrice,
      averagePrice,
      offers,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Binance P2P rate error:", error);
    return NextResponse.json({ error: "Error al consultar Binance P2P" }, { status: 500 });
  }
}
