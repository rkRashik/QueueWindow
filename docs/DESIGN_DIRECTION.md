# Design direction

Phase 3A applies the [QueueWindow design system](../DESIGN.md) to desk, admin, sign-in, and signup.

- The active token is the largest item on the desk. The next number sits beside the single primary call action. Completion, recall, and skip are grouped by the active ticket. Walk-in issuance and pause stay available at the foot of the panel.
- The waiting list shows token, elapsed wait, and skip. A visibility-aware SSE connection refreshes authoritative desk state. The desk retains the last snapshot during disconnection and uses a polling fallback.
- Admin groups daily analytics, counter controls, the team, and branding with subscription status. New staff credentials are copyable from the creation confirmation while it is open.
- Desk and admin share an English and Bangla preference stored in the browser. The interfaces use native keyboard and focus behavior. Keyboard shortcuts yield to form fields and dialogs.

Phase 3B extends the system to public surfaces.

- The midnight TV grid uses large emerald call numbers and static Bangla and English labels. Token changes and recalls share one short transition. Chimes and optional voice require a user action.
- The visitor flow starts in Bangla and uses high-contrast controls at least 48 px tall. The ticket keeps its number visible as its status changes.
- The venue sign prints in A4 with a bilingual scan prompt. Kiosk receipts support 58 mm and 80 mm paper and clear after 30 seconds.
- The landing page uses connected sample views to explain the flow and a separate live demo backed by the real queue.
