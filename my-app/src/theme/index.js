import { createTheme } from '@mui/material/styles';

/**
 * MUI Theme
 *
 * - Font:    Inter (Google Fonts, loaded in index.html)
 * - Palette: Clean medical-grade colour scheme
 *   Primary  → Indigo-600  (#4F46E5) — navigation, CTAs
 *   Secondary → Teal-500   (#14B8A6) — accents, badges
 *   Error     → Red-500    (#EF4444)
 *   Warning   → Amber-500  (#F59E0B)
 *   Info      → Sky-500    (#0EA5E9)
 *   Success   → Emerald-500 (#10B981)
 */

const theme = createTheme({
  // ── Typography ────────────────────────────────────────────────
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { fontWeight: 400, lineHeight: 1.6 },
    body2: { fontWeight: 400, lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: 'none' }, // no ALL-CAPS buttons
    caption: { fontWeight: 400 },
  },

  // ── Palette ───────────────────────────────────────────────────
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5',
      light: '#818CF8',
      dark: '#3730A3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#14B8A6',
      light: '#5EEAD4',
      dark: '#0F766E',
      contrastText: '#ffffff',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#B91C1C',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#B45309',
    },
    info: {
      main: '#0EA5E9',
      light: '#7DD3FC',
      dark: '#0369A1',
    },
    success: {
      main: '#10B981',
      light: '#6EE7B7',
      dark: '#065F46',
    },
    background: {
      default: '#F8FAFC',   // near-white page background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',   // slate-900
      secondary: '#64748B', // slate-500
      disabled: '#CBD5E1',
    },
    divider: '#E2E8F0',     // slate-200
  },

  // ── Shape ─────────────────────────────────────────────────────
  shape: {
    borderRadius: 10,
  },

  // ── Spacing ───────────────────────────────────────────────────
  // Default 8px base. 1 = 8px, 2 = 16px, 3 = 24px …
  spacing: 8,

  // ── Breakpoints ───────────────────────────────────────────────
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },

  // ── Component Overrides ───────────────────────────────────────
  components: {
    // Buttons — rounded pill-style primary, flat secondary
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
        },
        containedPrimary: {
          boxShadow: '0 1px 3px rgba(79,70,229,0.3)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
          },
        },
      },
    },

    // Cards — subtle shadow + no harsh border
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
          borderRadius: 12,
        },
      },
    },

    // Inputs — filled variant default for forms
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    // Chip — slightly more padding
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },

    // AppBar — clean white, no elevation blur
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'inherit',
      },
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        },
      },
    },

    // Table — striped rows via sx on the page level; header bold
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: '#F1F5F9',
            color: '#0F172A',
          },
        },
      },
    },

    // Drawer sidebar
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #E2E8F0',
          boxShadow: 'none',
        },
      },
    },

    // Tooltip — dark with readable text
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
    },
  },
});

export default theme;
