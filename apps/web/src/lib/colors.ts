// Categorical palette for distinguishing exercises in multi-select charts.
// Pulled from Vuetify theme colors so re-theming the app updates these too.
const PALETTE = ['primary', 'secondary', 'error', 'warning', 'info', 'success'];

export function exerciseColorVar(index: number): string {
  const name = PALETTE[index % PALETTE.length];
  return `rgb(var(--v-theme-${name}))`;
}
