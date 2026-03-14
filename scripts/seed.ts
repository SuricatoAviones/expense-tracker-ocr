import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categoryTree = [
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

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    for (const cat of categoryTree) {
      const parent = await prisma.category.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: cat.name,
          },
        },
        update: {
          icon: cat.icon,
          color: cat.color,
          parentId: null,
        },
        create: {
          userId: user.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
        },
      });

      for (const childName of cat.children) {
        await prisma.category.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: childName,
            },
          },
          update: {
            icon: cat.icon,
            color: cat.color,
            parentId: parent.id,
          },
          create: {
            userId: user.id,
            name: childName,
            icon: cat.icon,
            color: cat.color,
            parentId: parent.id,
          },
        });
      }
    }
  }
  console.log("Seed completed: user categories and subcategories created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
