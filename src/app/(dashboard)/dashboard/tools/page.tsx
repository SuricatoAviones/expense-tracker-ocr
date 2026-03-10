import Link from "next/link";

const toolCards = [
  {
    title: "Calculadora",
    description: "Convierte entre USD y VES con referencia BCV en tiempo real.",
    href: "/dashboard/tools/calculadora",
    action: "Ir a Calculadora",
  },
  {
    title: "Mejor tasa",
    description: "Compara pagar directo en USDT vs vender USDT en P2P para pagar en bolivares.",
    href: "/dashboard/tools/mejor-tasa",
    action: "Ir a Mejor tasa",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Herramientas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Utilidades de conversion y comparacion de tasas para compras en VES y USDT.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toolCards.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block p-6 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition"
          >
            <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{tool.title}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{tool.description}</p>
            <p className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{tool.action}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
