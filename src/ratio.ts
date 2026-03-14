export function parseRatio(label: string): [number, number] {
  const match = label.trim().match(/^(\d+)\s*:\s*(\d+)$/);
  if (!match) {
    throw new Error(`ratio "${label}" must be "N:M" with positive numbers`);
  }

  const ratio: [number, number] = [Number(match[1]), Number(match[2])];
  if (ratio.some((part) => !Number.isFinite(part) || part <= 0)) {
    throw new Error(`ratio "${label}" must be "N:M" with positive numbers`);
  }

  return ratio;
}
