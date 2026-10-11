import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge CSS classes safely using clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
