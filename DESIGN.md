---
name: QueueWindow
description: A clear next step for everyone in line.
colors:
  ink: "#15223b"
  muted: "#5d6a80"
  primary: "#2356df"
  display: "#1235a4"
  paper: "#ffffff"
  canvas: "#f4f6fb"
  line: "#e0e6f0"
typography:
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.55
  headline:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "clamp(45px, 5vw, 72px)"
    fontWeight: 600
    lineHeight: 1.09
    letterSpacing: "-0.035em"
rounded:
  control: "10px"
  dialog: "16px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "15px 24px"
---

# QueueWindow design system

## Overview

English-first service interface. White operational screens and a blue public display share clear ticket typography. This implementation is ready for visual review; it is not recorded as user-approved.

## Colors

Blue identifies actions and ticket numbers. The public display uses a full blue field with white numbers. Green accompanies the explicit visitor message “It’s your turn.” Color never carries status alone.

## Typography

Manrope Variable is bundled locally. Ticket IDs remain consistent across staff, visitor, print, and display. Labels use sentence case. Bangla localization is deferred by request.

## Layout

Staff work in one horizontal station: current status, ticket, and next action. Waiting tickets sit below it. At narrow widths the station becomes one column. The visitor has an open page rather than a paper-ticket card. The display separates the current call from upcoming tickets and sizes type for viewing at a distance.

## Elevation & Depth

Operational screens are flat. Dialogs use a soft shadow and dimmed backdrop. The homepage device preview has a shadow to distinguish its visitor surface from the display behind it.

## Shapes

Aligned, upright geometry. No rotated cards or slanted artwork. The three-part mark echoes an active ticket and the tickets that follow.

## Components

The homepage preview responds to Call next. Number changes reveal vertically; dialogs enter with a short spatial transition. Reduced-motion preference disables movement. Secondary actions live in settings or ticket dialogs. Retry controls preserve uncertain commands instead of issuing duplicate work.

## Do's and Don'ts

- Keep status and the next action immediately visible.
- Keep descriptive copy short; use explicit action names.
- Keep visible keyboard focus and touch-friendly controls.
- Do not restore the rejected cream/yellow paper-ticket theme or angled cards.
- Do not add animation libraries for effects already handled by CSS.
