export type ThemeMode = 'light' | 'dark';
export const theme = {
  light: {
    colors: { background: '#F8F6F1', surface: '#FFFFFF', surfaceAlt: '#E8F0E9', surfaceWarm: '#F7EFE6', surfaceCool: '#EDF3F7', surfaceRose: '#F8ECEC', surfaceMint: '#EEF5F0', surfaceBlue: '#DDEAF2', surfacePink: '#F3DADA', text: '#243027', muted: '#718078', primary: '#6B8F71', primaryDark: '#294936', accent: '#C98F8F', border: '#E3E8E3', success: '#2E7D52', danger: '#A34B52', info: '#496A7A', whiteText: '#FFFFFF', shadow: '#294936' },
    typography: { title: 28, heading: 20, body: 15, caption: 12, weight: { regular: '400' as const, medium: '600' as const, bold: '800' as const } },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    icons: { home: '⌂', viewed: '◷', continue: '↗', cart: '▣', wishlist: '♥', orders: '▤', settings: '⚙' },
  },
  dark: {
    colors: { background: '#121A18', surface: '#1D2925', surfaceAlt: '#263B33', surfaceWarm: '#382C24', surfaceCool: '#1F303A', surfaceRose: '#38272E', surfaceMint: '#20352E', surfaceBlue: '#20313A', surfacePink: '#38272E', text: '#F1F6F2', muted: '#A6B7AE', primary: '#91C6A2', primaryDark: '#B2E1C0', accent: '#E5A6A6', border: '#3B4B44', success: '#7AD09A', danger: '#F09AA3', info: '#91C9E5', whiteText: '#FFFFFF', shadow: '#000000' },
    typography: { title: 28, heading: 20, body: 15, caption: 12, weight: { regular: '400' as const, medium: '600' as const, bold: '800' as const } },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    icons: { home: '⌂', viewed: '◷', continue: '↗', cart: '▣', wishlist: '♥', orders: '▤', settings: '⚙' },
  },
} as const;
export type ThemeColors = typeof theme.light.colors | typeof theme.dark.colors;
