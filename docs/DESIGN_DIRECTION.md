# Design direction

The current build is English-first, with locally bundled Manrope, white operational screens, and a cobalt public display. Bangla is deferred by request. The previous cream/yellow visual system, tilted ticket preview, and Bengali font were removed.

The staff workspace places status, current ticket, and the next action in one horizontal station. Waiting tickets appear below. The visitor page uses open space rather than a paper card. The public display gives the current ticket most of the screen and keeps upcoming tickets in a separate band.

The entry page contains an interactive display/visitor preview. Call next changes both views. CSS handles ticket announcements, press feedback, and dialog entry; reduced motion disables movement. No animation dependency was added.

The implementation awaits the user's visual review. See [DESIGN.md](../DESIGN.md) for actual tokens and [verification](VERIFICATION.md) for evidence and limits.
