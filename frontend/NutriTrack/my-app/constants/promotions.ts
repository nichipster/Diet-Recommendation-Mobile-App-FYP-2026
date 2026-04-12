export type Promotion = {
  id: string;
  title: string;
  description: string;
  discountCode: string;
  discountPercent: number;
  startDate: string; // ISO 8601, e.g. "2026-04-10T00:00:00+08:00"
  endDate: string;
  accentColor?: string;
};

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo_april_2026",
    title: "🎉 April Flash Sale!",
    description: "Upgrade to NutriTrack Premium at a special rate. Limited time only!",
    discountCode: "APRIL30",
    discountPercent: 30,
    startDate: "2026-04-08T00:00:00+08:00",
    endDate: "2026-04-15T23:59:59+08:00",
    accentColor: "#4CAF50",
  },
  // Add more promotions here
];

export function getActivePromotion(): Promotion | null {
  const now = new Date();
  return (
    PROMOTIONS.find((promo) => {
      const start = new Date(promo.startDate);
      const end = new Date(promo.endDate);
      return now >= start && now <= end;
    }) ?? null
  );
}