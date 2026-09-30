import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo `content/` directory (its own module so the catalogue and the textbook reader share it without a cycle). */
export const CONTENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../content');
