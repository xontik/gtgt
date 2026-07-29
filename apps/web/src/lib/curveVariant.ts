// Drives the --gtg-curve* custom properties (global.css) per card instance
// so a repeated grid doesn't show the identical corner curve on every
// card - plain CSS nth-of-type can't do this for grid cards since each one
// is wrapped in its own v-col (so it's always "child 1" of its own parent).
const ANCHORS = [
  { anchor: 'top right', glow: '100% 0%' },
  { anchor: 'bottom left', glow: '0% 100%' },
  { anchor: 'top left', glow: '0% 0%' },
  { anchor: 'bottom right', glow: '100% 100%' },
];

export function curveStyle(index: number): Record<string, string> {
  const variant = (index % 4) + 1;
  const { anchor, glow } = ANCHORS[index % ANCHORS.length]!;
  return {
    '--gtg-curve': `var(--gtg-curve-${variant})`,
    '--gtg-curve-anchor': anchor,
    '--gtg-curve-glow': glow,
  };
}
