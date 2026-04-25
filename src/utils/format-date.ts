// Format a date as "APR 25, 2026" per design-spec section 4 (article cards).
export function formatDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();
}
