export const REGISTER_FEE_LABEL = "Register Fee";

export function isRegisterFeePaymentTypeName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized === "register fee" || normalized === "registration fee";
}

export function isRegisterFeeSentinelMonth(month: string | undefined | null): boolean {
  if (!month) return false;
  const parts = month.split("-");
  return parts.length === 2 && parts[1] === "13";
}

export function getRegisterFeeSentinelMonth(year: number): string {
  return `${year}-13`;
}

