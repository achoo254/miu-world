// The portals' colours (owner's mock d-06), each a map's: the rim, the glow, the light inside and the core.
// Shared by the box props that draw a portal's tunnel (tools/world/structures/trung-tam-props.ts) and the
// game's sparks turning in it (apps/web/src/game/scene/portal-sparks.ts), so both glow in the same colour.
export const PORTAL_COLOURS = {
  yellow: ['#f5b70f', '#ffd84d', '#fff0a8', '#fffbe8'],
  green: ['#1fb455', '#5fe08f', '#b4f5cd', '#f0fff5'],
  orange: ['#ff7a12', '#ffab52', '#ffd6a3', '#fff4e6'],
  pink: ['#f2479a', '#ff8fc4', '#ffcde4', '#fff1f8'],
  teal: ['#0fae9e', '#4fe3cf', '#aef3e8', '#edfffc'],
  lime: ['#86bf1e', '#b8e35a', '#e1f6a8', '#fbfff0'],
  blue: ['#2f6ff0', '#6fa8ff', '#bfdcff', '#eef6ff'],
  red: ['#dc2f34', '#ff6f6f', '#ffbdbd', '#fff0f0'],
  ice: ['#3cc3f5', '#94e1ff', '#d8f4ff', '#ffffff'],
  violet: ['#8c3ff5', '#b98cff', '#e1d0ff', '#f8f2ff'],
  coral: ['#f45d4c', '#ff9688', '#ffd2cb', '#fff4f2'],
} as const;
export type PortalColour = keyof typeof PORTAL_COLOURS;

/** The colour of a portal model (`…/tt-portal-<colour>.glb`), or null for any other model. */
export function portalColourOf(model: string): PortalColour | null {
  const name = /\/tt-portal-([a-z]+)\.glb$/.exec(model)?.[1];
  return name && name in PORTAL_COLOURS ? (name as PortalColour) : null;
}
