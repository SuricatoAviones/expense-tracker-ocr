import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface DolarApiRate {
  fuente?: string;
  nombre?: string;
  compra?: number;
  venta?: number;
  promedio?: number;
  fechaActualizacion?: string;
}

function parseRateValue(rate: DolarApiRate): number | null {
  const candidates = [rate.promedio, rate.venta, rate.compra];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const officialUrl = "https://ve.dolarapi.com/v1/dolares/oficial";
    const allRatesUrl = "https://ve.dolarapi.com/v1/dolares";

    const officialRes = await fetch(officialUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    let selected: DolarApiRate | null = null;

    if (officialRes.ok) {
      const officialData = (await officialRes.json()) as DolarApiRate;
      selected = officialData;
    } else {
      const allRes = await fetch(allRatesUrl, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (!allRes.ok) {
        return NextResponse.json({ error: "No se pudo consultar DolarApi" }, { status: 502 });
      }

      const allData = (await allRes.json()) as DolarApiRate[];
      selected =
        allData.find((item) => {
          const source = `${item.fuente || ""} ${item.nombre || ""}`.toLowerCase();
          return source.includes("bcv") || source.includes("oficial");
        }) || allData[0] || null;
    }

    if (!selected) {
      return NextResponse.json({ error: "Sin datos de tasa BCV" }, { status: 502 });
    }

    const rate = parseRateValue(selected);
    if (!rate) {
      return NextResponse.json({ error: "Formato de tasa invalido" }, { status: 502 });
    }

    return NextResponse.json({
      source: "BCV",
      provider: "DolarApi",
      rate,
      buy: selected.compra ?? null,
      sell: selected.venta ?? null,
      average: selected.promedio ?? null,
      updatedAt: selected.fechaActualizacion ?? null,
      pair: "USD/VES",
    });
  } catch (error) {
    console.error("BCV rate error:", error);
    return NextResponse.json({ error: "Error al consultar tasa BCV" }, { status: 500 });
  }
}
