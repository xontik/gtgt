import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import '@fontsource-variable/inter';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// A near-monochrome, single-accent theme with flat/bordered surfaces
// instead of Material's default drop shadows - see global.css for the
// border-radius/elevation overrides that go with it.
const gtgLight = {
  dark: false,
  colors: {
    background: '#fafafa',
    surface: '#ffffff',
    primary: '#6d28d9',
    secondary: '#0f172a',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    info: '#2563eb',
  },
};

const gtgDark = {
  dark: true,
  colors: {
    background: '#0b0b0f',
    surface: '#151519',
    primary: '#a78bfa',
    secondary: '#e2e8f0',
    error: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    info: '#60a5fa',
  },
};

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'gtgLight',
    themes: {
      gtgLight,
      gtgDark,
    },
  },
  defaults: {
    VCard: { elevation: 0, rounded: 'lg' },
    VSheet: { elevation: 0 },
    VBtn: { rounded: 'lg' },
    VTextField: { variant: 'outlined', rounded: 'lg' },
    VTextarea: { variant: 'outlined', rounded: 'lg' },
    VSelect: { variant: 'outlined', rounded: 'lg' },
    VAutocomplete: { variant: 'outlined', rounded: 'lg' },
    VAppBar: { elevation: 0 },
    VBottomNavigation: { elevation: 0 },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VDialog: { VCard: { rounded: 'xl' } },
    VBottomSheet: { VSheet: { rounded: 't-xl' } },
  },
});
