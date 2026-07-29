// Vuetify's layout system sizes v-main's padding from the numeric `height`
// prop it registers for fixed elements like v-bottom-navigation - it doesn't
// observe the actual rendered box size. So env(safe-area-inset-bottom) alone
// (CSS-only) would grow the nav bar past what's reserved and get covered by
// page content. Measuring it in JS lets us fold it into the `height` prop
// too, while the CSS padding (added separately) provides the actual visual
// inset - both point at the same value, kept in sync by the browser.
export function measureSafeAreaBottom(): number {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.bottom = '0';
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  document.body.removeChild(probe);
  return value;
}
