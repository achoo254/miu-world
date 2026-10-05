// Nametag sprite rendered over remote players and companion bots.
// Always clearly renders "[Bạn máy]" badge for bots per Jev 03/10/2026; members of the child's party get a star and a
// party-coloured edge, so she finds them in a crowd.
import { CanvasTexture, SRGBColorSpace, Sprite, SpriteMaterial } from 'three';
import { t } from '../../ui/i18n/i18n';

const WIDTH = 384;
const HEIGHT = 96;
const WORLD_WIDTH = 2.2;

export function createNametag(name: string, isBot: boolean, partyMate = false): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const label = isBot ? `🤖 [${t('online.botLabel')}] ${name}` : name;
    const text = partyMate ? `⭐ ${label}` : label;
    ctx.font = '700 36px "Baloo 2", "Nunito", sans-serif';
    const textWidth = Math.min(WIDTH - 40, ctx.measureText(text).width);
    const cardWidth = textWidth + 40;
    const cardHeight = 60;
    const x = (WIDTH - cardWidth) / 2;
    const y = 16;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 3, cardWidth, cardHeight, 18);
    ctx.fill();

    // Background pill
    if (partyMate) {
      // The party colour, as on the party frame (--color-grass of the UI tokens; a canvas cannot read CSS).
      ctx.fillStyle = '#2b2140';
      ctx.strokeStyle = '#7ed36b';
      ctx.lineWidth = 6;
    } else if (isBot) {
      // Warm friendly mint/amber badge for companion bots
      ctx.fillStyle = '#2d6a4f';
      ctx.strokeStyle = '#b7e4c7';
      ctx.lineWidth = 4;
    } else {
      ctx.fillStyle = '#2b2140';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, WIDTH / 2, y + cardHeight / 2 + 2, cardWidth - 24);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const sprite = new Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.scale.set(WORLD_WIDTH, (WORLD_WIDTH * HEIGHT) / WIDTH, 1);
  sprite.renderOrder = 12;

  return sprite;
}
