// Keyframe clips authored as JSON (euler degrees / translation offsets) and resampled with easing,
// so preview animations missing from the source rig (wave, jump, yawn, cheer) need no hand animation.
import { quat } from 'gl-matrix';
import { z } from 'zod';

export const CLIP_FPS = 30;

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const clipSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  duration: z.number().positive(),
  tracks: z.array(z.object({
    node: z.string().min(1),
    /** rotation: euler XYZ degrees applied on top of the bind rotation; translation: offset from bind. */
    path: z.enum(['rotation', 'translation']),
    keys: z.array(z.object({ t: z.number().nonnegative(), v: vec3Schema })).min(2),
  })).min(1),
});
export type Clip = z.infer<typeof clipSchema>;
export type ClipTrack = Clip['tracks'][number];

export interface SampledTrack {
  node: string;
  path: 'rotation' | 'translation';
  times: Float32Array<ArrayBuffer>;
  values: Float32Array<ArrayBuffer>;
}

/** Cosine ease-in-out between keys: removes the robotic feel of linear keyframes. */
function ease(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

function sampleKeys(keys: ClipTrack['keys'], t: number): [number, number, number] {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) throw new Error('track needs keys');
  if (t <= first.t) return first.v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (!a || !b || t > b.t) continue;
    const k = ease((t - a.t) / Math.max(b.t - a.t, 1e-6));
    return [a.v[0] + (b.v[0] - a.v[0]) * k, a.v[1] + (b.v[1] - a.v[1]) * k, a.v[2] + (b.v[2] - a.v[2]) * k];
  }
  return last.v;
}

export function validateClip(clip: Clip): void {
  for (const track of clip.tracks) {
    let prev = -1;
    for (const key of track.keys) {
      if (key.t <= prev) throw new Error(`${clip.name}/${track.node}: key times must increase`);
      if (key.t > clip.duration + 1e-6) throw new Error(`${clip.name}/${track.node}: key at ${key.t}s is past duration`);
      prev = key.t;
    }
  }
}

/** Resamples each track at CLIP_FPS and composes it with the node's bind pose. */
export function sampleClip(
  clip: Clip,
  bind: (node: string) => { rotation: quat; translation: [number, number, number] },
): SampledTrack[] {
  validateClip(clip);
  const frames = Math.round(clip.duration * CLIP_FPS);
  const times = new Float32Array(frames + 1);
  for (let f = 0; f <= frames; f++) times[f] = Math.min(f / CLIP_FPS, clip.duration);

  return clip.tracks.map((track) => {
    const pose = bind(track.node);
    const values = new Float32Array(times.length * (track.path === 'rotation' ? 4 : 3));
    times.forEach((t, f) => {
      const v = sampleKeys(track.keys, t);
      if (track.path === 'rotation') {
        const delta = quat.fromEuler(quat.create(), v[0], v[1], v[2]);
        const q = quat.multiply(quat.create(), pose.rotation, delta);
        values.set(q, f * 4);
      } else {
        values.set([pose.translation[0] + v[0], pose.translation[1] + v[1], pose.translation[2] + v[2]], f * 3);
      }
    });
    return { node: track.node, path: track.path, times, values };
  });
}
