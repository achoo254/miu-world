// Imported first by main.tsx, before any module builds or parses a schema: the CSP forbids eval, so
// Zod must not probe for it (the probe shows up as a CSP violation).
import { z } from 'zod';

z.config({ jitless: true });
