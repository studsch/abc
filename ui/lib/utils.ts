import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseCsv = (text: string): string[][] => {
  const rows = text.split("\n").filter((line) => line.trim() !== "")
  const result = rows.map((row) => row.split(","))
  return result
}
