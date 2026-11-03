# Locket Photobooth — UI Design & Implementation Guidance

## 1. Context and Goals

**Design Intent:** Locket Photobooth must deliver a minimal, high-contrast, dark-first dashboard interface governed strictly by semantic tokens, deterministic seven-state components, and keyboard-first WCAG 2.2 AA accessibility for rapid, error-free delivery.

### Brand & Surface Verification
- **Product:** Locket Photobooth (`https://locket-file.vercel.app/dashboard`)
- **Product Surface:** Authenticated dashboard web application supporting live photobooth session control, capture review, and operator administration.
- **Target Audience:** Authenticated end users managing captured strips/sessions and booth operators monitoring queue, camera, and export workflows under time-sensitive conditions.
- **Baseline Page Component Density (`14-1-1` Profile):** A standard dashboard view renders **14 buttons**, **1 input**, and **1 navigation** landmark. Teams must enforce strict visual hierarchy across these 16 interactive elements so primary booth actions are unmistakable.

### Extraction Diagnostics & Calibration Governance
Automated extraction sampled fewer than 30 visible DOM elements, resulting in low color diversity (`3` colors) and narrow typography variance (`15px–16px`).
- Teams **must** treat all extracted tokens as immutable canonical primitives.
- Teams **must** use the calibrated dark-surface neutral, error, and heading-scale extensions defined in [tokens.json](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/tokens/tokens.json) and [tokens.css](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/styles/tokens.css) to satisfy seven-state differentiation and WCAG 2.2 AA contrast.
- Teams **should** prefer system consistency over local visual exceptions whenever new dashboard panels are introduced; ad-hoc per-screen overrides **must not** be merged.

---

## 2. Design Tokens and Foundations

All primitives and semantic mappings are implemented in [tokens.json](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/tokens/tokens.json) and [tokens.css](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/styles/tokens.css). Raw color literals appear **only** in the primitive layer below; component code **must** consume semantic tokens exclusively.

### 2.1 Primitive Foundation Tokens

| Category | Token Name | Value | Provenance | Usage Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Typography** | `font.family.primary` | `Inter` | Extracted | Primary UI typeface |
| **Typography** | `font.family.stack` | `Inter, sans-serif` | Extracted | Root font-family fallback stack |
| **Typography** | `font.size.xs` | `15px` | Extracted | Navigation labels, helper/error copy, metadata |
| **Typography** | `font.size.sm` | `16px` | Extracted | Button labels and compact controls |
| **Typography** | `font.size.base` | `16px` | Extracted | Body copy and input field text |
| **Typography** | `font.size.md` | `20px` | Calibrated | Panel and card headings |
| **Typography** | `font.size.lg` | `24px` | Calibrated | Dashboard view heading (`h1`) |
| **Typography** | `font.weight.base` | `400` | Extracted | Body copy and input values |
| **Typography** | `font.weight.medium` | `500` | Calibrated | Interactive controls (buttons, nav items) |
| **Typography** | `font.weight.semibold` | `600` | Calibrated | Structural headings |
| **Typography** | `font.lineHeight.xs` | `20px` | Calibrated | Paired with `font.size.xs` |
| **Typography** | `font.lineHeight.base` | `24px` | Extracted | Paired with `font.size.sm` and `font.size.base` |
| **Typography** | `font.lineHeight.md` | `28px` | Calibrated | Paired with `font.size.md` |
| **Typography** | `font.lineHeight.lg` | `32px` | Calibrated | Paired with `font.size.lg` |
| **Color** | `color.surface.base` | `#000000` | Extracted | Root dashboard canvas |
| **Color** | `color.text.primary` | `#fffdf7` | Extracted | Primary warm-white foreground (`20.71:1` on base) |
| **Color** | `color.text.secondary` | `#ffffff` | Extracted | High-emphasis foreground & focus ring (`21.00:1` on base) |
| **Color** | `color.neutral.900` | `#141414` | Calibrated | Elevated card, nav, and input container surface |
| **Color** | `color.neutral.800` | `#1f1f1f` | Calibrated | Interactive hover surface |
| **Color** | `color.neutral.700` | `#2b2b2b` | Calibrated | Interactive active/pressed surface |
| **Color** | `color.neutral.600` | `#525252` | Calibrated | Disabled foreground and border |
| **Color** | `color.neutral.500` | `#767676` | Calibrated | Default control border (`4.54:1` on base, `3.86:1` on `900`) |
| **Color** | `color.neutral.400` | `#949494` | Calibrated | Muted/placeholder text (`6.97:1` on base, `5.92:1` on `900`) |
| **Color** | `color.neutral.200` | `#e6e4de` | Calibrated | Active/pressed fill for inverted primary button (`16.4:1` vs base) |
| **Color** | `color.red.400` | `#ff6b6b` | Calibrated | Error foreground and border (`7.43:1` on base, `6.31:1` on `900`) |
| **Color** | `color.red.950` | `#2d0a0a` | Calibrated | Subtle error background surface |
| **Spacing** | `space.1` | `2px` | Extracted | Focus ring width and focus ring offset |
| **Spacing** | `space.2` | `6px` | Extracted | Icon-to-label gap, helper text top margin, tight item gap |
| **Spacing** | `space.3` | `12px` | Extracted | Button/nav block padding, dense toolbar gap |
| **Spacing** | `space.4` | `14px` | Extracted | Input block padding |
| **Spacing** | `space.5` | `16px` | Extracted | Control inline padding, standard card/grid gap |
| **Spacing** | `space.6` | `22px` | Extracted | Primary pill CTA inline padding |
| **Spacing** | `space.7` | `24px` | Extracted | Page container padding and major section separation |
| **Radius** | `radius.xs` | `14px` | Extracted | Inputs and compact utility/ghost buttons |
| **Radius** | `radius.sm` | `16px` | Extracted | Cards, navigation bar container, secondary buttons |
| **Radius** | `radius.md` | `50px` | Extracted | Primary CTA pills and active navigation pills |
| **Shadow** | `shadow.1` | `rgba(0, 0, 0, 0.15) 0px 0px 0px 1px, rgba(0, 0, 0, 0.15) 0px 0px 0px 1px inset` | Extracted | Structural hairline definition |
| **Motion** | `motion.duration.instant` | `150ms` | Extracted | Hover and active color/border micro-transitions |
| **Motion** | `motion.duration.fast` | `180ms` | Extracted | Focus-visible and input validation state transitions |
| **Motion** | `motion.duration.normal` | `200ms` | Extracted | Active navigation pill and popover transitions |
| **Motion** | `motion.duration.slow` | `350ms` | Extracted | Drawer, sheet, or layout transitions |
| **Motion** | `motion.easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | Calibrated | Standard deterministic transition curve |
| **Sizing** | `size.control.compactMin` | `36px` | Calibrated | Desktop fine-pointer hit-target height floor |
| **Sizing** | `size.control.touchMin` | `44px` | Calibrated | Touch/coarse-pointer and input height floor |

### 2.2 Semantic Token Architecture

| Semantic Token | Maps To Primitive | Verified Contrast | Mandatory Role |
| :--- | :--- | :--- | :--- |
| `semantic.surface.canvas` | `color.surface.base` | Baseline | Root viewport and full-bleed workspace background |
| `semantic.surface.elevated` | `color.neutral.900` | Subtle step | Cards, navigation container, default input background |
| `semantic.surface.hover` | `color.neutral.800` | Interactive step | Hover background for dark controls and nav items |
| `semantic.surface.active` | `color.neutral.700` | Interactive step | Pressed background for dark controls and nav items |
| `semantic.surface.errorSubtle` | `color.red.950` | `16.4:1` w/ primary text | Error background tint for invalid inputs and failed actions |
| `semantic.text.primary` | `color.text.primary` | `20.71:1` on canvas | Default body copy, input values, secondary button labels |
| `semantic.text.emphasis` | `color.text.secondary` | `21.00:1` on canvas | Headings, hovered labels, active status text |
| `semantic.text.muted` | `color.neutral.400` | `5.92:1` on elevated | Secondary metadata, inactive nav items, input placeholders |
| `semantic.text.inverse` | `color.surface.base` | `20.71:1` on primary CTA | Foreground text/icons on `semantic.action.primary.bgDefault` |
| `semantic.text.disabled` | `color.neutral.600` | Exempt (WCAG 1.4.3) | Disabled labels and icons paired with `disabled` attribute |
| `semantic.text.error` | `color.red.400` | `6.31:1` on elevated | Inline validation messages, error badges, destructive labels |
| `semantic.border.default` | `color.neutral.500` | `3.86:1` on elevated | Default input, card, and secondary button borders |
| `semantic.border.emphasis` | `color.text.secondary` | `21.00:1` on canvas | Hovered input/button borders and active selection outlines |
| `semantic.border.disabled` | `color.neutral.600` | Exempt (WCAG 1.4.11) | Disabled control outlines |
| `semantic.border.error` | `color.red.400` | `6.31:1` on elevated | Invalid input border and error-state button border |
| `semantic.focus.ringColor` | `color.text.secondary` | `21.00:1` on canvas | `:focus-visible` outline color across all interactive elements |
| `semantic.focus.ringWidth` | `space.1` | `2px` solid | `:focus-visible` outline thickness |
| `semantic.focus.ringOffset` | `space.1` | `2px` offset | `:focus-visible` separation gap from element border box |
| `semantic.action.primary.bgDefault` | `color.text.primary` | `20.71:1` vs canvas | Primary CTA default background |
| `semantic.action.primary.bgHover` | `color.text.secondary` | `21.00:1` vs canvas | Primary CTA hover background |
| `semantic.action.primary.bgActive` | `color.neutral.200` | `16.40:1` vs inverse fg | Primary CTA pressed background |
| `semantic.action.primary.fgDefault` | `color.surface.base` | `20.71:1` on primary bg | Primary CTA text and icon color |
| `semantic.action.secondary.bgDefault` | `color.neutral.900` | Paired w/ `border.default` | Secondary button fill |
| `semantic.action.ghost.bgHover` | `color.neutral.800` | Interactive feedback | Utility/ghost button hover surface |
| `semantic.action.destructive.fgDefault` | `color.red.400` | `5.65:1` on `errorSubtle` | Destructive action foreground |

### 2.3 Foundation Rules
- **Spacing Discipline:** Layouts and components **must** use only `space.1` through `space.7`. Arbitrary pixel values, negative margins, or off-scale gaps **must not** be used.
- **Typography Discipline:** Body and form controls **must** render at `font.size.base` (`font.lineHeight.base`) to prevent mobile browser auto-zoom on focus and maintain operator legibility. Compact labels **must** not drop below `font.size.xs`.
- **Motion Discipline:** State transitions **must** bind to `motion.duration.instant` through `motion.duration.slow` with `motion.easing.standard`. When `@media (prefers-reduced-motion: reduce)` matches, all motion duration tokens **must** resolve to `0ms`.

---

## 3. Component-Level Rules

> **Non-Negotiable Token Rule:** Component implementations **must** consume semantic and foundation tokens only. Raw color literals are strictly prohibited in component stylesheets, JSX styles, or variant maps.

### 3.1 Dashboard Density & Hierarchy Governance (`14-1-1` Budget)
Because the Locket Photobooth dashboard renders **14 buttons, 1 input, and 1 navigation** container in a single workspace:
1. **Primary CTA (`max 1` per view):** Exactly one button **must** use the `Primary` variant (e.g., *Start Session* or *Export Strip*).
2. **Secondary Actions (`2–4` per view):** Batch or session-level actions (e.g., *Download All*, *Retake*, *Share Link*) **must** use the `Secondary` variant.
3. **Ghost / Utility Controls (`8–10` per view):** Dense operator tools, filter toggles, frame selectors, pagination, and per-item actions **must** use the `Ghost` variant so visual noise stays low.
4. **Destructive Actions (`0–1` visible per view):** Irreversible operations (e.g., *Delete Session*) **must** use the `Destructive` variant and **must** require explicit confirmation before execution.
5. **Single Input (`1` per view):** The sole dashboard `<input>` **must** stay persistently accessible in the primary toolbar without requiring a modal to reveal it.
6. **Single Navigation (`1` per view):** Global view switching **must** live inside one `<nav aria-label="Primary">` landmark and **must not** be duplicated in footer or floating bars.

---

### 3.2 Button (`lp-btn`)

#### Anatomy
1. **Container:** Semantic `<button type="button">` (or `type="submit"` inside forms).
2. **Leading Slot (Optional):** `16px × 16px` SVG icon with `aria-hidden="true"`, separated from label by `space.2`.
3. **Label:** Single-line action text (`font.family.stack`, `font.size.sm`, `font.weight.medium`, `font.lineHeight.base`).
4. **Status Slot (Conditional):** Inline spinner (`aria-hidden="true"`) rendered during `loading` state while preserving button width.

#### Variants & Token Bindings
- **Primary:** Background `semantic.action.primary.bgDefault`, foreground `semantic.action.primary.fgDefault`, radius `radius.md`, padding `space.3` (block) × `space.6` (inline), shadow `shadow.1`.
- **Secondary:** Background `semantic.action.secondary.bgDefault`, border `1px solid semantic.border.default`, foreground `semantic.text.primary`, radius `radius.sm`, padding `space.3` × `space.5`, shadow `shadow.1`.
- **Ghost (Utility):** Background transparent, border transparent, foreground `semantic.text.primary`, radius `radius.xs`, padding `space.3` × `space.5`, no shadow.
- **Destructive:** Background `semantic.surface.errorSubtle`, border `1px solid semantic.border.error`, foreground `semantic.action.destructive.fgDefault`, radius `radius.sm`, padding `space.3` × `space.5`.

#### Seven-State Specification
| State | Visual & Token Behavior | DOM / ARIA Contract |
| :--- | :--- | :--- |
| **`default`** | Variant default background, foreground, and border tokens; `min-height: size.control.compactMin` (`size.control.touchMin` on coarse pointers). | Native `<button>`; icon-only utility buttons **must** define explicit `aria-label`. |
| **`hover`** | Primary shifts to `semantic.action.primary.bgHover`; Secondary/Destructive shift to `semantic.surface.hover` with `semantic.border.emphasis`; Ghost shifts to `semantic.action.ghost.bgHover` over `motion.duration.instant`. | Triggered on fine pointer `:hover` only when not disabled or busy. |
| **`focus-visible`** | Renders `semantic.focus.ringWidth` solid `semantic.focus.ringColor` with `semantic.focus.ringOffset` outer gap over `motion.duration.fast`. | Triggered via keyboard `:focus-visible`; focus ring **must** never be clipped by parent `overflow: hidden`. |
| **`active`** | Primary shifts to `semantic.action.primary.bgActive`; Secondary/Ghost/Destructive shift to `semantic.surface.active`. No layout-shifting scale transforms **should** exceed subtle internal feedback. | Active during pointer press or `Space`/`Enter` keydown. |
| **`disabled`** | Background `semantic.surface.elevated`, border `semantic.border.disabled`, foreground `semantic.text.disabled`, `cursor: not-allowed`. | Uses native `disabled` (or `aria-disabled="true"` when focus retention in toolbars is required). Click/key activation **must** be suppressed. |
| **`loading`** | Retains variant dimensions, replaces leading icon (or prepends spinner) with `space.2` gap, locks pointer activation, sets `cursor: progress`. | Sets `aria-busy="true"` and announces status via polite live region if operation exceeds `motion.duration.slow`. |
| **`error`** | Shifts background to `semantic.surface.errorSubtle`, border to `semantic.border.error`, and foreground to `semantic.text.error`. | Sets `data-state="error"` and pairs with an accessible error message in `role="alert"` or adjacent inline status text; user **must** be able to retry via keyboard/pointer. |

#### Interaction & Responsive Rules
- **Keyboard:** Focusable in logical DOM tab order; `Enter` and `Space` **must** activate the button. Inside dense utility toolbars (`8–10` Ghost buttons), teams **should** group related toggle controls with roving `tabindex` (`ArrowLeft`/`ArrowRight`) to accelerate traversal across the 14-button page budget.
- **Pointer:** Entire padded bounding box **must** be clickable; cursor **must** be `pointer` in interactive states and `not-allowed` when disabled.
- **Touch:** On `@media (pointer: coarse)`, `min-height` and `min-width` **must** expand to `size.control.touchMin` with at least `space.2` separation between adjacent buttons.
- **Long-Content & Overflow:** Labels **must** remain single-line (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`) up to `max-width: 100%`. On narrow mobile viewports (`< 640px`), primary/secondary action bars **should** stack full-width with `space.3` vertical gap rather than clipping text.

---

### 3.3 Input (`lp-input-field`)

#### Anatomy
1. **Field Wrapper:** Vertical stack with `space.2` gap between label, control box, and helper/error message.
2. **Visible Label:** Explicit `<label for="...">` rendered in `font.size.xs`, `font.weight.medium`, `semantic.text.primary` (or visually persistent search icon + `aria-label` when space-constrained in toolbar).
3. **Input Control:** Native `<input>` with padding `space.4` (block) × `space.5` (inline), `min-height: size.control.touchMin`, radius `radius.xs`, typography `font.size.base` / `font.weight.base` / `font.lineHeight.base`.
4. **Trailing Action / Status Slot (Optional):** Clear button (`Ghost` icon button) or async validation spinner separated by `space.2`.
5. **Helper / Error Text:** Persistent `<p id="...">` in `font.size.xs` / `font.lineHeight.xs` linked via `aria-describedby`.

#### Variants & Token Bindings
- **Standard Text Input:** Single-line session code, caption, or operator note field on `semantic.surface.elevated` with `1px solid semantic.border.default`.
- **Search / Filter Input (Dashboard Default):** Includes leading search glyph (`semantic.text.muted`) and conditional clear button when value is non-empty.

#### Seven-State Specification
| State | Visual & Token Behavior | DOM / ARIA Contract |
| :--- | :--- | :--- |
| **`default`** | Background `semantic.surface.elevated`, border `semantic.border.default`, value `semantic.text.primary`, placeholder `semantic.text.muted`. | Bound to `<label>` via `for`/`id`; `autocomplete` and `inputmode` **must** match expected data. |
| **`hover`** | Background `semantic.surface.hover`, border `semantic.border.emphasis` over `motion.duration.fast`. | Applies only when enabled and not invalid. |
| **`focus-visible`** | Outline `semantic.focus.ringWidth` solid `semantic.focus.ringColor` with `semantic.focus.ringOffset` offset; border `semantic.border.emphasis`. | Caret visible; placeholder **must not** replace the accessible label. |
| **`active`** | Background `semantic.surface.active` during pointer down/selection drag. | Native text selection contrast **must** remain legible. |
| **`disabled`** | Background `semantic.surface.canvas`, border `semantic.border.disabled`, text `semantic.text.disabled`, `cursor: not-allowed`. | Native `disabled` attribute; skipped in `Tab` sequence. |
| **`loading`** | Preserves entered value legibility (`semantic.text.primary`), renders trailing inline spinner, border `semantic.border.emphasis`. | Sets `aria-busy="true"` on input or wrapper during debounced filter/lookup; **must not** steal keyboard focus or block typing. |
| **`error`** | Background `semantic.surface.errorSubtle`, border `semantic.border.error`, below-field message in `semantic.text.error` prefixed with warning icon (`aria-hidden="true"`). | Sets `aria-invalid="true"` and links error message ID via `aria-describedby`. Error state **must not** rely on border color alone. |

#### Interaction & Responsive Rules
- **Keyboard:** `Tab` focuses input; standard text editing keys apply; `Escape` in Search/Filter variant **should** clear non-empty query or dismiss suggestions while keeping focus inside the input.
- **Pointer:** Clicking label or anywhere within the padded input box focuses the text cursor.
- **Touch:** `min-height: size.control.touchMin` and `font.size.base` (`16px`) **must** be preserved on all breakpoints to prevent unintended iOS/iPadOS viewport zoom during booth operation.
- **Long-Content, Overflow & Empty State:** Long single-line strings scroll horizontally inside the input without expanding container width. When a filter query yields zero dashboard matches, an explicit empty-state panel **must** render below with a *Clear filter* `Secondary` button that resets the input and restores focus.

---

### 3.4 Navigation (`lp-nav`)

#### Anatomy
1. **Landmark Container:** Single `<nav aria-label="Primary">` styled with `semantic.surface.elevated`, border `1px solid semantic.border.default`, radius `radius.sm`, padding `space.3`, item gap `space.2`.
2. **Nav List:** Semantic `<ul>` / `<li>` containing route links (`<a href="...">`).
3. **Nav Item:** Inline-flex anchor with padding `space.3` (block) × `space.5` (inline), radius `radius.md`, typography `font.size.xs` / `font.weight.medium` / `font.lineHeight.xs`, optional leading `16px` icon (`space.2` gap) and trailing count/status badge.

#### Variants & Token Bindings
- **Horizontal Top Bar (Default Desktop/Tablet):** Inline pill bar aligned with workspace header (`space.7` outer margin/padding).
- **Compact Overflow Bar (`< 640px`):** Horizontally scrollable pill rail (`overflow-x: auto`, scrollbars unobtrusive, touch-pan enabled) with unclipped focus ring clearance (`space.1` + `space.1`).

#### Seven-State Specification
| State | Visual & Token Behavior | DOM / ARIA Contract |
| :--- | :--- | :--- |
| **`default`** | Inactive items render transparent background with `semantic.text.muted`; current route pill renders `semantic.action.primary.bgDefault` with `semantic.action.primary.fgDefault`. | Current route **must** set `aria-current="page"`. |
| **`hover`** | Inactive item background shifts to `semantic.surface.hover` and label shifts to `semantic.text.emphasis` over `motion.duration.normal`. | Pointer `:hover` on non-current, enabled links. |
| **`focus-visible`** | Renders `semantic.focus.ringWidth` solid `semantic.focus.ringColor` with `semantic.focus.ringOffset` outer gap. | Triggered via keyboard `Tab` traversal. |
| **`active`** | Inactive item shifts to `semantic.surface.active`; current route pill shifts to `semantic.action.primary.bgActive`. | Triggered on pointer press or `Enter` key activation. |
| **`disabled`** | Label `semantic.text.disabled`, transparent background, `cursor: not-allowed`. | Uses `aria-disabled="true"`, omits `href` (or blocks navigation), removes from tab order (`tabindex="-1"`) unless explanatory tooltip is required. |
| **`loading`** | Target destination item displays `semantic.text.emphasis` and inline trailing spinner during async route fetch over `motion.duration.normal`. | Sets `aria-busy="true"` on pending link and updates polite route-announcer region on completion. |
| **`error`** | Renders `1px solid semantic.border.error` and `semantic.text.error` status dot/label when a linked booth subsystem (e.g., *Camera Feed* or *Print Queue*) fails health checks, or when route prefetch fails. | Sets `data-state="error"` and appends accessible status text (e.g., `"(Attention required)"`) inside visually available or `aria-label` description without blocking navigation to recover the fault. |

#### Interaction & Responsive Rules
- **Keyboard:** First interactive stop after the *Skip to main content* link. `Tab` / `Shift+Tab` moves sequentially through links; `Enter` activates route navigation.
- **Pointer & Touch:** Full pill hit target (`min-height: size.control.compactMin` on desktop, `size.control.touchMin` on coarse touch devices).
- **Long-Content, Overflow & Empty State:** Labels **must** be concise (`1–2` words) with `white-space: nowrap`. If localized labels overflow `< 640px` width, the `<nav>` **must** scroll horizontally with keyboard focus automatically scrolling focused items into view (`scroll-margin-inline: space.5`). If an authenticated user lacks role permissions for optional tabs, unauthorized items **must** be omitted cleanly rather than rendering an empty `<nav>` shell; at least one home/dashboard route **must** remain present.

---

## 4. Accessibility Requirements and Testable Acceptance Criteria

### Core WCAG 2.2 AA Mandates
1. **Keyboard-First Determinism (WCAG 2.1.1, 2.1.2, 2.4.3):** Every interactive control across the `14-1-1` dashboard profile **must** be operable exclusively via keyboard with zero keyboard traps. A *Skip to main content* link **must** be the first focusable element on the page, becoming visible on `:focus-visible`.
2. **Focus Visibility & Non-Obscuration (WCAG 2.4.7, 2.4.11):** Focus indicators **must** use `semantic.focus.ringWidth` (`2px`) solid `semantic.focus.ringColor` with `semantic.focus.ringOffset` (`2px`) offset (`21.00:1` contrast against `semantic.surface.canvas`), and sticky headers/toolbars **must not** obscure focused elements.
3. **Color & Non-Text Contrast (WCAG 1.4.3, 1.4.11):** Normal text **must** maintain `>= 4.5:1` contrast (`>= 3.0:1` for `>= 24px` or `>= 19px` bold). Interactive boundaries (`semantic.border.default`), icons conveying meaning, and focus rings **must** maintain `>= 3.0:1` contrast against adjacent surfaces.
4. **Target Size & Pointer Cancellation (WCAG 2.5.2, 2.5.8):** All interactive targets **must** meet or exceed `24px × 24px` CSS pixels (`36px` fine-pointer floor via `size.control.compactMin`; `44px × 44px` touch floor via `size.control.touchMin`), and actions **must** fire on `click`/up-event rather than raw `mousedown`/`touchstart`.

### Testable Acceptance Criteria (Pass / Fail Matrix)

| ID | Criterion (WCAG 2.2 AA) | Automated / Manual Verification Method | Pass Condition | Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **A11Y-01** | **Text Contrast (1.4.3)** | Run `axe-core` + inspect computed foreground/background pairs across all 7 states. | All enabled body/control text >= `4.5:1` (`semantic.text.primary` = `20.71:1`, `semantic.text.muted` = `5.92:1`, `semantic.text.error` = `6.31:1`). | Any enabled text/placeholder required for comprehension falls below `4.5:1`. |
| **A11Y-02** | **UI Boundary & Focus Contrast (1.4.11, 2.4.7)** | Tab through all 16 dashboard controls (`1` nav, `1` input, `14` buttons) and measure border/outline luminance. | Every `:focus-visible` ring (`21:1`) and input/secondary button border (`3.86:1+`) >= `3.0:1` and fully unclipped. | `outline: none` without high-contrast replacement, clipped focus ring, or border < `3.0:1`. |
| **A11Y-03** | **Keyboard-Only Completion (2.1.1, 2.4.3)** | Unplug pointer; navigate via `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape` from top of document. | Skip link -> Navigation (`1`) -> Input (`1`) -> Buttons (`14`) traversed in visual order; all actions fire and modals restore focus on close. | Any control unreachable by keyboard, illogical focus jump, or focus lost to `<body>` after async state change. |
| **A11Y-04** | **Focus Not Obscured (2.4.11)** | Set viewport to `1280×720` at `200%` zoom; `Tab` through entire page. | Focused element is never fully hidden behind sticky `<nav>` or floating action bars. | Sticky bar overlaps `100%` of focused control bounding box. |
| **A11Y-05** | **Target Size Minimum (2.5.8)** | Measure `getBoundingClientRect()` on all 14 buttons, nav items, and input clear control. | Fine pointer >= `36×36px` (exceeding `24×24px` AA); coarse pointer (`pointer: coarse`) >= `44×44px` or >= `24px` with mandated spacing. | Any interactive hit box < `24×24px` or overlapping adjacent hit targets. |
| **A11Y-06** | **Non-Color Error & Busy States (1.4.1, 4.1.2)** | Trigger invalid input and failed/loading button states with grayscale filter + NVDA/VoiceOver active. | Invalid input sets `aria-invalid="true"` + visible icon/text via `aria-describedby`; loading sets `aria-busy="true"`. | Error indicated by border color shift alone, or duplicate submissions allowed while `loading`. |
| **A11Y-07** | **Reflow & Reduced Motion (1.4.10, 2.3.3)** | Resize viewport to `320px` CSS width and toggle OS `Reduce motion` setting. | Zero two-dimensional scrolling for primary content; computed `transition-duration` equals `0s`. | Horizontal page overflow clipping controls, or animated transitions persisting under `prefers-reduced-motion: reduce`. |

---

## 5. Content and Tone Standards

Dashboard microcopy **must** be concise, confident, and implementation-focused. Operators and photobooth users read labels at arm's length under booth lighting; every word **must** earn its space.

### Authoring Rules
- **Action Labels:** Buttons **must** use explicit `Verb + Noun` phrasing (`1–3` words) in sentence case. Icon-only utility buttons **must** expose the exact same `Verb + Noun` string via `aria-label`.
- **Navigation Labels:** Navigation items **must** use short noun destinations (`1–2` words) representing persistent views, never commands.
- **Error Copy:** Validation and system errors **must** state *what failed* and *how to fix it* in one sentence, free of blame or raw HTTP codes.
- **Empty & Loading Copy:** Empty states **must** explain why no items appear and provide one direct recovery action if applicable.

### Microcopy Examples (Do vs. Don't)

| Surface / State | Do (Concise, Explicit, Actionable) | Don't (Ambiguous, Verbose, or Jargon) |
| :--- | :--- | :--- |
| **Primary Button** | `Start session` / `Export photo strip` | `Go` / `Click here` / `Submit` |
| **Utility / Ghost Button** | `Mirror camera` (`aria-label="Mirror camera preview"`) | Icon with no `aria-label` or `Toggle` |
| **Destructive Button** | `Delete strip` -> Confirm: `Delete photo strip` / `Keep strip` | `Remove` -> Confirm: `Yes` / `No` |
| **Dashboard Input** | Label: `Filter sessions` · Placeholder: `Session code or guest name` | No label · Placeholder: `Type here...` |
| **Input Error State** | `Enter a 6-character session code (letters and numbers only).` | `Invalid input.` / `Error 422: regex mismatch` |
| **Button Loading State** | `Uploading strip…` (`aria-busy="true"`) | `Please wait while we process your request...` |
| **Navigation Items** | `Sessions`, `Live booth`, `Templates`, `Settings` | `Manage Your Sessions`, `Go to Booth`, `Misc` |
| **Empty Filter State** | `No sessions match "LK-902".` + Button: `Clear filter` | `Nothing found.` (with no recovery path) |

---

## 6. Anti-Patterns, Migration Notes, and Edge-Case Handling

### 6.1 Prohibited Implementations (`Must Not` Ship)
- **Raw Color Literals in Components:** Teams **must not** hardcode hex/RGB values in component CSS, Tailwind arbitrary brackets, or inline `style` props.
- **Primary Button Proliferation:** Teams **must not** render more than `1` `Primary` pill button per dashboard viewport; rendering 14 high-contrast white pills destroys scannability.
- **Hidden or Low-Contrast Focus Rings:** Teams **must not** apply `outline: none` or `outline: 0` without immediately applying the `semantic.focus.*` ring contract.
- **Placeholder-as-Label Inputs:** Teams **must not** omit `<label>` or `aria-label` on the dashboard input, relying solely on disappearing `placeholder` text.
- **Off-Scale Spacing or Sub-15px Text:** Teams **must not** introduce `10px`/`11px`/`12px` micro-badges or arbitrary padding values outside `space.1`–`space.7`.
- **Unprotected Async Triggers:** Teams **must not** leave capture, upload, or print buttons clickable while an async request is in flight (`aria-busy="true"` lock required).

### 6.2 Migration Playbook (Ad-Hoc CSS → Token System)
1. **Import Foundation Stylesheet:** Load [tokens.css](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/styles/tokens.css) at the application root prior to route/component stylesheets, or ingest [tokens.json](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/tokens/tokens.json) into Style Dictionary / CSS variable build pipelines.
2. **Audit & Replace Hardcoded Styles:** Map legacy pure-black backgrounds to `var(--semantic-surface-canvas)`, off-white/white text to `var(--semantic-text-primary)` / `var(--semantic-text-emphasis)`, and ad-hoc translucent borders (`rgba(255,255,255,0.1)` which fail WCAG 1.4.11 `3:1` contrast!) to `var(--semantic-border-default)`.
3. **Rebalance the `14-1-1` Dashboard Actions:** Audit all 14 existing dashboard buttons; promote the primary workflow trigger to `.lp-btn--primary`, demote secondary actions to `.lp-btn--secondary`, and convert toolbar/grid controls to `.lp-btn--ghost`.
4. **Backfill Missing States:** Ensure every migrated `<button>`, `<input>`, and `<nav>` item explicitly wires `disabled`, `aria-busy="true"` (`loading`), and `aria-invalid="true"` / `data-state="error"` (`error`) handlers.

### 6.3 Edge-Case Handling Matrix

| Edge Case | Required System Behavior |
| :--- | :--- |
| **Rapid Double-Click / Enter Spam on Capture or Export** | Synchronously set `aria-busy="true"` and ignore subsequent pointer/key events on first activation until promise settles; preserve button width to prevent toolbar reflow. |
| **Long Guest Names / Localized German or Vietnamese Strings** | Buttons truncate at single line (`text-overflow: ellipsis`) with full context preserved in `title`/accessible context; cards wrap headings up to `2` lines before truncating; `<nav>` enables horizontal scroll without clipping `:focus-visible` outlines. |
| **Zero Captures / First-Run Dashboard Empty State** | Render centered elevated panel (`semantic.surface.elevated`, padding `space.7`, radius `radius.sm`) containing a clear status heading (`font.size.md`), 1-sentence guidance (`semantic.text.muted`), and the single `Primary` CTA (`Start session`). |
| **Camera / Printer Hardware Disconnect Mid-Session** | Flag relevant `<nav>` item with `data-state="error"`, transition capture button to `disabled` (with visible reason) or `error` retry state, and announce fault via `role="alert"` banner without clearing the user's filter input. |
| **320px Narrow Viewport / 200% Browser Zoom** | Collapse multi-column session grids to `1` column (`space.5` gap); allow `<nav>` horizontal pill scrolling; stack header `Input (1)` full-width above utility button row. |
| **Windows High Contrast / `forced-colors: active`** | Preserve native `ButtonText` / `Highlight` system colors via `@media (forced-colors: active)` border rules in [tokens.css](file:///c:/Users/nganp/OneDrive/antigarvity/web/locket/styles/tokens.css) so transparent `Ghost` buttons retain visible boundaries. |

---

## 7. QA Checklist

Teams **must** verify every item below before approving dashboard PRs:

- [ ] **Token Purity:** Zero raw hex/RGB color values, off-scale spacing values, or unapproved font sizes appear in component files (`git grep -E "#[0-9a-fA-F]{3,8}"` passes outside primitive token definitions).
- [ ] **Complete 7-State Coverage:** Every `Button`, `Input`, and `Navigation` instance visually and programmatically supports `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, and `error`.
- [ ] **`14-1-1` Density Hierarchy:** Dashboard views contain at most `1` `Primary` CTA button, `1` persistent `<nav aria-label="Primary">` landmark, and `1` labeled primary `<input>`, with utility controls using `Ghost` / `Secondary` variants.
- [ ] **Contrast Verification:** All enabled text passes `>= 4.5:1` contrast and all interactive borders, icons, and focus rings pass `>= 3.0:1` contrast against their immediate background surface.
- [ ] **Keyboard-First Walkthrough:** Full user journey (Skip link → Navigation → Filter Input → All 14 Buttons → Error Recovery) completes via keyboard alone with unclipped `2px` `:focus-visible` rings.
- [ ] **Touch & Zoom Ergonomics:** Input font size is `>= 16px` (`font.size.base`), coarse-pointer touch targets measure `>= 44×44px`, and layout reflows cleanly at `320px` width and `200%` zoom.
- [ ] **Motion & High-Contrast Safety:** `prefers-reduced-motion: reduce` collapses transition durations to `0ms`, and `forced-colors: active` preserves visible control borders.
- [ ] **Content Standards:** All buttons use explicit `Verb + Noun` labels (including `aria-label` on icon-only buttons), errors explain recovery steps, and empty states provide a clear next action.

