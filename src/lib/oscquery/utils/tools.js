export function isDefined(value) {
  return value !== undefined && value !== null;
}


// scalar clamping
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}