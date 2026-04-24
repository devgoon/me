import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5fa8ff',
      light: '#8fc3ff',
      dark: '#2f7bd6',
      contrastText: '#08111f',
    },
    secondary: {
      main: '#7dd3c7',
      light: '#a7e6dd',
      dark: '#4caea1',
    },
    background: {
      default: '#0b1120',
      paper: '#11192a',
    },
    text: {
      primary: '#e7edf7',
      secondary: '#9aa9c2',
    },
    divider: 'rgba(154, 169, 194, 0.18)',
    action: {
      hover: 'rgba(95, 168, 255, 0.08)',
      selected: 'rgba(95, 168, 255, 0.14)',
      focus: 'rgba(95, 168, 255, 0.18)',
    },
    success: {
      main: '#4fd1a5',
    },
    warning: {
      main: '#f6c177',
    },
    error: {
      main: '#ff7b8b',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI Variable", "IBM Plex Sans", "Segoe UI", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.35rem',
      fontWeight: 600,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'dark',
        },
        html: {
          backgroundColor: '#0b1120',
        },
        body: {
          background:
            'radial-gradient(circle at top, rgba(95, 168, 255, 0.12), transparent 28%), linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
          color: '#e7edf7',
        },
        '::selection': {
          backgroundColor: 'rgba(95, 168, 255, 0.32)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'rgba(154, 169, 194, 0.18)',
          backgroundColor: 'rgba(17, 25, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.5rem',
          '&:last-child': {
            paddingBottom: '1.5rem',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: '1rem',
        },
        outlined: {
          borderColor: 'rgba(95, 168, 255, 0.28)',
          backgroundColor: 'rgba(95, 168, 255, 0.04)',
        },
        containedPrimary: {
          boxShadow: '0 10px 24px rgba(47, 123, 214, 0.28)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        },
        filled: {
          backgroundColor: 'rgba(95, 168, 255, 0.16)',
          color: '#dbeafe',
        },
        outlined: {
          borderColor: 'rgba(125, 211, 199, 0.22)',
          backgroundColor: 'rgba(125, 211, 199, 0.05)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 16, 29, 0.72)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(12, 20, 34, 0.9)',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(95, 168, 255, 0.14)',
          },
        },
        notchedOutline: {
          borderColor: 'rgba(154, 169, 194, 0.18)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          '&.Mui-selected': {
            backgroundColor: 'rgba(95, 168, 255, 0.12)',
            borderRight: '2px solid rgba(95, 168, 255, 0.9)',
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(95, 168, 255, 0.18)',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          textUnderlineOffset: '0.18em',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(154, 169, 194, 0.16)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(17, 25, 42, 0.88)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background:
            'linear-gradient(180deg, rgba(95, 168, 255, 0.1) 0%, rgba(95, 168, 255, 0.04) 100%)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(154, 169, 194, 0.12)',
        },
        head: {
          color: '#c9d6ea',
          fontWeight: 700,
          fontSize: '0.78rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        },
        body: {
          color: '#d8e1ef',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardError: {
          backgroundColor: 'rgba(255, 123, 139, 0.12)',
          color: '#ffd7dd',
        },
        standardWarning: {
          backgroundColor: 'rgba(246, 193, 119, 0.12)',
          color: '#ffe2b3',
        },
        standardSuccess: {
          backgroundColor: 'rgba(79, 209, 165, 0.12)',
          color: '#cbf7e6',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0a1020',
          border: '1px solid rgba(154, 169, 194, 0.2)',
          color: '#e7edf7',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
          fontSize: '0.78rem',
        },
        arrow: {
          color: '#0a1020',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#0f1727',
        },
      },
    },
  },
});

export default theme;
