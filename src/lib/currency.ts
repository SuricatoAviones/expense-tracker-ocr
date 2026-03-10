export const SUPPORTED_CURRENCIES = ["USD", "VES"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const DISPLAY_LABEL: Record<CurrencyCode, string> = {
  USD: "USD ($)",
  VES: "VES (Bs)",
};

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  USD: "en-US",
  VES: "es-VE",
};

const SYMBOL_BY_CURRENCY: Record<CurrencyCode, string> = {
  USD: "$",
  VES: "Bs",
};

export function parseCurrency(input: string | null | undefined): CurrencyCode {
  if (!input) return "USD";
  const value = input.toUpperCase();
  return SUPPORTED_CURRENCIES.includes(value as CurrencyCode) ? (value as CurrencyCode) : "USD";
}

export function getCurrencyLabel(currency: CurrencyCode): string {
  return DISPLAY_LABEL[currency];
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatCurrencyShort(amount: number, currency: CurrencyCode): string {
  return `${SYMBOL_BY_CURRENCY[currency]}${Number(amount || 0).toFixed(2)}`;
}
