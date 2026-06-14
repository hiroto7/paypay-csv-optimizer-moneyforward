export const sum = <T>(
  items: readonly T[],
  getValue: (item: T) => number,
): number => items.reduce((total, item) => total + getValue(item), 0);
