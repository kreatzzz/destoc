---
version: "alpha"
name: "Destoc"
description: "A focused design-review cockpit for inspecting live web previews, selecting components, and applying AI-assisted UI patches."
colors:
  primary: "#10100F"
  secondary: "#A7A29A"
  tertiary: "#F7CA58"
  neutral: "#F4F0E8"
  surface: "#171715"
  danger: "#FB7185"
  success: "#86EFAC"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: "1.05"
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.65"
    letterSpacing: "-0.01em"
  caption:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
components:
  shell:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
  chat-rail:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
    width: "360px"
  chat-message-assistant:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: "{spacing.3}"
  chat-message-user:
    backgroundColor: "{colors.tertiary}"
    textColor: "#1B1205"
    rounded: "{rounded.md}"
    padding: "{spacing.3}"
  composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: "{spacing.2}"
  preview-toolbar:
    backgroundColor: "rgba(40, 40, 38, 0.96)"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.1}"
  code-pane:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
    width: "420px"
  status-error:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary}"
    size: "6px"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    size: "6px"
---

## Overview

Destoc should feel like a precise review cockpit, not a generic SaaS dashboard. The product is used while someone is thinking through visual changes, so the interface should stay quiet, dense, and stable. The preview is the object of attention. The chat rail is a control surface. The code pane is a secondary reveal, never an automatic interruption.

The visual language is dark, matte, and editorial with a single warm golden accent. Avoid neon gradients, heavy cards, glassmorphism, and busy sidebars. Use contrast through spacing, type weight, and subtle inset lines rather than obvious borders.

## Colors

The base palette is near-black with warm undertones. The yellow accent represents selection, active state, and user intent.

- **Primary (#10100F):** primary application background.
- **Surface (#171715):** composer, cards, and active surfaces.
- **Tertiary (#F7CA58):** selected components, send action, active indicators.
- **Secondary (#A7A29A):** hints, timestamps, secondary metadata.
- **Danger (#FB7185):** destructive or failed states only.

Do not introduce extra primary colors unless they communicate system state. Status colors must stay small: dots, short labels, or icon accents.

## Typography

Use Geist for interface text and Geist Mono only for tiny counters, component numbers, and code-oriented captions. Keep type compact but readable. Labels should be short. Body copy should use `text-wrap: pretty` where possible to avoid awkward single-word lines.

Headlines and section titles use negative tracking. Chat messages use regular weight with generous line-height so prompts remain readable inside a narrow rail.

## Layout

The workspace has three possible regions:

1. Left chat rail for prompt, selected components, and suggestion decisions.
2. Center preview as the primary canvas.
3. Right code pane for diffs only, opened by user intent.

The preview should claim all remaining space. Avoid nested preview cards and decorative frames. Resizable panes should keep stable minimum widths and use subtle hover-only resize affordances.

## Elevation & Depth

Prefer inset strokes and soft shadows:

- Inset line: `inset 0 0 0 1px rgba(255,255,255,0.06)`.
- Floating control shadow: `0 14px 40px rgba(0,0,0,0.18)`.
- Accent glow only around selected/active objects, never as page decoration.

## Shapes

Use concentric rounding:

- Composer outer radius: 24px.
- Inner text field radius: 16px.
- Chat messages and suggestion cards: 14–18px.
- Pills and status chips: full pill radius.

Tiny icon buttons need at least 32px visible size and 40px practical hit target when possible.

## Components

**Chat rail:** minimal message stack, no large headings. The rail should feel like a working log. Assistant messages are dark and quiet; user messages are yellow and compact.

Use shadcn chat primitives (`MessageScroller`, `Message`, and `Bubble`) as the default foundation for chat surfaces. The visual reference is closer to the quiet rails and centered composers in Mobbin examples from Obvious, Notion, Langdock, and StackAI: sparse message density, compact chips, and a composer that feels like the primary control.

**Selected component pills:** show the number first, then role/name. If overflow occurs, show a final `+N` pill. Notes belong directly above the composer and should not shift the whole layout dramatically.

**Suggestion card:** pending decisions live in chat. The card shows title, short rationale, and Accept/Reject. Accepted cards are removed from the action stream and replaced by concise streamed assistant status text so the chat does not accumulate checkmark confirmations.

**Message hierarchy:** user messages are right-aligned gold command bubbles with a small `You` label. Agent messages are left-aligned muted cards with a `Destoc` label and a subtle gold rail. The two roles must be visually distinguishable at a glance.

**Code pane:** diff-only. No accept/reject controls, no rationale blocks, no implementation prose. Opening is user-controlled.

**Preview toolbar:** low-chrome floating control with Select and Inspect. Use active state only; avoid duplicate toggles elsewhere.

## Do's and Don'ts

Do:

- Keep the preview as the visual priority.
- Use the golden accent for intent and active states.
- Use compact, readable chat cards.
- Make system progress explicit but small.
- Preserve animation continuity by preferring reload over rebuild when the running preview supports it.

Don't:

- Auto-open secondary panes.
- Put implementation prose in the code pane.
- Use destructive icons as default project-list actions.
- Add large decorative containers around the preview.
- Add new brand colors without a clear status purpose.
