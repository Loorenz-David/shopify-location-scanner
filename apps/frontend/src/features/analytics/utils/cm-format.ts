export function formatCm(cm: number): string {
  if (cm >= 100) {
    return `${(cm / 100).toFixed(1)}m`;
  }

  return `${Math.round(cm)}cm`;
}
