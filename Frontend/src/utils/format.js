export function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
