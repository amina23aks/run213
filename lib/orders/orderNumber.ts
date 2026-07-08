export function createOrderNumber(now = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `RUN-${datePart}-${randomPart}`;
}
