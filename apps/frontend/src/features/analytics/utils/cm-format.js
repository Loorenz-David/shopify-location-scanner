export function formatCm(cm) {
    if (cm >= 100) {
        return `${(cm / 100).toFixed(1)}m`;
    }
    return `${Math.round(cm)}cm`;
}
