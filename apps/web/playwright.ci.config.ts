import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// CI runs every project except `perf` (up to ~30 min, rewrites the committed perf report), so a new
// spec with its own project joins CI without touching the workflow.
export default defineConfig({ ...base, projects: (base.projects ?? []).filter((project) => project.name !== 'perf') });
