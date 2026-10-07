// Where the companion bots walk on a map (content/world/bot-routes/<map>.json, written by `pnpm world:bot-routes`):
// the places a bot goes to (quest targets, named places, starts, gates, ride stops), each with a few spots to stand
// on beside it, and the ways between them as the child's own auto-walk finds them (along the laid paths, round
// walls and fences). The server walks a bot along these polylines and never searches the voxels itself.
import { z } from 'zod';
import { ContentId } from './content';

export const BOT_ROUTES_VERSION = 1;

/** Block coordinates: x and z at a block's centre, y the feet's block. */
const Point = z.tuple([z.number(), z.number(), z.number()]);
export type BotRoutePoint = z.infer<typeof Point>;

/**
 * What a stop is: a quest's target, a named place, the map's spawn, a chapter's start, a gate to another map, a
 * ride's stop, or where a ride sets down.
 */
export const BOT_STOP_KINDS = ['target', 'landmark', 'spawn', 'chapter', 'gate', 'stop', 'arrival'] as const;
export type BotStopKind = (typeof BOT_STOP_KINDS)[number];

export const BotStop = z.strictObject({
  /** A target's own id (quest steps name it); `landmark:<id>`, `spawn`, `chapter:<n>`, `arrival:<ride stop id>` for the rest. */
  id: z.string().min(1).max(80),
  kind: z.enum(BOT_STOP_KINDS),
  /** x, z the bot turns to while it stands there. */
  face: z.tuple([z.number(), z.number()]),
  /** Standing spots near the place, the first on the network (every edge of this stop starts or ends there). */
  spots: z.array(Point).min(1).max(4),
});
export type BotStop = z.infer<typeof BotStop>;

export const BotEdge = z.strictObject({
  /** Indexes into `stops`, a < b; the polyline runs from a's first spot to b's. */
  a: z.number().int().min(0),
  b: z.number().int().min(0),
  /** Length of the polyline (blocks). */
  length: z.number().positive(),
  /** Waypoints, both ends included: straight runs on one level merged as the auto-walk merges them. */
  points: z.array(Point).min(2),
});
export type BotEdge = z.infer<typeof BotEdge>;

export const BotRoutes = z
  .strictObject({
    version: z.literal(BOT_ROUTES_VERSION),
    map: ContentId,
    /** sha256 over the inputs' sha256s (the map's files in assets/manifest.json, the block and model tables, its events): a stale file shows. */
    sources: z.string().regex(/^[0-9a-f]{64}$/),
    stops: z.array(BotStop).min(1),
    edges: z.array(BotEdge),
    /** A ride's stop (a) to where it sets down (b): the bot rides instead of walking. */
    rides: z.array(z.strictObject({ a: z.number().int().min(0), b: z.number().int().min(0) })),
    /** Places with spots to stand on but no way from the spawn's network: left out of `stops`. */
    isolated: z.array(z.string()),
    /** Places with no spot to stand on beside them: left out of `stops`. */
    unplaced: z.array(z.string()),
  })
  .superRefine((routes, ctx) => {
    const ids = new Set<string>();
    for (const [i, stop] of routes.stops.entries()) {
      if (ids.has(stop.id)) ctx.addIssue({ code: 'custom', path: ['stops', i, 'id'], message: `duplicate stop ${stop.id}` });
      ids.add(stop.id);
    }
    const n = routes.stops.length;
    const same = (p: BotRoutePoint | undefined, q: BotRoutePoint | undefined): boolean => !!p && !!q && p[0] === q[0] && p[1] === q[1] && p[2] === q[2];
    for (const [i, edge] of routes.edges.entries()) {
      if (edge.a >= edge.b || edge.b >= n) {
        ctx.addIssue({ code: 'custom', path: ['edges', i], message: `edge ${edge.a}-${edge.b}: needs a < b < ${n}` });
        continue;
      }
      if (!same(edge.points[0], routes.stops[edge.a]?.spots[0]) || !same(edge.points.at(-1), routes.stops[edge.b]?.spots[0])) {
        ctx.addIssue({ code: 'custom', path: ['edges', i], message: `edge ${edge.a}-${edge.b}: must run from the first spot of stop a to the first spot of stop b` });
      }
    }
    for (const [i, ride] of routes.rides.entries()) {
      if (ride.a >= n || ride.b >= n || ride.a === ride.b) ctx.addIssue({ code: 'custom', path: ['rides', i], message: `ride ${ride.a}-${ride.b}: stops out of range` });
    }
  });
export type BotRoutes = z.infer<typeof BotRoutes>;
