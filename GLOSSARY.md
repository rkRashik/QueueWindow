# QueueWindow glossary

**Organization**. The tenant that owns its users, counters, and tickets. The authentication screens call it a workspace.

**Owner**. A user who can administer the organization, counters, and staff accounts. Signup creates the first owner and requires an email address.

**Staff**. A user who can operate the service desk. Staff accounts created by an owner sign in with a username and password.

**Counter**. A service point belonging to one organization. An open counter can issue tickets. Pausing a counter blocks new issuance while staff continue working through existing tickets.

**Business day**. The day in `Asia/Dhaka` used for counter numbering and daily analytics.

**Ticket**. A visitor's place in a counter's queue, with status waiting, called, served, or skipped. The public token number is displayed in the venue. The private ticket ID lets a visitor check status.

**Recall**. Calling the active ticket again by refreshing its display timestamp. Its first-call time still determines elapsed service and analytics.

**Public display**. The venue's shared view of called and upcoming ticket numbers. Its API and event stream are available in Phase 2.
