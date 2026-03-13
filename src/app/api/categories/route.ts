import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.id },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true }, orderBy: { name: "asc" } },
    },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, icon, color, parentId } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, userId: session.id } });
    if (!parent) {
      return NextResponse.json({ error: "La categoria padre no es valida" }, { status: 400 });
    }
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon || "tag",
        color: color || "#6366f1",
        userId: session.id,
        parentId: parentId || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "La categoria ya existe" }, { status: 400 });
  }
}
