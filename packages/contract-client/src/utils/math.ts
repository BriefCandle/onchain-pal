export function circleIntersectionArea(
  r1: number,
  r2: number,
  d: number
): number {
  // No overlap
  if (d >= r1 + r2) return 0;
  // One circle is completely inside the other
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;

  const r1Sq = r1 * r1;
  const r2Sq = r2 * r2;

  const alpha = Math.acos((d * d + r1Sq - r2Sq) / (2 * d * r1));
  const beta = Math.acos((d * d + r2Sq - r1Sq) / (2 * d * r2));

  const area =
    r1Sq * alpha +
    r2Sq * beta -
    0.5 *
      Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return area;
}

export function attackPossibility(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  move_range: number,
  attack_range: number
): number {
  const d = Math.hypot(prevX - x, prevY - y);
  const intersection = circleIntersectionArea(move_range, attack_range, d);
  const moveArea = Math.PI * move_range * move_range;
  return intersection / moveArea; // Probability (0 to 1)
}

export function getInverseInterpolate(
  sourceValue: number,
  sourceMin: number,
  sourceMax: number,
  targetMin: number,
  targetMax: number
) {
  if (sourceValue <= sourceMin) return targetMax;
  if (sourceValue >= sourceMax) return targetMin;

  const sourceRange = sourceMax - sourceMin;
  const targetRange = targetMax - targetMin;

  const inverseRatio = Math.floor(
    ((sourceMax - sourceValue) * targetRange) / sourceRange
  );
  return targetMin + inverseRatio;
}

export function getInterpolate(
  sourceValue: number,
  sourceMin: number,
  sourceMax: number,
  targetMin: number,
  targetMax: number
) {
  if (sourceValue <= sourceMin) return targetMin;
  if (sourceValue >= sourceMax) return targetMax;

  const sourceRange = sourceMax - sourceMin;
  const targetRange = targetMax - targetMin;

  const ratio =
    Math.floor((sourceValue - sourceMin) * targetRange) / sourceRange;
  return targetMin + ratio;
}
