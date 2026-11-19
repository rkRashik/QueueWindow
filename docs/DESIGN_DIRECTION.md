# Design direction

Phase 1 on the SaaS rebuild branch replaces the v1 application runtime with the Neon schema and organization authentication. See [Phase 1 architecture](ARCHITECTURE.md) for current behavior.

The staff desk pairs a waiting list with a focused active-ticket surface. Mobile keeps the primary action within reach at the bottom of the screen. The action names the actual next ticket, and optional elapsed time comes from server events.

The public display has Midnight, Paper, River, Clay, and Plum themes. Its ticket number, destination, and optionally visible upcoming tickets support viewing at a distance. Repeat calls replay the number reveal. Sound requires both the saved preference and a local opt-in on the display.

Visitor tickets show queue position or destination and a labelled sequence of states. The sign-in form supports password managers, paste, and password visibility. Reduced-motion preferences suppress animation.

Business and visitor copy, print footer, pause message, theme, and upcoming-ticket count are configurable from staff settings. The display preview uses sample data.

The public entry surfaces use locally hosted Bangla typography and a large ticket action. A receipt reveal marks successful kiosk issuance. Settings group visitor access, venue details, display, timing, ticket messages, and queue operations.
