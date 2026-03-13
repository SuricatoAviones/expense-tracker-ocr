import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const defaultCategories = [
  { name: "Alimentacion", icon: "utensils", color: "#ef4444" },
  { name: "Transporte", icon: "car", color: "#f97316" },
  { name: "Entretenimiento", icon: "gamepad", color: "#a855f7" },
  { name: "Salud", icon: "heart", color: "#ec4899" },
  { name: "Educacion", icon: "book", color: "#3b82f6" },
  { name: "Servicios", icon: "zap", color: "#eab308" },
  { name: "Compras", icon: "shopping-bag", color: "#14b8a6" },
  { name: "Comisiones y tasas", icon: "percent", color: "#f59e0b" },
  { name: "Otros", icon: "tag", color: "#6b7280" },
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

      for (const cat of defaultCategories) {
        await tx.category.create({
          data: {
            userId: createdUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          },
        });
      }

      return createdUser;
    });

    const token = signToken({ id: user.id, email: user.email });

    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
