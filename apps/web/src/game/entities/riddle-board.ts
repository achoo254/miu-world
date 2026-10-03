// Wooden board on a post with runtime-painted text (the ancient tree's "8 + 5 = ?", the name board of the
// child's home). Text is drawn onto a canvas at load (Master Plan §10: no baked text in textures). Post and
// board share one geometry and one material, so the whole board is a single draw call.
import { BoxGeometry, CanvasTexture, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BOARD_WIDTH = 1.6;
const BOARD_HEIGHT = 0.9;
const POST_HEIGHT = 1.4;
const FONT_PX = 120;
/** A longer line (a name board: "Nhà của …") shrinks to fit the board, down to this size. */
const MIN_FONT_PX = 44;
const font = (px: number): string => `700 ${px}px "Baloo 2", system-ui, sans-serif`;
const FONT = font(FONT_PX);
/** Canvas UV inside the dark frame: the post samples this single texel, so it reads as plain wood. */
const FRAME_UV = 0.01;

function paintText(text: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * BOARD_HEIGHT) / BOARD_WIDTH);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c8955a'; // planks
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = '#3b2412';
    let px = FONT_PX;
    ctx.font = font(px);
    while (px > MIN_FONT_PX && ctx.measureText(text).width > canvas.width - 56) {
      px -= 4;
      ctx.font = font(px);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 6);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A board facing +z, standing on its post at the origin; the caller places and rotates it. */
export async function createRiddleBoard(text: string, shadows: boolean): Promise<Mesh> {
  // The self-hosted font may not be loaded yet; the fallback font still reads fine if it fails.
  await document.fonts.load(FONT).catch(() => undefined);
  const post = new BoxGeometry(0.18, POST_HEIGHT, 0.18).translate(0, POST_HEIGHT / 2, 0);
  const uv = post.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, FRAME_UV, FRAME_UV);
  const face = new PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT).translate(0, POST_HEIGHT + BOARD_HEIGHT / 2 - 0.1, 0.1);
  const geometry = mergeGeometries([post.toNonIndexed(), face.toNonIndexed()]);
  post.dispose();
  face.dispose();
  const board = new Mesh(geometry, new MeshLambertMaterial({ map: paintText(text) }));
  board.name = 'riddle-board';
  board.castShadow = shadows;
  return board;
}
