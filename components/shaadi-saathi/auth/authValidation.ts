/** Client-side validation helpers for mock auth forms */

export function normalizePhone(digits: string): string {
  return digits.replace(/\D/g, "").slice(-10)
}

export function isValidPakistanPhone(digits: string): boolean {
  const n = normalizePhone(digits)
  return n.length === 10 && n.startsWith("3")
}

export function formatPhoneDisplay(digits: string): string {
  const n = normalizePhone(digits)
  if (n.length < 4) return n
  if (n.length < 7) return `${n.slice(0, 3)} ${n.slice(3)}`
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required"
  if (password.length < 6) return "Password must be at least 6 characters"
  return null
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return "Passwords do not match"
  return null
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`
  return null
}

export async function mockAuthDelay(ms = 800): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
