---
name: ui-craft
description: Design-thinking and craft workflow for building, auditing and fixing any UI — intent discovery, information hierarchy, state completeness, form UX, feedback and affordance, motion and polish, visual character, and writing DESIGN.md. Use whenever the user builds or changes a screen, component, form, dashboard or page, asks to "audit", "review" or "fix" a UI, asks for a design system or DESIGN.md, or says a UI looks generic, off, or "AI-made", even if they never say "design".
---

# UI Craft

Agents write UI that works but has no taste: framework-default palettes, happy-path-only components, every button the same weight. This skill fixes that by making design decisions explicit, in a fixed order, before markup is written.

Pick the mode from the request, then run only the sections that apply.

| Request | Mode | Run |
| --- | --- | --- |
| Build or change a screen, component, form | **Build** | 1 → 2 → 8 (tokens) → write code → 3, 4, 5, 6 as the UI needs |
| "audit", "review", "critique" a UI | **Audit** | 7 (audit mode) |
| "fix", "clean up", "make this better" | **Fix** | 7 (fix mode) |
| "design system", "DESIGN.md", "tokens" | **System** | 9 |
| "looks generic / bland / AI-made" | **Character** | 8, then 9 to record it |

If the project has a `DESIGN.md`, read it first and follow it. It overrides any default in this file.

---

## 1. Intent Discovery

Ask before drawing. UI built without answers to these is decoration. Ask all three at once, then wait — unless the user already answered, or is not there to answer, in which case state your assumptions in one line and proceed.

1. **Who** uses this, and in what situation? (Expert at a desk 100×/day, or first-timer on a phone in a queue. This sets density, tone and how much you explain.)
2. **What** is the one job of this screen? (If you cannot say it in a sentence, the screen is two screens.)
3. **Worst case:** what is the most expensive mistake a user can make here, and what happens when the system fails? (This decides which actions need confirmation, undo, or friction, and what the error state must say.)

Write the answers as a 3-line brief at the top of your work. Every later decision should be traceable to it.

## 2. Information Hierarchy

Users scan; they do not read. Decide what they see first, second, last, and make the page agree.

**Rank every action on the screen:**
- **Primary**: the one job from step 1. One per view. Solid fill, highest contrast. Two primaries means nothing is primary.
- **Secondary**: supports the job. Outline or tinted, visually quieter.
- **Tertiary**: escape hatches and rare actions. Text or icon only.
- **Destructive**: never styled like primary, and not adjacent to it without separation.

**Rank the content the same way:** the answer the user came for is biggest and highest; supporting detail is smaller and lower; metadata is smallest and lowest contrast.

**Scanning patterns.** Pick one deliberately:
- Text-heavy or form pages → F-pattern: left-aligned, strong first words, headings that stand alone.
- Sparse landing or dashboard → Z-pattern: identity top-left, key figure or CTA at the end of the diagonal.
- Data tables → align numbers right, text left, one row height, sortable columns marked.

**Density is a decision from step 1.** Expert tools earn tight rows and small type; first-run flows earn space. Do not mix densities on one screen.

**Tools for hierarchy, strongest first:** size, weight, contrast, position, whitespace. Reach for color last; a screen that only works in color fails colorblind users and greyscale.

## 3. State Completeness

A component is not done until every state it can be in has been designed. Agents skip everything except "success with data". Before finishing, walk this list and either build the state or write down why it cannot occur.

| State | What it needs |
| --- | --- |
| **Loading** | Skeleton matching the final layout (not a centered spinner) for content; inline spinner for actions. Never shift layout when data arrives. Delay showing spinners ~150ms to avoid flashes. |
| **Empty** | Says why it is empty, and gives the next step (a button, not a paragraph). First-use empty and "no results for this filter" are different states with different copy. |
| **Error** | Says what happened in plain words, whether the user's data is safe, and what to do. Offers retry. Keeps user input. Never "Something went wrong" alone. |
| **Success** | Confirms the result where the user is looking. Transient for routine actions (toast), persistent when the result matters (receipt, reference number). |
| **Partial** | Some data loaded, some failed; list has 1 item; text is 200 characters long; name has no spaces. Test with awkward data, not lorem ipsum. |
| **Offline / slow** | Show stale data labeled as stale, queue writes, say so. Only where the app can plausibly be offline. |
| **Disabled** | Explain why (tooltip or helper text). A grey button with no reason is a dead end. |
| **Permission / auth** | Distinguish "not signed in", "not allowed", and "does not exist". |

## 4. Form UX

Forms are where users leave. Every field is a cost.

- **Cut fields first.** Ask only for what you use now. Split long forms into steps only when steps are meaningfully different; show progress.
- **Group** related fields under a visible heading; separate groups with space, not boxes on boxes. One column unless fields are short and clearly paired (city / postcode).
- **Labels above inputs**, always visible. Placeholder text is an example, never the label (it vanishes when typing and fails contrast).
- **Mark the minority:** if most fields are required, mark the optional ones "(optional)".
- **Right input, right keyboard:** `type`, `inputmode`, `autocomplete` set correctly. On mobile, inputs are ≥16px so the page does not zoom.
- **Smart defaults:** prefill from what you know (locale, previous choice); preselect the safest common option.
- **Validation strategy:** validate on blur, not on every keystroke; never before the user has typed. Once a field is in error, re-validate live so the error clears the moment it is fixed. Error text sits next to the field, says how to fix it ("Use 8+ characters"), and is not color-only. On submit, move focus to the first error.
- **Progressive disclosure:** hide advanced options behind a clear control; reveal dependent fields only when triggered.
- **Never punish:** preserve input on error and on back-navigation; allow paste; accept sloppy formats (spaces in card numbers, `+63` vs `09`) and normalize them yourself.
- **Submit button** says the outcome ("Create project"), shows a pending state, and is disabled only while submitting, not while the form is merely incomplete.

## 5. Feedback & Affordance

The interface must always answer "did it hear me?" and "what can I do here?"

**Feedback**
- Acknowledge every input within **100ms**. If the real work takes longer, show pending state immediately; use optimistic updates when failure is rare and reversible.
- Press states on everything pressable (`:active`, subtle `scale(0.97)`); visible `:focus-visible` rings on everything focusable. Never remove outlines without a replacement.
- **Destructive actions** need one of: confirmation naming the thing and the consequence ("Delete 'Q3 plan'? This cannot be undone."), or better, **undo** (toast with Undo for ~6s). Prefer undo for reversible, confirmation for irreversible. Confirm buttons repeat the verb ("Delete project"), not "OK". Never put confirmation on frequent, low-cost actions; users will click through and the safeguard dies.
- Long operations: show progress that moves, state what is happening, allow cancel.

**Affordance**
- Clickable looks clickable: links are distinguishable without hover, buttons look like buttons, cards that are clickable have a hover/focus state and a visible target.
- Non-clickable does not look clickable: no underlined non-links, no button-shaped labels.
- Touch targets ≥ 44×44px with spacing; hit area may exceed visible size.
- Icons alone are ambiguous. Pair with a label unless the icon is universal (close, search), and give icon-only buttons an accessible name.
- Gate hover effects with `@media (hover: hover) and (pointer: fine)` so touch devices do not get stuck hover states.

## 6. Motion & Polish

Adapted from Emil Kowalski's design-engineering skills (MIT; see credit at the end). Motion is a tool for feedback and continuity, not decoration.

**Should it animate? Ask by frequency:**
- 100+ times/day (keyboard shortcuts, command palette): no animation, ever.
- Tens of times/day (hover, list navigation): remove or drastically reduce.
- Occasional (modals, drawers, toasts): standard animation.
- Rare (onboarding, celebration): may add delight.

Every animation needs a purpose: spatial consistency, state change, feedback, or preventing a jarring pop. "It looks cool" only qualifies if users see it rarely.

**Curves and timing**
- Entering/exiting: `ease-out`. On-screen movement: `ease-in-out`. Hover/color: `ease`. Constant motion (progress, marquee): `linear`. **Never `ease-in` on UI**: it starts slow, exactly when the eye is watching.
- Built-in CSS easings are weak. Define tokens:
  ```css
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  ```
- Durations: press feedback 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals/drawers 200–500ms. UI stays under 300ms. Exits are faster than enters.

**Rules that catch most mistakes**
- Never enter from `scale(0)`; start at `scale(0.95)` plus `opacity: 0`.
- Popovers scale from their trigger (`transform-origin`); modals stay centered.
- Never `transition: all`; name the properties.
- Animate only `transform` and `opacity`; width/height/margin/padding trigger layout.
- Use CSS transitions, not keyframes, for anything that can be re-triggered quickly (toasts, toggles): transitions retarget, keyframes restart.
- Stagger lists 30–80ms per item, and never block interaction during it.
- Tooltips delay on first hover, then open instantly for neighbors.
- Springs (`duration: 0.5, bounce: 0.2`, bounce ≤ 0.3) for drag and interruptible gestures. Dismiss on velocity, not only distance; use friction at boundaries, not hard stops.
- `prefers-reduced-motion`: remove movement, keep opacity/color changes that aid comprehension. Fewer and gentler, not zero.
- If a crossfade looks like two objects swapping, add `filter: blur(2px)` during the transition (keep blur < 20px).
- Match motion to mood: a dashboard is crisp and fast; a playful product may be bouncier.

## 7. UX Auditor

Point it at any UI (code, screenshot, URL, or running app). Two modes.

**Audit** → return a severity-ranked findings list. Do not change code.
**Fix** → return the fixed code plus the findings each change addresses.

If the user's word is ambiguous ("review", "improve"), audit first and offer to fix.

**Method**
1. State the intent brief (section 1). If unknown, infer it and say so.
2. Check against sections 2–6 and 8, plus accessibility basics: contrast ≥ 4.5:1 body text (3:1 large), keyboard reachability and order, focus visibility, semantic elements over div-buttons, labelled controls, alt text, no color-only meaning, reduced motion.
3. Rank by user harm, not by ease of fixing.

**Severity**
| Level | Meaning | Examples |
| --- | --- | --- |
| **Critical** | Blocks the task, loses data, or excludes users | No error state; destructive action with no confirm or undo; unlabeled inputs; keyboard trap |
| **High** | Users likely to fail or hesitate | Two competing primary buttons; validation only after submit; loading layout shift |
| **Medium** | Friction, inconsistency | Placeholder-as-label; vague empty state; no press feedback |
| **Low** | Polish | `transition: all`; off-scale spacing; hover not media-gated |

**Audit output format** (a single table, one row per issue, sorted Critical → Low):

| # | Severity | Where | Problem | Fix | Why it matters |
| --- | --- | --- | --- | --- | --- |
| 1 | Critical | `DeleteButton.tsx:24` | Deletes immediately on click | Add undo toast (6s) | Irreversible loss from a mis-click |

End with: the 3 changes that would most improve the UI, and anything you could not verify (states you could not trigger, breakpoints not seen).

**Fix output:** modified code, then a short list mapping each finding # to the change. Change only what findings justify; do not restyle the rest. If a fix needs a product decision (copy, policy), make a sensible default and flag it.

## 8. Visual Character

A UI with no decisions looks like the framework default: Tailwind blue-500, Inter, `rounded-lg`, grey cards with soft shadow. Avoid that by making **one explicit decision per axis before writing markup**, and writing them down as tokens.

**Axes**
- **Type**: one or two families with a reason (voice: geometric = modern, serif = editorial/trust, mono = technical). A scale (e.g. 12/14/16/20/28/40), weights used, line-height and tracking (tighter on large sizes, looser on small caps). Do not default to Inter/system unless the brief argues for neutrality.
- **Color**: a neutral ramp tinted toward the brand hue (not pure grey), one accent, semantic colors (success/warn/danger/info) chosen to sit with the accent, and dark-mode values decided rather than inverted. Check contrast. Say what the accent is *for* so it is not sprayed everywhere.
- **Space**: a base unit (4 or 8) and a short scale; density from step 1; rhythm: tighter inside groups, looser between.
- **Finish**: radius (sharp / soft / pill, applied consistently), borders vs shadows vs flat, elevation levels (max 3), texture, icon style and stroke width, image treatment. Prefer semi-transparent shadow layers over solid borders for depth.

**Process**
1. If the user supplied brand colors, fonts or a reference, use them. **Never invent a palette or font they did not choose; ask for them.** Ask for: brand colors, fonts, one or two reference products they like, and the mood in three words.
2. Write the decisions as tokens (CSS variables / theme file) with a one-line rationale each.
3. Only then write markup, using tokens exclusively. No raw hex or arbitrary pixel values in components.
4. Sanity check: cover the logo; can you still tell whose product this is? If it could be any SaaS, one axis is undecided.

```css
:root {
  /* type */   --font-display: "…"; --font-body: "…"; --text-base: 16px; --leading-body: 1.55;
  /* color */  --bg: …; --surface: …; --text: …; --text-muted: …; --accent: …; --danger: …;
  /* space */  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  /* finish */ --radius: …; --shadow-1: …; --border: …;
  /* motion */ --ease-out: cubic-bezier(0.23, 1, 0.32, 1); --dur-fast: 150ms;
}
```

## 9. Design System (DESIGN.md)

Writes `DESIGN.md` at the project root from the tokens the project already has, wires them into the code, and points the agent at it so later sessions follow it.

**Steps**
1. **Find existing tokens:** Tailwind config, CSS variables, theme files, component library config, Figma exports. Read what is actually used, not what is documented.
2. **If none exist or they are incomplete, stop and ask** the user for brand colors, fonts, references and mood. Do not invent them. Once they answer, run section 8 to turn answers into tokens.
3. **Put tokens in code:** create or update the single source of truth (`:root` variables, `tailwind.config`, `theme.ts`). Replace raw values in components only where the user asked for a migration; otherwise list drift as findings.
4. **Write `DESIGN.md`** with the structure below.
5. **Point the agent at it:** add a line to `CLAUDE.md` / `AGENTS.md` (create if absent): "Before any UI work, read `DESIGN.md` and follow it. Use tokens; no raw color or spacing values." Tell the user you did this.

**DESIGN.md structure**
```markdown
# Design

## Intent
Who it's for, the core job, worst-case failure, density, tone (from section 1).

## Character
The decision for each axis and why, in one line each.

## Tokens
Type, color (light + dark), space, radius, shadow, motion. Names match the code.

## Hierarchy rules
How primary/secondary/tertiary/destructive actions are styled; heading levels; density.

## Components
Per component: purpose, variants, and required states (loading / empty / error / success / disabled).

## Patterns
Form rules, validation timing, confirmation vs undo, empty-state copy voice, error copy voice.

## Motion
Easings, durations, when NOT to animate, reduced-motion behavior.

## Don't
Explicit anti-patterns for this product (e.g. no gradients, no pure black, no bounce).
```
Keep it under ~200 lines and concrete: values and rules, not adjectives. Later sessions will follow whatever is written, so if a rule is not there it will not be applied. On later runs, update `DESIGN.md` rather than starting over, and list what changed.

---

## Definition of done for any UI work

- [ ] Intent brief exists (who / what / worst case)
- [ ] One primary action per view; hierarchy readable when squinting
- [ ] Every state in section 3 built or consciously excluded
- [ ] Forms follow section 4; errors are recoverable
- [ ] Every interaction acknowledges within 100ms; destructive actions have undo or confirm
- [ ] Tokens used throughout; no framework-default look
- [ ] Keyboard, focus, contrast and reduced-motion checked

## Credit

Section 6 and parts of sections 5 and 8 draw on Emil Kowalski's skills (https://github.com/emilkowalski/skills), used under the MIT License. Copyright (c) 2026 Emil Kowalski. Permission notice: https://github.com/emilkowalski/skills/blob/main/LICENSE
