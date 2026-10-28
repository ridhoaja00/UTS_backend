let csrf = null;
export function setCsrf(value) {
  csrf = value;
}
export async function api(path, { method = "GET", body } = {}) {
  const form = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body && !form ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({
      error: "Respons server tidak valid. Pastikan backend aktif.",
    }));
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
export const money = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v));
export const date = (v) =>
  v
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(v.slice(0, 10) + "T00:00:00"))
    : "—";
export const currentDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
