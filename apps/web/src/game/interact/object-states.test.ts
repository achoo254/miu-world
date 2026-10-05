import { describe, expect, it } from 'vitest';
import { ObjectStates } from './object-states';

describe('switched objects', () => {
  it('starts from what her home kept, saves only kept states that are on, and tells listeners of changes', () => {
    const states = new ObjectStates({ 'lamp-toggle@lamp#0': true });
    expect(states.isOn('lamp-toggle@lamp#0')).toBe(true);
    const heard: string[] = [];
    states.onChange((key, on) => heard.push(`${key}=${on}`));
    states.toggle('tv-watch@77,14,61');
    states.set('front-door@79,13,57', true, false);
    states.set('lamp-toggle@lamp#0', false);
    expect(states.saved()).toEqual({ 'tv-watch@77,14,61': true });
    expect(states.keysOn()).toEqual(['front-door@79,13,57', 'tv-watch@77,14,61']);
    expect(heard).toEqual(['tv-watch@77,14,61=true', 'front-door@79,13,57=true', 'lamp-toggle@lamp#0=false']);
    // Setting what already is tells nobody.
    states.set('tv-watch@77,14,61', true);
    expect(heard).toHaveLength(3);
  });

  it('drops a malformed saved set instead of trusting it', () => {
    expect(new ObjectStates({ 'Not A Key': true } as Record<string, boolean>).keysOn()).toEqual([]);
  });

  it('visiting another player\'s home shows everything off and keeps nothing switched there; back home, hers is as she left it', () => {
    const states = new ObjectStates({ 'lamp-toggle@lamp#0': true });
    states.setKeeping(false);
    expect(states.keysOn()).toEqual([]);
    states.toggle('tv-watch@77,14,61');
    expect(states.saved()).toEqual({ 'lamp-toggle@lamp#0': true });
    states.setKeeping(true);
    expect(states.keysOn()).toEqual(['lamp-toggle@lamp#0']);
    expect(states.saved()).toEqual({ 'lamp-toggle@lamp#0': true });
  });

  it('saves only keys of objects the map still has', () => {
    const states = new ObjectStates({ 'tv-watch@1,2,3': true, 'lamp-toggle@lamp#0': true });
    expect(states.saved(new Set(['lamp-toggle@lamp#0']))).toEqual({ 'lamp-toggle@lamp#0': true });
  });
});
