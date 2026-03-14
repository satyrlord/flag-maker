export function extendStripeColors(
  colors: readonly string[],
  targetCount: number,
  palette: readonly string[],
): string[] {
  if (targetCount <= colors.length) {
    return colors.slice(0, targetCount);
  }

  const nextColors = [...colors];
  for (let index = colors.length; index < targetCount; index += 1) {
    const paletteColor = palette[index] ?? palette[index % palette.length] ?? nextColors[nextColors.length - 1];
    if (!paletteColor) {
      break;
    }
    nextColors.push(paletteColor);
  }
  return nextColors;
}