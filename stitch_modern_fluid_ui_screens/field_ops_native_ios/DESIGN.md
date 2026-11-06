---
name: Field Ops Native iOS
colors:
  surface: '#faf9fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#414755'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006e28'
  on-secondary: '#ffffff'
  secondary-container: '#6ffb85'
  on-secondary-container: '#00732a'
  tertiary: '#894d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ac6300'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#72fe88'
  secondary-fixed-dim: '#53e16f'
  on-secondary-fixed: '#002107'
  on-secondary-fixed-variant: '#00531c'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#ffb874'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3b00'
  background: '#faf9fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  large-title:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
  title-1:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  title-2:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  title-3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 25px
  headline:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  body:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
  callout:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 21px
  subheadline:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  footnote:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption-1:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption-2:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 13px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-precision, tactile, native iOS experience engineered for the rugged reality of job sites and supply warehouse management. It brings Apple Human Interface Guidelines (HIG) fidelity to construction superintendents, warehouse keepers, and field engineers.

The aesthetic fuses Apple's clean, functional Modernism with industrial utility:
- **Atmosphere:** Utilitarian, pristine, authentic iOS native behavior, and high-efficiency workflows.
- **Form Factor Prioritization:** Handheld iPhone usage under varied ambient daylight, one-handed thumb reachability, and high legibility through disciplined visual density.
- **Physical Metaphor:** Inset Grouped lists and cards mimic precision clipboards and clean field manifests, avoiding clutter while supporting rapid scanning and batch actions.

## Colors

The palette directly adopts the Apple Human Interface Guidelines dynamic semantic system for iOS Light Mode:

- **System Backgrounds:**
  - `systemGroupedBackground` (`#F2F2F7`): Root canvas tone for the app screen, delivering soft contrast behind grouped cards.
  - `secondarySystemGroupedBackground` (`#FFFFFF`): Pure white interior card, row, and sheet background.
  - `tertiarySystemGroupedBackground` (`#FFFFFF`): Nested inputs, search bars, and inner modules.

- **System Accents & Semantics:**
  - **Primary Accent (`#007AFF` - iOS System Blue):** Interactive actions, primary CTA controls, active tab indicators, and selections.
  - **Success (`#34C759` - iOS System Green):** Completed deliveries, approved inspections, verified inventory counts.
  - **Warning (`#FF9500` - iOS System Amber):** Low stock alerts, pending approvals, critical field notes.
  - **Destructive / Error (`#FF3B30` - iOS System Red):** Missing assets, discrepancies, batch rejections, hard deletes.

- **Labels & Separators:**
  - `label` (`#000000` at 100% or `#1C1C1E`): High-legibility text hierarchy.
  - `secondaryLabel` (`#3C3C43` with 60% opacity / `#8E8E93`): Supporting metadata and units of measure.
  - `separator` (`#E5E5EA`): Ultrafine structural division between table view rows and card perimeters.

## Typography

The type system mirrors Apple's Dynamic Type scale using **Inter** to ensure geometric clarity and optical balance across varying screen sizes:

- **Large Titles (`large-title`):** Rendered at 34px bold, anchoring primary root navigation bars (e.g., "Almoxarifado", "Entregas"). Upon scrolling, these dynamically collapse into the inline navigation bar title.
- **Numbers & Metrics:** Inventory quantities, serial tags, and structural counts utilize tabular figures (`tnum`) to maintain vertical alignment in tables and material checklists.
- **Hierarchy Rules:** Never use more than three distinct type sizes within a single card element. Use weight variation (`600` vs `400`) within the standard 17px body scale to differentiate labels from field values.

## Layout & Spacing

Layout adheres strictly to Apple's **Inset Grouped** composition model:

- **Screen Margins:** Fixed 16px (`1rem`) horizontal margin across all standard iPhone viewports, anchoring inset grouped cards away from device display edges.
- **Vertical Flow:** 
  - Standard spacing between adjacent grouped card blocks is 20px to 24px.
  - Section header titles sit 8px above their grouped cards, styled in uppercase 13px footnote typography with secondary label tinting.
  - Section footers sit 6px below grouped cards to display descriptive field hints.
- **Internal Row Heights & Touch Targets:**
  - Standard single-line list row height is minimum 44px (strictly enforcing Apple touch target standards).
  - Two-line data rows (e.g., Material SKU + Quantity) sit at 60px.
  - Internal card padding is 16px horizontally and 12px vertically.

## Elevation & Depth

Visual depth is achieved through structural contrast, ultrafine borders, and subtle iOS blur and shadow mechanics rather than heavy dropped elevations:

- **Inset Grouped Card Surfaces:** 
  Cards sit flat against `#F2F2F7` using pure `#FFFFFF` fill with an ultrafine 0.5px hairline stroke of `#E5E5EA`. No ambient shadow is applied to resting cards, preserving crisp delineation.
- **Floating Modals & Action Sheets:**
  - Bottom sheets and detached floating bar modules employ an ambient shadow: `box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.08)`.
  - Sheet handles feature a centered pill (36px wide by 5px tall) in `#D1D1D6` with 2.5px radius.
- **Navigation & Toolbars:**
  - Apple Frosted Glass (`UIBlurEffect.systemMaterialLight`): 20px Gaussian blur with 80% opacity `#FFFFFF` background, paired with a bottom hairline border (`#E5E5EA`).

## Shapes

The design system uses continuous curvature (Apple squircle):

- **Inset Grouped Cards:** Corner radius of 16px (`1rem`), matching iOS 16/17/18 grouped table view specifications.
- **Buttons & Text Fields:** Roundedness of 12px (`0.75rem`) for standard controls, providing a soft yet functional tool-like feel.
- **Status Pills & Tags:** Fully circular capsule (`9999px`) roundedness for inventory state indicators (e.g., "Em Trânsito", "Recebido").
- **Segmented Controls:** 8px continuous corner radius for track and inner sliding selectors.

## Components

### Buttons
- **Primary Action (Prominent):** Full-width or inline rounded button with `#007AFF` fill, white bold 17px label, 50px height, and 12px radius. Depressed state triggers an immediate haptic feedback and opacity drop to 80%.
- **Secondary (Tonal):** Fill `#007AFF` with 12% opacity, `#007AFF` label.
- **Destructive:** White surface with `#FF3B30` text, or filled `#FF3B30` for final deletion confirmations.

### Inset Grouped Cards & Lists
- Pure white container with 16px corner radius and 0.5px hairline border (`#E5E5EA`).
- Internal rows are divided by a 0.5px separator line inset by 16px from the left to align cleanly with row text baselines.
- Trailing accessory elements include standard chevron-right arrows (`#C7C7CC`), switches (`UISwitch` with green active state), or detail labels.

### Native Segmented Controls
- Embedded within toolbars or directly below navigation headers.
- Background track is `#E5E5EA` with 8px radius and 2px inner padding.
- Selected segment features a pure white floating thumb with micro-shadow `0px 2px 4px rgba(0,0,0,0.12)`.

### Inventory Status Chips & Pills
- Capsule geometry (`rounded-full`) with 4px vertical and 10px horizontal padding.
- Semi-transparent tinted background (12% opacity of semantic color) paired with bold 12px colored text:
  - Validated / In Stock: `#34C759` background tint and text.
  - Pending / Threshold Warning: `#FF9500` background tint and text.
  - Critical / Missing: `#FF3B30` background tint and text.

### Inputs & Barcode Trigger Fields
- 44px minimum height with `#FFFFFF` or `#F2F2F7` inner fill and 10px corner radius.
- Trailing accessory reserved for native camera barcode/QR scanner launch icon styled in `#007AFF`.

### Bottom Sheets (Modals)
- Non-modal detents (`.medium()` and `.large()`) for contextual stock inspections, inventory adjustments, and worker sign-offs without leaving the screen context.