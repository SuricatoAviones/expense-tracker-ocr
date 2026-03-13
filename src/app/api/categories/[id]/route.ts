import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { name, icon, color, parentId } = await req.json();

  const existing = await prisma.category.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });

  if (parentId && parentId === id) {
    return NextResponse.json({ error: "Una categoria no puede ser su propia padre" }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, userId: session.id } });
    if (!parent) {
      return NextResponse.json({ error: "La categoria padre no es valida" }, { status: 400 });
    }
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name, icon, color, parentId: parentId || null },
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la categoria" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.category.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });

  const childrenCount = await prisma.category.count({ where: { parentId: id, userId: session.id } });
  if (childrenCount > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene subcategorias asociadas" },
      { status: 400 }
    );
  }

  const expenses = await prisma.expense.count({ where: { categoryId: id, userId: session.id } });
  if (expenses > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene gastos asociados" },
      { status: 400 }
    );
  }

  const budgets = await prisma.budget.count({ where: { categoryId: id, userId: session.id } });
  if (budgets > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene presupuestos asociados" },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
