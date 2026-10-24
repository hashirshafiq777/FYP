/** First letters of the first and last words — "Ayesha Khan" becomes "AK". */
export function initialsFor(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  // Spread, not [0]: a surrogate pair (or an Urdu letter) must not be halved.
  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}
