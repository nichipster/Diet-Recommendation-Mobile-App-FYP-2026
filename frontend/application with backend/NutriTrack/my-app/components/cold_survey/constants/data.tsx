export const ALLERGIES = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame'];

export const ACTIVITY_LEVELS = [
  { label: 'Sedentary', desc: 'Less than 5k steps daily, office job, little to no exercise', multiplier: '×1.2' },
  { label: 'Lightly Active', desc: '5–7.5k steps daily, light daily movement, light exercise 1–3× weekly', multiplier: '×1.375' },
  { label: 'Active', desc: '7.5–10k steps, standing job (e.g. nurse), moderate exercise 3–5× weekly', multiplier: '×1.55' },
  { label: 'Very Active', desc: 'Over 10k steps, heavy manual labour, heavy exercise 5+× weekly', multiplier: '×1.7' },
];

export const WEEKLY_GOALS = [
  { label: 'Conservative', value: '0.25 kg / week', color: '#2D5A3D' },
  { label: 'Moderate', value: '0.5 kg / week', color: '#8C6B2F', recommended: true },
  { label: 'Aggressive', value: '1 kg / week', color: '#C8522A' },
];

export const CARDIO_OPTIONS = ['0×', '1×', '2×', '3×', '4×', '5×', '6×', '7×'];

export const TOTAL_STEPS = 7;