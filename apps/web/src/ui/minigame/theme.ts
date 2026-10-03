// Colours a minigame paints its background with, by the map it is played on (a snowy field on Núi tuyết, sand
// on Đảo bí ẩn…). Every colour is a design token (tokens.css), read once when a round opens.

export type ThemeId = 'forest' | 'meadow' | 'town' | 'castle' | 'farm' | 'snow' | 'beach' | 'river';

export interface Theme {
  id: ThemeId;
  /** Sky from top to horizon. */
  sky: readonly [string, string, string];
  /** The ground's top (grass, snow, sand) and the soil under it. */
  ground: string;
  groundDeep: string;
  water: string;
  waterLight: string;
  leaf: string;
  wood: string;
  woodEdge: string;
  stone: string;
  stoneEdge: string;
  /** Clouds, snow, highlights. */
  light: string;
  /** Text and outlines. */
  ink: string;
  star: string;
  primary: string;
  secondary: string;
  danger: string;
  /** The display font (`--font-display`), for numbers and words painted on the canvas. */
  font: string;
}

const REGION_THEMES: Readonly<Record<string, ThemeId>> = {
  'khu-rung-bi-mat': 'forest',
  'nha-cua-be': 'meadow',
  'xom-mai-am': 'meadow',
  'trung-tam': 'town',
  'truong-hoc': 'town',
  'thu-vien': 'town',
  'cho-phien': 'town',
  'lau-dai': 'castle',
  'nong-trai': 'farm',
  'nui-tuyet': 'snow',
  'dao-bi-an': 'beach',
  'lang-ven-song': 'river',
};

export const themeIdFor = (region: string | null | undefined): ThemeId => (region ? REGION_THEMES[region] : undefined) ?? 'meadow';

/** Reads a token from the page's root style ('' where there is none, as in tests). */
export function cssToken(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function themeFor(region: string | null | undefined, token: (name: string) => string = cssToken): Theme {
  const id = themeIdFor(region);
  const t = (name: string): string => token(`--color-${name}`);
  const base: Theme = {
    id,
    sky: [t('sky-top'), t('sky-mid'), t('sky-bottom')],
    ground: t('grass'),
    groundDeep: t('dirt'),
    water: t('water'),
    waterLight: t('water-light'),
    leaf: t('leaf'),
    wood: t('wood'),
    woodEdge: t('wood-edge'),
    stone: t('stone'),
    stoneEdge: t('stone-edge'),
    light: t('cloud'),
    ink: t('ink'),
    star: t('star'),
    primary: t('primary'),
    secondary: t('secondary'),
    danger: t('danger'),
    font: token('--font-display') || 'sans-serif',
  };
  switch (id) {
    case 'snow':
      return { ...base, sky: [t('sky-top'), t('sky-mid'), t('cloud')], ground: t('cloud'), groundDeep: t('water-light') };
    case 'beach':
    case 'river':
      return { ...base, ground: t('parchment-deep'), groundDeep: t('parchment-edge') };
    case 'town':
    case 'castle':
      return { ...base, ground: t('stone-top'), groundDeep: t('stone') };
    case 'farm':
      return { ...base, groundDeep: t('dirt-deep') };
    default:
      return base;
  }
}
