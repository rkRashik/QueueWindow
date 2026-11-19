# Product brief

QueueWindow makes waiting understandable: staff manage a single FIFO queue, visitors check private tickets, and a public display keeps the room informed.

The initial product is a fully functional portfolio app with a $0 hosting target, Bangladesh context, English interface, and approximately 100 demo tickets per day. No visitor names, phone numbers, medical details, or other sensitive information are collected.

## Included

- Isolated demo workspaces with five sample tickets.
- Authenticated staff desk; ticket issuance, calling, starting service, completion, absence, and cancellation.
- Pause/resume admission without losing existing tickets.
- Private visitor links and QR codes; print-friendly ticket sheets.
- Public display with fullscreen controls and a layout for large screens.
- Business name, desk name, and visitor message customization.
- Network failure feedback, retry-safe writes, polling, keyboard dialogs, and mobile layouts.

Lifecycle: waiting ? called ? serving ? completed. Waiting tickets may be cancelled; called tickets may be marked absent. Returning absent visitors receive new tickets. Only one ticket can be called or serving. Starting a new day requires all tickets to be resolved, clears them, and restarts numbering. Midnight does not reset anything automatically.

## Outside this release

Self-service joining, multiple desks, appointments, triage, notifications, billing, analytics, offline writes, and medical records.

## Before real clinic use

Review commercial hosting terms, Bangladesh privacy obligations, language needs, staff account management, backups and restoration, monitoring, retention, recovery targets, and an outage procedure. Validate the workflow with actual clinic staff. Free portfolio hosting is not an uptime commitment.
