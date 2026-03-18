import { data } from '../CSConsts';

export const WeightLogic = (data: data): string => {
  const current = Number(data.weight);
  const goal = Number(data.goalWeight);

  if (!data.goalWeight || isNaN(goal)) return '';

  if (data.goal === 'Lose' && goal >= current) {
    return 'Goal weight must be lower than your current weight';
  }
  if (data.goal === 'Gain' && goal <= current) {
    return 'Goal weight must be higher than your current weight';
  }
  if (goal <= 0) {
    return 'Please enter a valid weight';
  }
  return '';
};