# Trench Royale Design System
## SuperRouter AI Trading Dashboard

---

## 🎨 Brand Identity

### Core Philosophy
"Degen Engineering meets Cyberpunk Productivity" - A real-time narrative experience where users watch the AI (Vibr Coder) work in a slick, data-rich cockpit interface.

---

## 🌈 Color Palette

### Primary Brand
```css
--brand-primary: #68ac6e;     /* Main brand green */
--brand-primary-dark: #4a8050;
--brand-primary-light: #86c98a;
```

### Backgrounds (Void Blacks)
```css
--void-black: #000000;         /* Pure black base */
--void-900: #0a0a0a;           /* Slightly lifted */
--void-800: #121212;           /* Card backgrounds */
--void-700: #1a1a1a;           /* Hover states */
--void-600: #242424;           /* Borders/dividers */
```

### Neon Accents (Solana Ecosystem)
```css
--matrix-green: #00ff41;       /* Terminal success */
--solana-purple: #9945ff;      /* Solana brand */
--solana-cyan: #14f195;        /* Solana gradient */
--alert-red: #ff0033;          /* Danger/rug pull */
--warning-amber: #ffaa00;      /* Caution */
```

### Glassmorphism
```css
--glass-white: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: 10px;
```

---

## 📝 Typography

### Font Families
```css
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: 'Space Grotesk', 'Inter', sans-serif;
```

### Type Scale
```css
/* Headers (Space Grotesk) */
--text-5xl: 3rem;      /* 48px - Hero */
--text-4xl: 2.25rem;   /* 36px - Page title */
--text-3xl: 1.875rem;  /* 30px - Section */
--text-2xl: 1.5rem;    /* 24px - Card title */
--text-xl: 1.25rem;    /* 20px - Subsection */

/* Body (Inter) */
--text-lg: 1.125rem;   /* 18px - Large body */
--text-base: 1rem;     /* 16px - Default */
--text-sm: 0.875rem;   /* 14px - Small */
--text-xs: 0.75rem;    /* 12px - Captions */

/* Mono (JetBrains Mono) */
--text-mono: 0.875rem; /* 14px - Terminal/code */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-black: 900;
```

### Letter Spacing
```css
--tracking-tight: -0.025em;  /* Headers */
--tracking-normal: 0em;      /* Body */
--tracking-wide: 0.025em;    /* All caps */
```

---

## 📐 Spacing System

### Base Unit: 4px
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

---

## 🔲 Border Radius

### Standard Radii
```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px - Subtle */
--radius-md: 0.5rem;     /* 8px - Default */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Modals */
--radius-2xl: 1.5rem;    /* 24px - Hero elements */
--radius-full: 9999px;   /* Pills/avatars */
```

---

## 🎭 Effects

### CRT Scanlines
```css
.crt-effect {
  position: relative;
}

.crt-effect::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    rgba(0, 255, 65, 0.03) 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
}
```

### Glow Effects
```css
.glow-green {
  box-shadow: 0 0 20px rgba(104, 172, 110, 0.4),
              0 0 40px rgba(104, 172, 110, 0.2);
}

.glow-red {
  box-shadow: 0 0 20px rgba(255, 0, 51, 0.4),
              0 0 40px rgba(255, 0, 51, 0.2);
}

.glow-matrix {
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.4),
              0 0 40px rgba(0, 255, 65, 0.2);
}
```

### Glassmorphism
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

---

## 🧩 Component Patterns

### Cards
```css
.card-default {
  background: var(--void-800);
  border: 1px solid var(--void-600);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card-glass {
  background: var(--glass-white);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
  padding: var(--space-6);
}
```

### Buttons
```css
.btn-primary {
  background: var(--brand-primary);
  color: var(--void-black);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  transition: all 150ms ease;
}

.btn-primary:hover {
  background: var(--brand-primary-light);
  box-shadow: 0 0 20px rgba(104, 172, 110, 0.4);
}

.btn-ghost {
  background: transparent;
  color: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
}
```

### Terminal
```css
.terminal {
  background: var(--void-900);
  border: 1px solid var(--matrix-green);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-mono);
  color: var(--matrix-green);
  overflow-y: auto;
  max-height: 400px;
}

.terminal-line {
  margin-bottom: var(--space-2);
  opacity: 0;
  animation: fadeIn 200ms ease forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}
```

---

## 📱 Layout Structure

### The Cockpit (Split Screen)
```css
.cockpit-layout {
  display: grid;
  grid-template-columns: 35% 65%;
  height: 100vh;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--void-black);
}

@media (max-width: 1024px) {
  .cockpit-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
```

### Left Panel (The Brain)
```css
.brain-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.character-stage {
  height: 400px;
  background: var(--void-800);
  border-radius: var(--radius-xl);
  position: relative;
  overflow: hidden;
}

.terminal-window {
  flex: 1;
  min-height: 300px;
}
```

### Right Panel (The Dashboard)
```css
.dashboard-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.tab-switcher {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--glass-white);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(var(--glass-blur));
}
```

---

## 🎬 Animation States

### AI Mood States
```typescript
type AIMood =
  | 'idle'        // Waiting for action
  | 'scanning'    // Looking for opportunities
  | 'executing'   // Making trades
  | 'bullish'     // PnL up > 5%
  | 'bearish'     // PnL down or high volatility
  | 'sleeping'    // No activity

// Visual Mappings
const moodStyles = {
  idle: { border: 'void-600', glow: 'none' },
  scanning: { border: 'solana-cyan', glow: 'pulse' },
  executing: { border: 'matrix-green', glow: 'intense' },
  bullish: { border: 'matrix-green', glow: 'steady' },
  bearish: { border: 'alert-red', glow: 'flicker' },
  sleeping: { border: 'void-600', glow: 'dim' }
}
```

---

## 🔊 Sound Effects (Future)
- **Buy Order**: Cash register ding
- **Sell Order**: Swoosh
- **Rug Pull Detected**: Alert siren
- **Profit Milestone**: Level up sound
- **New Migration**: Radar ping

---

## ✅ Consistency Checklist

Before shipping any component, verify:
- [ ] Uses design system colors (no hardcoded hex)
- [ ] Uses spacing scale (no arbitrary margins)
- [ ] Uses typography scale (no random font sizes)
- [ ] Uses border radius system
- [ ] Follows glassmorphism pattern for overlays
- [ ] Includes hover/active states
- [ ] Responsive breakpoints defined
- [ ] Accessibility: focus states, ARIA labels
- [ ] Animation: 150-300ms transitions max
- [ ] Dark theme optimized (no pure white text)
