// Structural checks for a built character GLB: rig nodes, clips, budgets, and part placement.
import type { Document } from '@gltf-transform/core';

export const REQUIRED_NODES = ['root', 'torso', 'head', 'arm-left', 'arm-right', 'leg-left', 'leg-right'];
export const MAX_TRIANGLES = 5000;
export const MAX_DRAW_CALLS = 3;

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CharacterReport {
  errors: string[];
  triangles: number;
  drawCalls: number;
  materials: number;
  animations: string[];
  /** Bind-pose bounds of the vertices bound to each joint. */
  jointBounds: Map<string, Bounds>;
}

export function validateCharacter(doc: Document, options: { expectedAnimations: string[] }): CharacterReport {
  const root = doc.getRoot();
  const errors: string[] = [];
  const nodeNames = new Set(root.listNodes().map((n) => n.getName()));
  for (const name of REQUIRED_NODES) if (!nodeNames.has(name)) errors.push(`missing node ${name}`);

  const animations = root.listAnimations().map((a) => a.getName());
  for (const name of options.expectedAnimations) if (!animations.includes(name)) errors.push(`missing animation ${name}`);
  for (const anim of root.listAnimations()) {
    if (anim.listChannels().length === 0) errors.push(`animation ${anim.getName()} has no channels`);
  }

  let triangles = 0;
  let drawCalls = 0;
  const jointBounds = new Map<string, Bounds>();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const joints = node.getSkin()?.listJoints() ?? [];
    for (const prim of mesh.listPrimitives()) {
      drawCalls++;
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      triangles += (idx?.getCount() ?? pos?.getCount() ?? 0) / 3;
      const jointAttr = prim.getAttribute('JOINTS_0');
      if (!pos || !jointAttr) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        const jointName = joints[jointAttr.getElement(i, [0, 0, 0, 0])[0] ?? -1]?.getName();
        if (!jointName) {
          errors.push(`vertex ${i} is bound to a joint outside the skin`);
          break;
        }
        const p = pos.getElement(i, [0, 0, 0]);
        const b = jointBounds.get(jointName) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        for (let k = 0; k < 3; k++) {
          b.min[k] = Math.min(b.min[k] as number, p[k] as number);
          b.max[k] = Math.max(b.max[k] as number, p[k] as number);
        }
        jointBounds.set(jointName, b);
      }
    }
  }

  const materials = root.listMaterials().length;
  if (triangles > MAX_TRIANGLES) errors.push(`${triangles} triangles > ${MAX_TRIANGLES}`);
  if (drawCalls > MAX_DRAW_CALLS) errors.push(`${drawCalls} draw calls > ${MAX_DRAW_CALLS}`);
  if (materials !== 1) errors.push(`${materials} materials, expected 1`);

  const head = jointBounds.get('head');
  const torso = jointBounds.get('torso');
  if (!head || !torso) errors.push('head and torso must both own geometry');
  else if (head.min[1] < torso.max[1] - 1e-3) errors.push(`head (min y ${head.min[1].toFixed(3)}) overlaps torso (max y ${torso.max[1].toFixed(3)})`);

  return { errors, triangles, drawCalls, materials, animations, jointBounds };
}
