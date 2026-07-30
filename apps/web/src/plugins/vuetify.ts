import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import '@fontsource-variable/inter';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Dark-only, dark-gray surfaces (not near-black) with a single very
// saturated purple accent - see global.css for the border/shadow that
// give surfaces definition against the background.
const gtgDark = {
  dark: true,
  colors: {
    background: '#232328',
    surface: '#2d2d34',
    'surface-variant': '#38383f',
    primary: '#b026ff',
    secondary: '#4c1d95',
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
    defaultTheme: 'gtgDark',
    themes: {
      gtgDark,
    },
  },
  defaults: {
    VCard: { elevation: 0, rounded: 'lg' },
    VSheet: { elevation: 0 },
    VBtn: { rounded: 'lg' },
    // 'suppress' (a Vuetify built-in) fully defeats mobile browsers'
    // autofill heuristics (address/card/name suggestions on fields that
    // just happen to match), not just autocomplete="off" which Chrome
    // often ignores for those.
    VTextField: { variant: 'outlined', rounded: 'lg', autocomplete: 'suppress' },
    VTextarea: { variant: 'outlined', rounded: 'lg', autocomplete: 'suppress' },
    VSelect: { variant: 'outlined', rounded: 'lg', autocomplete: 'suppress' },
    VAutocomplete: { variant: 'outlined', rounded: 'lg', autocomplete: 'suppress' },
    VAppBar: { elevation: 0 },
    VBottomNavigation: { elevation: 0 },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VList: { rounded: 'lg' },
    VDialog: { VCard: { rounded: 'xl' } },
    VBottomSheet: { VSheet: { rounded: 't-xl' } },
  },
});
