# styling.md — invite.markets

This document defines the visual style + Tailwind conventions for **invite.markets**.
Goal: **dark-mode first**, **premium**, **crypto-native**, **visually striking**, **memorable**, **intentional**.

---

## Brand vibe

**Keywords:** premium, modern, confident, striking, "web3 luxury without being tacky", intentional, editorial.

**Embrace:** Solid colors with strategic accent gradients, varied border radius (not everything rounded-3xl), intentional whitespace, strong typography hierarchy, asymmetric layouts, subtle animations, personality.

**Avoid:** Gradient overload, everything glassmorphism, generic spacing, flat design, harsh neons, meme aesthetics, excessive noise, slow animations, "vibecoded" aesthetic.

---

## Design anti-patterns to avoid

**The "AI-generated" look:**
- ❌ Gradients on everything (buttons, text, cards, backgrounds)
- ❌ Everything rounded-3xl or rounded-2xl
- ❌ Glassmorphism on every surface
- ❌ Generic 8px spacing everywhere
- ❌ Purple + cyan gradient on repeat
- ❌ No visual hierarchy
- ❌ Too many animations
- ❌ Every card looks identical

**Instead:**
- ✅ Gradients used sparingly for emphasis (hero text, primary CTA only)
- ✅ Mix of sharp edges (rounded-lg, rounded-xl) with occasional rounded corners
- ✅ Mostly solid backgrounds with subtle borders
- ✅ Intentional spacing that creates rhythm
- ✅ Varied color palette with purpose
- ✅ Clear visual hierarchy
- ✅ Animations only on interaction
- ✅ Each section has unique personality

---

## Core design principles

1. **Dark + Intentional Depth**

   - Pure black (`#000000`) background for maximum contrast
   - Subtle layered effects: background orbs stay in background, content is solid
   - Use borders and solid surfaces primarily, not glass everywhere
   - Premium shadows on key elements only

2. **Strategic Gradient Use**

   - **Gradients only for:**
     - Hero title text
     - Primary CTA button
     - Background orbs
   - **NOT for:**
     - Every button
     - Every card header
     - Body text
     - Secondary elements
   - Primary gradient: Cyan to blue (`#06b6d4` → `#3b82f6`)
   - Each gradient should feel intentional, not decorative

3. **Solid over Glass**

   - Default to solid backgrounds: `bg-zinc-900`, `bg-zinc-950`
   - Use subtle borders: `border border-zinc-800` or `border-zinc-700`
   - Glass effect reserved for navbar and modals only
   - Most cards should be solid with good shadows

4. **Varied Border Radius**
   - Hero elements: `rounded-xl` to `rounded-2xl`
   - Cards: `rounded-xl` or `rounded-2xl` (not 3xl)
   - Buttons: `rounded-lg` to `rounded-xl`
   - Badges/pills: `rounded-full`
   - Don't use rounded-3xl by default

5. **Micro-interactions (minimal)**
   - Hover: subtle scale (1.02) or translate-y
   - Focus states with ring
   - Icon animations on hover only
   - No constant pulsing or animating
   - Glow effects on hover only

---

## Tailwind color system

### Background + surfaces

- **Page background:** `bg-black` (pure black)
- **Card backgrounds:** `bg-zinc-950` or `bg-zinc-900` (solid, not glass)
- **Card borders:** `border border-zinc-800` (subtle), `border-zinc-700` (medium)
- **Interactive borders:** `hover:border-zinc-600` or `hover:border-cyan-500/50`
- **Elevated surfaces:** `bg-zinc-900` with `shadow-xl`
- **Glass (use sparingly):** navbar, modals, overlays only

### Text hierarchy

- **Hero/Display:** `text-white` (pure white for maximum impact)
- **Headings:** `text-zinc-100` or `text-white`
- **Body text:** `text-zinc-300` or `text-zinc-400`
- **Secondary text:** `text-zinc-500`
- **Muted/meta:** `text-zinc-600`
- **Gradient text (hero only):** `bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent`

### Accent colors

**Primary: Cyan** (used strategically)

- Main cyan: `#06b6d4` (cyan-500)
- Light cyan: `#22d3ee` (cyan-400)
- For: links, primary CTAs, focus states, key icons
- RGB: `--accent-rgb: 6, 182, 212`

**Secondary: Blue** (supporting accent)

- Blue: `#3b82f6` (blue-500)
- For: gradients with cyan, secondary CTAs
- RGB: `--blue-rgb: 59, 130, 246`

**Tertiary: Purple** (variety only, used sparingly)

- Purple: `#a855f7` (purple-500)
- For: occasional card accents, background orbs
- Don't overuse - save for special elements

**Status colors:**

- Success: `emerald-500` - solid, not gradient
- Error: `red-500` - solid, not gradient
- Warning: `amber-500` - solid, not gradient
- Info: `cyan-500` - solid, not gradient

### Cards should NOT all use gradient headers

**Default card style (most cards):**

```html
<div class="rounded-xl bg-zinc-950 border border-zinc-800 shadow-lg hover:border-zinc-700 transition-all">
  <!-- Solid background, subtle border, clean -->
</div>
```

**Special/featured card with accent:**

```html
<div class="rounded-xl bg-zinc-950 border border-cyan-500/30 shadow-xl">
  <!-- Use colored border for emphasis, not gradient background -->
</div>
```

**AVOID:**
```html
<!-- Don't do this to every card -->
<div class="rounded-3xl glass-strong">
  <div class="bg-gradient-to-br from-purple-500 to-pink-500">...</div>
</div>
```

---

## Background effects

### Animated gradient orbs

```html
<div class="fixed inset-0 -z-10">
  <!-- Orb 1 -->
  <div
    class="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
  />
  <!-- Orb 2 (delayed) -->
  <div
    class="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
    style="animation-delay: 1s"
  />
  <!-- Orb 3 (delayed) -->
  <div
    class="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
    style="animation-delay: 2s"
  />
</div>
```

### Grid overlay

```html
<div
  class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)]"
/>
```

---

## Typography

- **Font:** Geist Sans (modern, clean, tech-forward)
- **Mono font:** Geist Mono (for addresses, IDs)
- **Headings:** Bold, tight tracking, often with gradients

**Scale:**

- Hero title: `text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight`
- Page title: `text-4xl md:text-5xl font-bold tracking-tight`
- Section title: `text-2xl md:text-3xl font-bold tracking-tight`
- Card title: `text-2xl md:text-3xl font-bold`
- Body: `text-base md:text-lg leading-relaxed`
- Small: `text-sm text-zinc-400`
- Micro: `text-xs text-zinc-500`

---

## Layout + spacing

- **Max width:** `max-w-7xl` for main content, `max-w-5xl` for detail pages
- **Padding:** `px-4 md:px-6 lg:px-8`
- **Vertical rhythm:** `space-y-6` to `space-y-10`
- **Section padding:** `py-24 md:py-32` for major sections

**Grids:**

```html
<!-- 3-column card grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
```

---

## Components

### Buttons

> ⚠️ **IMPORTANT:** ALL buttons MUST include `cursor-pointer` class. This applies to primary, secondary, ghost, icon buttons, and any clickable element styled as a button.

**Primary button (gradient - use for ONE main CTA only):**

```html
<button class="group relative px-8 py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all cursor-pointer">
  Button Text
</button>
```

**Secondary button (solid, most buttons should be this):**

```html
<button class="px-8 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer">
  Button Text
</button>
```

**Ghost button:**

```html
<button class="px-8 py-3 rounded-xl font-semibold border border-zinc-700 hover:bg-zinc-900 hover:border-zinc-600 transition-all cursor-pointer">
  Button Text
</button>
```

**Icon button:**

```html
<button class="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
  <!-- Icon here -->
</button>
```

### Cards

**Standard card:**

```html
<div class="rounded-xl bg-zinc-950 border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
  <!-- Content -->
</div>
```

**Elevated card:**

```html
<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
  <!-- Content -->
</div>
```

**Featured card (use sparingly):**

```html
<div class="rounded-xl bg-zinc-950 border border-cyan-500/30 p-6 shadow-lg shadow-cyan-500/10">
  <!-- Content -->
</div>
```

### Inputs

```html
<input
  type="text"
  class="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
  placeholder="Enter text..."
/>
```

### Badges

**Status badge (simple, no gradient):**

```html
<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  <span class="text-sm font-medium text-emerald-300">Active</span>
</div>
```

**Info badge:**

```html
<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
  <span class="text-sm font-medium text-cyan-300">Live</span>
</div>
```

### Navigation

**Glass navbar (only place to use glass heavily):**

```html
<nav class="sticky top-0 z-50 border-b border-white/10">
  <div class="absolute inset-0 bg-black/30 backdrop-blur-xl" />
  <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10" />
  
  <div class="relative max-w-7xl mx-auto px-6">
    <div class="flex items-center justify-between h-16">
      <!-- Content -->
    </div>
  </div>
</nav>
```

---

## Effects & Animations

### Premium shadows

```css
.shadow-premium {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 10px 60px -10px rgba(0, 0, 0, 0.8),
    0 0 40px -10px rgba(6, 182, 212, 0.15);
}

.shadow-premium-hover {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 80px -10px rgba(0, 0, 0, 0.9),
    0 0 60px -10px rgba(6, 182, 212, 0.3);
}
```

### Shimmer effect

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  background-size: 1000px 100%;
  animation: shimmer 3s infinite;
}
```

### Gradient animation

```css
@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}
```

### Glow effects

```css
.glow-cyan {
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.3);
}

.glow-purple {
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
}
```

---

## Motion & Interactions

**Durations:**

- Quick: `duration-150` (hover feedback)
- Standard: `duration-200` to `duration-300` (transitions)
- Slow: `duration-500` (page loads)

**Easing:** `ease-out` for most, `ease` for infinite animations

**Hover effects:**

```html
<!-- Card lift -->
<div class="hover:-translate-y-2 transition-transform">
  <!-- Button scale -->
  <button class="hover:scale-105 active:scale-95 transition-transform">
    <!-- Glow on hover -->
    <button class="group">
      <div
        class="opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-cyan-500"
      /> </button></button
></div>
```

**Framer Motion patterns:**

```jsx
// Page entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Staggered cards
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.1 }}
  />
))}

// Hover lift
<motion.div
  whileHover={{ y: -8 }}
  whileTap={{ scale: 0.98 }}
>
```

---

## Page-specific patterns

### Home page

- Animated gradient orbs in background
- Large hero with gradient text
- Stats section below CTA
- 3-column card grid
- Each card has unique gradient

### Listing detail

- Two-column layout (content + sidebar)
- Copy-to-clipboard buttons
- Large price display with gradient
- Trust indicators in sidebar
- Premium purchase CTA

### Seller page

- Centered form with glass background
- Icon labels on inputs
- Step-by-step guide at bottom
- Success state with animated check icon

---

## Best practices

1. **Consistency:** Use the same gradient combinations and glass styles throughout
2. **Performance:** Animate transforms and opacity, avoid animating layout properties
3. **Accessibility:** Maintain sufficient contrast, use focus rings
4. **Mobile:** Reduce orb sizes and blur amounts on mobile for performance
5. **Progressive enhancement:** Core experience works without effects, effects enhance
6. **Cursor pointer:** ALWAYS add `cursor-pointer` to ALL interactive elements (buttons, clickable divs, links styled as buttons, icon buttons, etc.)

---

## CSS Variables

```css
:root {
  --background: #000000;
  --surface: #09090b;
  --surface-elevated: #18181b;
  --foreground: #fafafa;
  --foreground-secondary: #a1a1aa;
  --foreground-muted: #71717a;

  --accent: #06b6d4;
  --accent-light: #22d3ee;
  --accent-dark: #0891b2;
  --accent-rgb: 6, 182, 212;

  --purple: #a855f7;
  --purple-light: #c084fc;
  --purple-rgb: 168, 85, 247;

  --border: rgba(255, 255, 255, 0.1);
  --border-hover: rgba(255, 255, 255, 0.2);
}
```

---

## Quick reference

**Primary CTA:** `rounded-xl px-8 py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 cursor-pointer`

**Secondary button:** `rounded-xl px-8 py-3 font-semibold bg-zinc-800 border border-zinc-700 cursor-pointer`

**Icon button:** `p-2 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer`

**Card:** `rounded-xl bg-zinc-950 border border-zinc-800`

**Clickable card:** `rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer`

**Input:** `rounded-lg px-4 py-3 bg-zinc-900 border border-zinc-700`

**Badge:** `rounded-full px-3 py-1 bg-cyan-500/10 border border-cyan-500/30`

**Heading:** `text-white font-bold tracking-tight`

**Body text:** `text-zinc-300`
