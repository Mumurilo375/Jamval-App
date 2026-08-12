---
name: Jamval
description: Painel de operação confiável para vendas em consignação
colors:
  canvas: "#f3f3f6"
  panel: "#ffffff"
  panel-strong: "#f8fafc"
  border: "#d9e2ec"
  ink: "#111827"
  subtle: "#5b6472"
  technical-blue: "#1d4ed8"
  blue-soft: "#dbeafe"
  success-teal: "#0f766e"
  danger-red: "#b42318"
  warning-amber: "#b45309"
  dark-canvas: "#0f172a"
  dark-panel: "#172033"
  dark-panel-strong: "#202b3d"
  dark-border: "#334155"
  dark-ink: "#e5eefb"
  dark-subtle: "#a7b2c2"
  dark-technical-blue: "#60a5fa"
  dark-success-teal: "#5eead4"
  dark-danger-red: "#f87171"
  dark-warning-amber: "#fbbf24"
typography:
  display:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "1.18rem to 1.55rem"
    fontWeight: 600
    lineHeight: "1.1"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "13px to 14px"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "10px to 12px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.16em to 0.22em"
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.technical-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.75rem 0.875rem"
    height: "2.5rem"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 0.875rem"
    height: "2.5rem"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.sm} to {rounded.md}"
    padding: "0.75rem to 1rem"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
    height: "2.5rem to 2.75rem"
---

# Design System: Jamval

## Overview

**Creative North Star: “Painel de operação confiável”**

Jamval is a practical field-operations interface. It should feel like a dependable control panel: calm enough for financial review, direct enough to use while standing in a client’s store, and structured enough that the next action is obvious at a glance.

The system uses compact information blocks, restrained technical color, clear Portuguese labels, and a small number of recognizable states. Its visual personality is simples, prático e confiável. Complexity belongs in the business logic, not in the surface.

**Key Characteristics:**

- Mobile-first and scan-friendly.
- Lightly elevated surfaces with quiet shadows.
- Direct, prominent actions with clear verbs.
- Short labels and purposeful supporting text.
- One operational step visible at a time when a flow is complex.

## Colors

The palette is a cool neutral field with a restrained technical blue for action and teal, amber, and red for operational states. Dark mode preserves the same semantic roles with deeper slate surfaces and brighter status colors.

### Primary

- **Azul técnico discreto** (`#1d4ed8`): Primary actions, active navigation, links, and focused operational emphasis. Use with restraint so actions remain easy to find.

### Secondary

- **Teal de sucesso** (`#0f766e`): Completed, paid, or healthy states.
- **Âmbar de atenção** (`#b45309`): Pending or review-needed states.
- **Vermelho de risco** (`#b42318`): Errors, destructive actions, and danger states.

### Neutral

- **Tela fria** (`#f3f3f6`): Main application canvas.
- **Painel branco** (`#ffffff`): Primary cards, forms, and readable content surfaces.
- **Painel forte** (`#f8fafc`): Secondary inset areas and subtle control backgrounds.
- **Borda azul-cinza** (`#d9e2ec`): Quiet separation between controls and regions.
- **Tinta** (`#111827`): Primary text.
- **Subtle** (`#5b6472`): Supporting text, metadata, and eyebrow labels.

### Named Rules

**The One Clear Action Rule.** Primary actions should look unmistakably actionable. Do not hide the main next step behind low-contrast text or ambiguous icon-only controls.

## Typography

**Display Font:** IBM Plex Sans Condensed (with sans-serif fallback)

**Body Font:** IBM Plex Sans (with sans-serif fallback)

**Character:** The body face is neutral, readable, and technical. The condensed face gives page titles and key quantities a compact operational signal without becoming decorative.

### Hierarchy

- **Display** (600, 1.18rem–1.55rem, tight line-height): Page titles, section titles, and prominent quantities.
- **Headline** (600, approximately 1rem–1.125rem, 1.25): Card titles and important operational messages.
- **Title** (600, 0.875rem–1rem, 1.3): List items, form groups, and summary values.
- **Body** (400, 0.8125rem–0.875rem, 1.5): Instructions, descriptions, metadata, and financial context.
- **Label** (600, 0.625rem–0.75rem, 0.16em–0.22em tracking, uppercase when used as an eyebrow): Compact section labels and status context.

### Named Rules

**The Useful Text Rule.** Every sentence must help the operator decide, enter, verify, or act. Remove generic explanation before reducing contrast or font size.

## Layout

The application uses a full-width responsive shell with a centered content ceiling of approximately 1440px. The header is fixed at roughly 52px on small screens and 56px on larger screens. Mobile layouts stack content and make primary actions full width; larger layouts introduce side-by-side actions, two-column forms, tables, and a persistent desktop navigation rail.

The rhythm is compact: most screens use 0.75rem–1rem gaps between related blocks and approximately 1rem–1.5rem between sections. Content should remain easy to scan during a visit. Complex flows should be broken into visible stages rather than presented as a dense uninterrupted form.

## Elevation & Depth

Jamval is lightly elevated. Depth comes first from the cool canvas-to-white-panel contrast and quiet 1px borders; shadows only separate important surfaces or indicate an overlay. Avoid dramatic floating layers that make a small operational screen feel like a marketing composition.

### Shadow Vocabulary

- **Card-rest** (`0 1px 2px rgba(15,23,42,0.04)`): Default card separation.
- **Drawer-overlay** (`0 24px 60px rgba(15,23,42,0.24)`): Side panels and mobile bottom sheets.
- **Backdrop** (`rgba(15,23,42,0.46)` with 2px blur): Modal and drawer scrim.

### Named Rules

**The Quiet Elevation Rule.** Use one surface boundary at a time. A card should not need another card inside it merely to appear structured.

## Shapes

The form language is rounded but controlled. Inputs, buttons, compact controls, and standard cards use approximately 0.75rem corners; larger cards use approximately 1rem on larger screens. Pills are reserved for statuses, filters, and back-navigation affordances. Borders are thin, cool, and low contrast. Mobile drawers use a generous 1.75rem top radius to distinguish the sheet from the page.

## Components

### Buttons

Buttons are direct and easy to recognize on first glance.

- **Shape:** Rounded rectangle, approximately 0.75rem radius.
- **Primary:** Technical blue background, white text, semibold label, 36–40px minimum height, compact horizontal padding.
- **Hover / Focus:** Slight surface change or focus ring; retain strong contrast. Active state may use a subtle scale-down.
- **Secondary:** White panel with border and dark text.
- **Ghost / Danger:** Ghost actions are reserved for low-priority navigation; danger uses a pale red treatment with red text. Do not make the primary next step ghost-like.

### Chips

Status chips use pill geometry, a pale semantic background, short uppercase or concise labels, and semantic text color. They communicate state, not instructions.

### Cards / Containers

Cards are the default grouping primitive, not a nesting pattern. They use a white panel, thin border, light rest shadow, 0.75rem–1rem radius, and 0.75rem–1rem internal padding. Keep one dominant purpose per card and avoid cards inside cards unless the inner surface is a genuinely interactive region such as a drawer or grouped input area.

### Inputs / Fields

Inputs use a white background, cool border, 0.75rem radius, minimum 40px height, and comfortable horizontal padding. Focus uses a blue border shift with a soft blue ring. Numeric and money inputs should favor fast keyboard entry and clear alignment. Labels and hints stay short and specific.

### Navigation

Desktop navigation is grouped into “Operação” and “Apoio”, with active states carried by the technical blue. Mobile navigation collapses into a drawer opened by a clearly visible menu button. The fixed header identifies the current area and keeps the shell context available while scrolling.

### Operational Summary

Small metric blocks and summary rows make totals, pending values, stock, and visit status scannable. Use strong value typography and short labels; do not turn every metric into a decorative dashboard card.

## Do's and Don'ts

### Do:

- **Do** make the next operational action visually prominent and label it with a direct verb.
- **Do** keep copy short, concrete, and in Brazilian Portuguese.
- **Do** use color to clarify status and action, not as decoration.
- **Do** preserve generous touch targets and fast numeric entry on mobile.
- **Do** use one clear card per purpose and tonal layering for secondary detail.
- **Do** show calculations and financial consequences where the operator makes the decision.

### Don't:

- **Don't** create cards inside cards as the default way to organize information.
- **Don't** fill cards with generic explanatory text or repeat information already visible elsewhere.
- **Don't** hide important actions behind subtle links, ambiguous icons, or low-contrast controls.
- **Don't** make the owner learn a complicated visual system before completing a visit.
- **Don't** use decorative gradients, dramatic shadows, or saturated color that competes with operational data.
- **Don't** replace a simple step-by-step flow with a dense all-at-once form.
