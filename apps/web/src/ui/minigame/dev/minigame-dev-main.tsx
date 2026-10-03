// Entry of minigame.html (developer tool, left out of the release build by vite.config.ts).
import '../../../zod-config';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../fonts.css';
import '../../tokens.css';
import '../../styles.css';
import { MinigameDevPage } from './minigame-dev';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <MinigameDevPage />
  </StrictMode>,
);
