import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  try {
    const { description, amount } = await req.json();

    const categories = await prisma.category.findMany({
      where: { userId: session.id },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    const categoryNames = categories.map((c) => c.name);

    if (categoryNames.length === 0) {
      return NextResponse.json({ error: "No tienes categorias creadas aun" }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: "Descripcion requerida" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un clasificador de gastos. Dada la descripcion de un gasto, responde SOLO con el nombre de la categoria mas apropiada. Las categorias disponibles son: ${categoryNames.join(", ")}. Responde unicamente con el nombre de la categoria, nada mas.`,
        },
        {
          role: "user",
          content: `Gasto: "${description}"${amount ? ` por $${amount}` : ""}`,
        },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const category = response.choices[0]?.message?.content?.trim() || categoryNames[0];
    const matched = categoryNames.find((c) => c.toLowerCase() === category.toLowerCase()) || categoryNames[0];

    return NextResponse.json({ category: matched });
  } catch (error) {
    console.error("Categorize error:", error);
    return NextResponse.json({ error: "No se pudo categorizar" }, { status: 400 });
  }
}
