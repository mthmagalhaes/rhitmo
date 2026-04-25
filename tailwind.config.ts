import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" }
    },
    extend: {

      /* ── Cores ── */
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50:  "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))"
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        info: {
          DEFAULT:    "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))"
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))"
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))"
        }
      },

      /* ── Border Radius — sistema completo ── */
      borderRadius: {
        none:    "0",
        sm:      "6px",
        DEFAULT: "var(--radius)",       /* 12px */
        md:      "var(--radius)",       /* 12px */
        lg:      "16px",
        xl:      "20px",
        "2xl":   "24px",
        "3xl":   "32px",
        full:    "9999px"
      },

      /* ── Tipografia — escala Apple-inspired ── */
      fontSize: {
        xs:   ["11px", { lineHeight: "1.5" }],
        sm:   ["13px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.6" }],
        lg:   ["16px", { lineHeight: "1.5" }],
        xl:   ["18px", { lineHeight: "1.4" }],
        "2xl": ["22px", { lineHeight: "1.3",
                          letterSpacing: "-0.01em" }],
        "3xl": ["28px", { lineHeight: "1.2",
                          letterSpacing: "-0.02em" }],
        "4xl": ["36px", { lineHeight: "1.1",
                          letterSpacing: "-0.02em" }],
        "5xl": ["48px", { lineHeight: "1.05",
                          letterSpacing: "-0.03em" }]
      },

      /* ── Fontes ── */
      fontFamily: {
        sans:  ["Inter", "ui-sans-serif", "system-ui",
                "-apple-system", "sans-serif"],
        serif: ["Lora", "ui-serif", "Georgia", "serif"],
        mono:  ["Space Mono", "ui-monospace",
                "SFMono-Regular", "monospace"]
      },

      /* ── Shadows — tokens do CSS ── */
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        purple:      "var(--shadow-purple)",
        "purple-lg": "var(--shadow-purple-lg)"
      },

      /* ── Spacing extra ── */
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem"
      },

      /* ── Keyframes — manter existentes ── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" }
        },
        "wave-pulse": {
          "0%, 100%": { transform: "scaleY(1)", opacity: "1" },
          "50%":      { transform: "scaleY(1.15)", opacity: "0.9" }
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" }
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%":           { transform: "scale(1)",   opacity: "1"   }
        }
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "wave-pulse":     "wave-pulse 1.5s ease-in-out infinite",
        "fade-in":        "fade-in 0.2s ease-out",
        "dot-bounce":     "dot-bounce 1.2s infinite ease-in-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;
