const PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#db2777", // pink
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#dc2626", // red
  "#4f46e5", // indigo
];

export function colorForAssignee(assignee: string): string {
  if (!assignee) return "#64748b"; // slate for unassigned
  let hash = 0;
  for (let i = 0; i < assignee.length; i++) {
    hash = (hash * 31 + assignee.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
