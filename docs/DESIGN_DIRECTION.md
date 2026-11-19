# Design direction

Phase 3A applies the [QueueWindow design system](../DESIGN.md) to desk, admin, sign-in, and signup.

- The active token is the largest item on the desk. The next number sits beside the single primary call action. Completion, recall, and skip are grouped by the active ticket. Walk-in issuance and pause stay available at the foot of the panel.
- The waiting list shows token, elapsed wait, and skip. A visibility-aware SSE connection refreshes authoritative desk state. The desk retains the last snapshot during disconnection and uses a polling fallback.
- Admin groups daily analytics, counter controls, the team, and branding with subscription status. New staff credentials are copyable from the creation confirmation while it is open.
- Desk and admin share an English and Bangla preference stored in the browser. The interfaces use native keyboard and focus behavior. Keyboard shortcuts yield to form fields and dialogs.

The public display, visitor screens, and landing page are Phase 3B surfaces.
