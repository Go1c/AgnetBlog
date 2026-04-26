'use client';

import { Check, Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type AccentColor = {
  label: string;
  value: string;
  swatch: string;
  light: AccentTheme;
  dark: AccentTheme;
};

type AccentTheme = {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  popover: string;
  border: string;
  secondary: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
};

const storageKey = 'agnet-accent';
const themedVariables = [
  '--color-fd-background',
  '--color-background',
  '--color-fd-foreground',
  '--color-foreground',
  '--color-fd-muted',
  '--color-muted',
  '--color-fd-muted-foreground',
  '--color-muted-foreground',
  '--color-fd-card',
  '--color-fd-popover',
  '--color-fd-border',
  '--color-border',
  '--color-fd-secondary',
  '--primary',
  '--color-fd-primary',
  '--color-primary',
  '--color-fd-primary-foreground',
  '--color-fd-accent',
  '--color-fd-accent-foreground',
] as const;

const accentColors: AccentColor[] = [
  {
    label: '跟随系统',
    value: 'standard',
    swatch: 'hsl(0 0% 50%)',
    light: {
      background: 'hsl(0 0% 96%)',
      foreground: 'hsl(0 0% 3.9%)',
      muted: 'hsl(0 0% 96.1%)',
      mutedForeground: 'hsl(0 0% 45.1%)',
      card: 'hsl(0 0% 94.7%)',
      popover: 'hsl(0 0% 98%)',
      border: 'hsla(0 0% 80% / 50%)',
      secondary: 'hsl(0 0% 93.1%)',
      primary: 'hsl(0 0% 9%)',
      primaryForeground: 'hsl(0 0% 98%)',
      accent: 'hsla(0 0% 82% / 50%)',
      accentForeground: 'hsl(0 0% 9%)',
    },
    dark: {
      background: 'hsl(0 0% 12%)',
      foreground: 'hsl(0 0% 92%)',
      muted: 'hsl(0 0% 17%)',
      mutedForeground: 'hsla(0 0% 72% / 0.82)',
      card: 'hsl(0 0% 14%)',
      popover: 'hsl(0 0% 15%)',
      border: 'hsla(0 0% 52% / 25%)',
      secondary: 'hsl(0 0% 17%)',
      primary: 'hsl(0 0% 98%)',
      primaryForeground: 'hsl(0 0% 9%)',
      accent: 'hsla(0 0% 40.9% / 30%)',
      accentForeground: 'hsl(0 0% 90%)',
    },
  },
  {
    label: '绿色',
    value: 'green',
    swatch: 'hsl(142 70% 45%)',
    light: {
      background: 'hsl(140 35% 97%)',
      foreground: 'hsl(150 45% 8%)',
      muted: 'hsl(140 28% 93%)',
      mutedForeground: 'hsl(150 15% 42%)',
      card: 'hsl(140 35% 95%)',
      popover: 'hsl(140 45% 98%)',
      border: 'hsla(142 36% 68% / 45%)',
      secondary: 'hsl(142 30% 92%)',
      primary: 'hsl(142 70% 45%)',
      primaryForeground: 'hsl(150 60% 8%)',
      accent: 'hsl(142 52% 92%)',
      accentForeground: 'hsl(150 60% 18%)',
    },
    dark: {
      background: 'hsl(150 36% 16%)',
      foreground: 'hsl(142 45% 91%)',
      muted: 'hsl(150 30% 20%)',
      mutedForeground: 'hsl(142 22% 72%)',
      card: 'hsl(150 34% 18%)',
      popover: 'hsl(150 34% 19%)',
      border: 'hsla(142 35% 48% / 28%)',
      secondary: 'hsl(150 30% 20%)',
      primary: 'hsl(142 70% 62%)',
      primaryForeground: 'hsl(150 60% 8%)',
      accent: 'hsl(150 30% 16%)',
      accentForeground: 'hsl(142 70% 80%)',
    },
  },
  {
    label: '蓝色',
    value: 'blue',
    swatch: 'hsl(224 76% 56%)',
    light: {
      background: 'hsl(220 55% 97%)',
      foreground: 'hsl(224 45% 10%)',
      muted: 'hsl(220 42% 93%)',
      mutedForeground: 'hsl(224 16% 44%)',
      card: 'hsl(220 52% 95%)',
      popover: 'hsl(220 60% 98%)',
      border: 'hsla(224 45% 70% / 45%)',
      secondary: 'hsl(220 42% 92%)',
      primary: 'hsl(224 76% 56%)',
      primaryForeground: 'hsl(0 0% 100%)',
      accent: 'hsl(220 80% 94%)',
      accentForeground: 'hsl(224 64% 24%)',
    },
    dark: {
      background: 'hsl(224 38% 17%)',
      foreground: 'hsl(220 42% 92%)',
      muted: 'hsl(224 32% 21%)',
      mutedForeground: 'hsl(220 28% 73%)',
      card: 'hsl(224 36% 19%)',
      popover: 'hsl(224 36% 20%)',
      border: 'hsla(224 42% 55% / 30%)',
      secondary: 'hsl(224 32% 21%)',
      primary: 'hsl(224 90% 72%)',
      primaryForeground: 'hsl(225 45% 8%)',
      accent: 'hsl(224 30% 18%)',
      accentForeground: 'hsl(224 90% 84%)',
    },
  },
  {
    label: '天蓝',
    value: 'sky',
    swatch: 'hsl(204 85% 66%)',
    light: {
      background: 'hsl(204 70% 97%)',
      foreground: 'hsl(204 55% 10%)',
      muted: 'hsl(204 52% 93%)',
      mutedForeground: 'hsl(204 18% 44%)',
      card: 'hsl(204 65% 95%)',
      popover: 'hsl(204 75% 98%)',
      border: 'hsla(204 45% 70% / 45%)',
      secondary: 'hsl(204 52% 92%)',
      primary: 'hsl(204 85% 58%)',
      primaryForeground: 'hsl(204 70% 12%)',
      accent: 'hsl(204 88% 94%)',
      accentForeground: 'hsl(204 75% 24%)',
    },
    dark: {
      background: 'hsl(204 44% 17%)',
      foreground: 'hsl(204 48% 92%)',
      muted: 'hsl(204 38% 21%)',
      mutedForeground: 'hsl(204 30% 74%)',
      card: 'hsl(204 42% 19%)',
      popover: 'hsl(204 42% 20%)',
      border: 'hsla(204 48% 56% / 30%)',
      secondary: 'hsl(204 38% 21%)',
      primary: 'hsl(204 92% 76%)',
      primaryForeground: 'hsl(204 70% 10%)',
      accent: 'hsl(204 34% 18%)',
      accentForeground: 'hsl(204 92% 86%)',
    },
  },
  {
    label: '紫色',
    value: 'purple',
    swatch: 'hsl(262 83% 68%)',
    light: {
      background: 'hsl(262 55% 98%)',
      foreground: 'hsl(262 45% 10%)',
      muted: 'hsl(262 44% 94%)',
      mutedForeground: 'hsl(262 16% 45%)',
      card: 'hsl(262 50% 96%)',
      popover: 'hsl(262 60% 99%)',
      border: 'hsla(262 45% 72% / 45%)',
      secondary: 'hsl(262 44% 93%)',
      primary: 'hsl(262 83% 62%)',
      primaryForeground: 'hsl(0 0% 100%)',
      accent: 'hsl(262 75% 94%)',
      accentForeground: 'hsl(262 70% 26%)',
    },
    dark: {
      background: 'hsl(262 36% 18%)',
      foreground: 'hsl(262 48% 92%)',
      muted: 'hsl(262 32% 22%)',
      mutedForeground: 'hsl(262 28% 74%)',
      card: 'hsl(262 34% 20%)',
      popover: 'hsl(262 34% 21%)',
      border: 'hsla(262 45% 58% / 30%)',
      secondary: 'hsl(262 32% 22%)',
      primary: 'hsl(262 90% 78%)',
      primaryForeground: 'hsl(262 48% 10%)',
      accent: 'hsl(262 32% 18%)',
      accentForeground: 'hsl(262 90% 86%)',
    },
  },
  {
    label: '橙色',
    value: 'orange',
    swatch: 'hsl(25 95% 58%)',
    light: {
      background: 'hsl(30 80% 97%)',
      foreground: 'hsl(24 48% 10%)',
      muted: 'hsl(30 60% 92%)',
      mutedForeground: 'hsl(24 18% 43%)',
      card: 'hsl(30 72% 95%)',
      popover: 'hsl(30 86% 98%)',
      border: 'hsla(25 56% 68% / 45%)',
      secondary: 'hsl(30 58% 92%)',
      primary: 'hsl(25 95% 58%)',
      primaryForeground: 'hsl(24 70% 10%)',
      accent: 'hsl(25 100% 94%)',
      accentForeground: 'hsl(24 75% 24%)',
    },
    dark: {
      background: 'hsl(24 36% 17%)',
      foreground: 'hsl(30 44% 91%)',
      muted: 'hsl(24 32% 21%)',
      mutedForeground: 'hsl(30 25% 72%)',
      card: 'hsl(24 34% 19%)',
      popover: 'hsl(24 34% 20%)',
      border: 'hsla(25 52% 52% / 30%)',
      secondary: 'hsl(24 32% 21%)',
      primary: 'hsl(25 100% 70%)',
      primaryForeground: 'hsl(24 70% 10%)',
      accent: 'hsl(24 32% 17%)',
      accentForeground: 'hsl(25 100% 82%)',
    },
  },
  {
    label: '玫瑰',
    value: 'rose',
    swatch: 'hsl(347 86% 66%)',
    light: {
      background: 'hsl(347 70% 98%)',
      foreground: 'hsl(347 44% 10%)',
      muted: 'hsl(347 52% 94%)',
      mutedForeground: 'hsl(347 16% 45%)',
      card: 'hsl(347 62% 96%)',
      popover: 'hsl(347 76% 99%)',
      border: 'hsla(347 52% 72% / 45%)',
      secondary: 'hsl(347 52% 93%)',
      primary: 'hsl(347 86% 62%)',
      primaryForeground: 'hsl(0 0% 100%)',
      accent: 'hsl(347 88% 95%)',
      accentForeground: 'hsl(347 76% 26%)',
    },
    dark: {
      background: 'hsl(347 36% 18%)',
      foreground: 'hsl(347 45% 92%)',
      muted: 'hsl(347 32% 22%)',
      mutedForeground: 'hsl(347 28% 74%)',
      card: 'hsl(347 34% 20%)',
      popover: 'hsl(347 34% 21%)',
      border: 'hsla(347 48% 58% / 30%)',
      secondary: 'hsl(347 32% 22%)',
      primary: 'hsl(347 90% 74%)',
      primaryForeground: 'hsl(347 55% 10%)',
      accent: 'hsl(347 34% 17%)',
      accentForeground: 'hsl(347 90% 84%)',
    },
  },
  {
    label: '青色',
    value: 'cyan',
    swatch: 'hsl(174 68% 46%)',
    light: {
      background: 'hsl(174 52% 97%)',
      foreground: 'hsl(178 48% 9%)',
      muted: 'hsl(174 40% 93%)',
      mutedForeground: 'hsl(178 16% 42%)',
      card: 'hsl(174 48% 95%)',
      popover: 'hsl(174 58% 98%)',
      border: 'hsla(174 44% 68% / 45%)',
      secondary: 'hsl(174 40% 92%)',
      primary: 'hsl(174 68% 46%)',
      primaryForeground: 'hsl(178 70% 10%)',
      accent: 'hsl(174 70% 93%)',
      accentForeground: 'hsl(178 70% 20%)',
    },
    dark: {
      background: 'hsl(178 34% 16%)',
      foreground: 'hsl(174 43% 91%)',
      muted: 'hsl(178 30% 20%)',
      mutedForeground: 'hsl(174 25% 72%)',
      card: 'hsl(178 32% 18%)',
      popover: 'hsl(178 32% 19%)',
      border: 'hsla(174 42% 50% / 30%)',
      secondary: 'hsl(178 30% 20%)',
      primary: 'hsl(174 78% 60%)',
      primaryForeground: 'hsl(178 70% 10%)',
      accent: 'hsl(178 32% 16%)',
      accentForeground: 'hsl(174 78% 78%)',
    },
  },
];

const accentValues = new Set(accentColors.map((color) => color.value));

export function AccentColorSelect() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState('standard');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextAccent = getStoredAccent();
    const frameId = window.requestAnimationFrame(() => setAccent(nextAccent));

    applyAccent(nextAccent);

    const observer = new MutationObserver(() => {
      const nextAccent = getStoredAccent();

      setAccent(nextAccent);
      applyAccent(nextAccent);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemAccent = () => {
      const nextAccent = getStoredAccent();

      setAccent(nextAccent);
      applyAccent(nextAccent);
    };

    mediaQuery.addEventListener('change', syncSystemAccent);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      mediaQuery.removeEventListener('change', syncSystemAccent);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseAccent(value: string) {
    setAccent(value);
    applyAccent(value);
    window.localStorage.setItem(storageKey, value);
    setOpen(false);
  }

  const selected = accentColors.find((color) => color.value === accent) ?? accentColors[0];

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm font-semibold text-fd-foreground shadow-sm transition hover:bg-fd-accent/60"
        onClick={() => setOpen((value) => !value)}
        aria-label="选择背景色"
        title="选择背景色"
        type="button"
      >
        <Palette aria-hidden="true" className="size-4" />
        <span className="size-3 rounded-full" style={{ backgroundColor: selected.swatch }} />
        <span className="hidden sm:inline">背景：{selected.label}</span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-fd-border bg-fd-background p-2 text-fd-foreground shadow-xl"
          role="menu"
        >
          {accentColors.map((color) => (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-fd-accent/70"
              key={color.value}
              onClick={() => chooseAccent(color.value)}
              role="menuitemradio"
              type="button"
              aria-checked={accent === color.value}
            >
              <span className="size-3.5 rounded-full" style={{ backgroundColor: color.swatch }} />
              <span className="flex-1">{color.label}</span>
              {accent === color.value ? <Check aria-hidden="true" className="size-4" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getStoredAccent() {
  const stored = window.localStorage.getItem(storageKey);

  return stored && accentValues.has(stored) ? stored : 'standard';
}

function applyAccent(value: string) {
  if (value === 'standard') {
    document.documentElement.removeAttribute('data-accent');
    document.documentElement.removeAttribute('data-background');
    themedVariables.forEach((variable) => document.documentElement.style.removeProperty(variable));
    document.documentElement.style.removeProperty('background-color');
    document.documentElement.style.removeProperty('color');
    document.body?.style.removeProperty('background-color');
    document.body?.style.removeProperty('color');
    return;
  }

  const selected = accentColors.find((color) => color.value === value) ?? accentColors[0];
  const theme = document.documentElement.classList.contains('dark') ? selected.dark : selected.light;

  document.documentElement.style.setProperty('--color-fd-background', theme.background);
  document.documentElement.style.setProperty('--color-background', theme.background);
  document.documentElement.style.setProperty('--color-fd-foreground', theme.foreground);
  document.documentElement.style.setProperty('--color-foreground', theme.foreground);
  document.documentElement.style.setProperty('--color-fd-muted', theme.muted);
  document.documentElement.style.setProperty('--color-muted', theme.muted);
  document.documentElement.style.setProperty('--color-fd-muted-foreground', theme.mutedForeground);
  document.documentElement.style.setProperty('--color-muted-foreground', theme.mutedForeground);
  document.documentElement.style.setProperty('--color-fd-card', theme.card);
  document.documentElement.style.setProperty('--color-fd-popover', theme.popover);
  document.documentElement.style.setProperty('--color-fd-border', theme.border);
  document.documentElement.style.setProperty('--color-border', theme.border);
  document.documentElement.style.setProperty('--color-fd-secondary', theme.secondary);
  document.documentElement.style.setProperty('--primary', hslToChannels(theme.primary));
  document.documentElement.style.setProperty('--color-fd-primary', theme.primary);
  document.documentElement.style.setProperty('--color-primary', theme.primary);
  document.documentElement.style.setProperty('--color-fd-primary-foreground', theme.primaryForeground);
  document.documentElement.style.setProperty('--color-fd-accent', theme.accent);
  document.documentElement.style.setProperty('--color-fd-accent-foreground', theme.accentForeground);

  document.documentElement.dataset.accent = value;
  document.documentElement.dataset.background = value;
  document.documentElement.style.backgroundColor = theme.background;
  document.documentElement.style.color = theme.foreground;

  if (document.body) {
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.foreground;
  }
}

function hslToChannels(value: string) {
  return value.replace(/^hsl\(/, '').replace(/\)$/, '');
}
