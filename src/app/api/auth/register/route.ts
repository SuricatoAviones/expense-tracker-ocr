import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const defaultCategoryTree = [
  {
    name: "Alimentacion",
    icon: "utensils",
    color: "#ef4444",
    children: ["Supermercado", "Restaurante", "Delivery"],
  },
  {
    name: "Transporte",
    icon: "car",
    color: "#f97316",
    children: ["Gasolina", "Transporte publico", "Taxi"],
  },
  {
    name: "Entretenimiento",
    icon: "gamepad",
    color: "#a855f7",
    children: ["Streaming", "Salidas", "Juegos"],
  },
  {
    name: "Salud",
    icon: "heart",
    color: "#ec4899",
    children: ["Farmacia", "Consultas", "Seguro medico"],
  },
  {
    name: "Educacion",
    icon: "book",
    color: "#3b82f6",
    children: ["Cursos", "Libros", "Suscripciones"],
  },
  {
    name: "Servicios",
    icon: "zap",
    color: "#eab308",
    children: ["Internet", "Electricidad", "Agua"],
  },
  {
    name: "Compras",
    icon: "shopping-bag",
    color: "#14b8a6",
    children: ["Ropa", "Hogar", "Tecnologia"],
  },
  {
    name: "Comisiones y tasas",
    icon: "percent",
    color: "#f59e0b",
    children: ["Comision bancaria", "Comision transferencia", "Cambio de moneda"],
  },
  {
    name: "Otros",
    icon: "tag",
    color: "#6b7280",
    children: ["Imprevistos", "Regalos", "Donaciones"],
  },
];

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "El email ya esta registrado" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, password: hashed, name },
      });

      for (const cat of defaultCategoryTree) {
        const parent = await tx.category.create({
          data: {
            userId: createdUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          },
        });

        for (const childName of cat.children) {
          await tx.category.create({
            data: {
              userId: createdUser.id,
              name: childName,
              icon: cat.icon,
              color: cat.color,
              parentId: parent.id,
            },
          });
        }
      }

      return createdUser;
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
