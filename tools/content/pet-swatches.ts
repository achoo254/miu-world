// Which swatches of the Cube Pets' colour atlas a model samples, read straight from its .glb (no GPU, no
// image): `pnpm content:check` uses it so a pet's colour variant only names swatches its model really
// draws with (a variant that recolours nothing would look exactly like its base pet).
import { readFileSync } from 'node:fs';
import { swatchAt, type PetSwatch } from '../../packages/schema/src/pet';

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;

interface GltfJson {
  meshes?: Array<{ primitives: Array<{ attributes: Record<string, number | undefined> }> }>;
  accessors?: Array<{ bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string }>;
  bufferViews?: Array<{ byteOffset?: number; byteStride?: number }>;
}

export function modelSwatches(file: string): Set<PetSwatch> {
  const bytes = readFileSync(file);
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${file} is not a binary glTF`);
  let json: GltfJson | undefined;
  let bin: Buffer | undefined;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(chunk.toString('utf8')) as GltfJson;
    else if (type === BIN_CHUNK) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file} has no JSON or binary chunk`);
  const swatches = new Set<PetSwatch>();
  for (const primitive of (json.meshes ?? []).flatMap((m) => m.primitives)) {
    const index = primitive.attributes.TEXCOORD_0;
    if (index === undefined) continue;
    const accessor = json.accessors?.[index];
    const view = accessor?.bufferView === undefined ? undefined : json.bufferViews?.[accessor.bufferView];
    if (!accessor || !view || accessor.componentType !== FLOAT || accessor.type !== 'VEC2') {
      throw new Error(`${file}: texture coordinates ${index} are not plain float pairs`);
    }
    const stride = view.byteStride ?? 8;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let i = 0; i < accessor.count; i += 1) {
      const at = start + i * stride;
      const swatch = swatchAt(bin.readFloatLE(at), bin.readFloatLE(at + 4));
      if (swatch) swatches.add(swatch);
    }
  }
  return swatches;
}
