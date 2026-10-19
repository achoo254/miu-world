import { describe, expect, it } from 'vitest';
import { HEAD_GAP, promptClearOf } from './prompt-placement';

// Her on screen: a figure 100 px wide from y 400 (ears) to 600 (feet), in the middle of an iPad.
const her = { left: 360, right: 460, top: 400, bottom: 600 };
const label = { width: 140, height: 32 };

describe('the Interact label and her head', () => {
  it('lifts a label resting on her head (a target just behind her) clear above it', () => {
    expect(promptClearOf({ x: 410, y: 402 }, label, her)).toEqual({ x: 410, y: 400 - HEAD_GAP });
    expect(promptClearOf({ x: 410, y: 520 }, label, her)).toEqual({ x: 410, y: 400 - HEAD_GAP });
  });

  it('leaves a label that is already clear of her: above, beside, or wholly under her', () => {
    expect(promptClearOf({ x: 410, y: 300 }, label, her)).toEqual({ x: 410, y: 300 });
    expect(promptClearOf({ x: 600, y: 450 }, label, her)).toEqual({ x: 600, y: 450 });
    expect(promptClearOf({ x: 410, y: 700 }, label, her)).toEqual({ x: 410, y: 700 });
  });
});
