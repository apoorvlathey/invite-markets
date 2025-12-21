# styling.md — invite.markets

This document defines the visual style + Tailwind conventions for **invite.markets**.
Goal: **dark-mode first**, **premium**, **crypto-native**, **visually striking**, **memorable**.

---

## Brand vibe

**Keywords:** premium, modern, confident, striking, "web3 luxury without being tacky".

**Embrace:** glassmorphism, gradient accents, subtle animations, depth, glow effects, polished interactions.

**Avoid:** flat design, harsh neons, meme aesthetics, excessive noise, slow animations.

---

## Core design principles

1. **Dark + Depth**

   - Pure black (`#000000`) background for maximum contrast
   - Layered effects: blurred orbs, gradients, glassmorphic surfaces
   - Premium shadows that respond to interaction

2. **Gradient accents**

   - Primary: Cyan to blue (`#06b6d4` → `#3b82f6`)
   - Use gradients for buttons, headers, and emphasis
   - Each card can have unique gradient combinations for visual variety

3. **Glassmorphism**

   - Frosted glass effects for navigation, cards, overlays
   - Subtle backdrop blur with semi-transparent backgrounds
   - Combine with gradients for depth

4. **Micro-interactions**
   - Scale transforms on hover/tap
   - Smooth color transitions
   - Icon animations
   - Glow effects on interaction
   - Pulsing status indicators

---

## Tailwind color system

### Background + surfaces

- **Page background:** `bg-black` (pure black)
- **Glass surfaces:** `glass` or `glass-strong` utility classes
- **Solid surfaces:** `bg-zinc-950/90` or `bg-zinc-900/50` with opacity
- **Borders:** `border-white/10` (standard), `border-white/20` (hover)

### Text hierarchy

- **Primary text:** `text-zinc-100` or `text-white`
- **Secondary text:** `text-zinc-400`
- **Muted/meta:** `text-zinc-500` or `text-zinc-600`
- **Gradient text:** `bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent`

### Accent colors

**Primary: Cyan-Blue gradient**

- Cyan: `#06b6d4` (cyan-500)
- Blue: `#3b82f6` (blue-500)
- Light cyan: `#22d3ee` (cyan-400)
- RGB values: `--accent-rgb: 6, 182, 212`

**Secondary: Purple** (for variety)

- Purple: `#a855f7` (purple-500)
- Light purple: `#c084fc` (purple-400)
- RGB values: `--purple-rgb: 168, 85, 247`

**Status colors:**

- Success: `emerald-400/500`
- Error: `red-400/500`
- Warning: `amber-400/500`
- Info: `cyan-400/500`

### Gradient combinations for cards

```css
/* Indigo to Purple */
from-indigo-500 to-purple-500

/* Cyan to Blue */
from-cyan-500 to-blue-500

/* Emerald to Cyan */
from-emerald-500 to-cyan-500

/* Amber to Red */
from-amber-500 to-red-500

/* Pink to Purple */
from-pink-500 to-purple-500
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

### Glassmorphism utilities

**Standard glass:**

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Strong glass:**

```css
.glass-strong {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

### Buttons

**Primary button with gradient:**

```html
<button
  class="group relative inline-flex items-center justify-center rounded-2xl px-10 py-5 font-semibold text-lg overflow-hidden"
>
  <!-- Gradient background -->
  <div
    class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-transform group-hover:scale-110"
  />
  <!-- Text -->
  <span class="relative z-10 text-black">Button Text</span>
  <!-- Glow effect -->
  <div
    class="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-gradient-to-r from-cyan-500 to-blue-500"
  />
</button>
```

**Secondary button (glass):**

```html
<button
  class="glass-strong rounded-2xl px-10 py-5 font-semibold hover:bg-white/10 transition-all"
>
  Button Text
</button>
```

### Cards

**Premium invite card:**

```html
<div
  class="rounded-3xl overflow-hidden shadow-premium hover:shadow-premium-hover transition-all duration-300 group"
>
  <!-- Gradient header -->
  <div class="relative h-48 p-6 bg-gradient-to-br from-cyan-500 to-blue-500">
    <!-- Shimmer overlay -->
    <div class="absolute inset-0 shimmer opacity-0 group-hover:opacity-100" />
    <!-- Content -->
    <div class="relative z-10">
      <!-- Header content -->
    </div>
  </div>

  <!-- Body -->
  <div class="bg-zinc-950/90 backdrop-blur-xl border-t border-white/5 p-6">
    <!-- Card content -->
  </div>
</div>
```

**Glass card:**

```html
<div class="rounded-3xl glass-strong shadow-premium p-8">
  <!-- Content -->
</div>
```

### Inputs

```html
<input
  type="text"
  class="w-full px-5 py-4 rounded-2xl bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all hover:border-white/20"
  placeholder="Enter text..."
/>
```

### Badges

**Status badge:**

```html
<div
  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30"
>
  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
  <span class="text-sm font-semibold text-emerald-300">Active</span>
</div>
```

**Info badge:**

```html
<div
  class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-cyan-500/30"
>
  <span class="relative flex h-2 w-2">
    <span
      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"
    ></span>
    <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
  </span>
  <span class="text-cyan-300 font-medium">Live</span>
</div>
```

### Navigation

```html
<nav class="sticky top-0 z-50 glass-strong border-b border-white/10">
  <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
    <div class="flex items-center justify-between h-20">
      <!-- Logo with gradient icon -->
      <a href="/" class="group flex items-center gap-2">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg group-hover:shadow-cyan-500/50 transition-all"
        >
          I
        </div>
        <span
          class="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all"
        >
          Invite.markets
        </span>
      </a>
      <!-- Nav items -->
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

**Button:** `rounded-2xl px-10 py-5 font-semibold bg-gradient-to-r from-cyan-500 to-blue-500`

**Card:** `rounded-3xl glass-strong shadow-premium`

**Input:** `rounded-2xl px-5 py-4 bg-zinc-900/50 border border-white/10`

**Badge:** `rounded-full px-4 py-2 glass border-cyan-500/30`

**Gradient text:** `bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent`
