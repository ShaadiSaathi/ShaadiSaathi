/** Snappy auth field styling — premium signup + shared auth forms */

export const AUTH_INPUT_CLASS =
  "shaadi-auth-input w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35"

export const AUTH_LABEL_CLASS = "mb-1 block text-sm font-medium text-maroon/70"

export const AUTH_ERROR_CLASS = "mt-1 text-xs text-rose-600"

export function authChipClass(selected: boolean): string {
  return [
    "rounded-full border px-3 py-1.5 text-sm transition-[border-color,background-color,transform,box-shadow] duration-150",
    "active:scale-[0.98]",
    selected
      ? "border-maroon bg-maroon/10 text-maroon-dark shadow-sm shadow-maroon/5"
      : "border-gold/25 bg-ivory text-maroon/70 hover:border-maroon/30",
  ].join(" ")
}
