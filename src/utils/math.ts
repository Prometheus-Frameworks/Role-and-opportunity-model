export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

export const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const weightedAverage = (pairs: Array<[number, number]>): number => {
  const totalWeight = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weightedTotal = pairs.reduce((sum, [value, weight]) => sum + value * weight, 0);
  return weightedTotal / totalWeight;
};
