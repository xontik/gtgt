// navigator.vibrate is unsupported on iOS Safari and desktop browsers -
// this is a best-effort nicety, never something to depend on.
export function vibrateSuccess() {
  navigator.vibrate?.(15);
}

export function vibrateMilestone() {
  navigator.vibrate?.([20, 40, 20]);
}
