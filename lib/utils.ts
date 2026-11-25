import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins CSS class names and removes Tailwind conflicts (shadcn/ui helper). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
