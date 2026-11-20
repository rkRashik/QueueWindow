"use client";

import { Analytics as VercelAnalytics, type BeforeSendEvent } from "@vercel/analytics/next";

function beforeSend(event: BeforeSendEvent) {
  const { pathname } = new URL(event.url, window.location.origin);
  // The ticket URL grants access to a visitor's live ticket.
  return /^\/join\/[^/]+\/ticket\//.test(pathname) ? null : event;
}

export function Analytics() {
  return <VercelAnalytics beforeSend={beforeSend} />;
}
