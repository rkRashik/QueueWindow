export const siteName = "QueueWindow";
export const siteTitle = "Digital queues and live token displays";
export const siteDescription =
  "Manage queues for clinics, banks, and service desks. Call the next ticket from your desk and update waiting-room displays, kiosks, and visitors’ phones in real time.";

export function siteUrl(path = "/") {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new URL(path, base);
}
