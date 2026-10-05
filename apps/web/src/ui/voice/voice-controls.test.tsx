import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PartyView } from '@miu/schema/multiplayer';
import type { VoiceChannel } from '@miu/schema/voice';
import { createSocialStore, type SocialCommand, type VoiceOut } from '../../game-bridge/social-store';
import { PartyFrame, SocialLayer, toastText } from '../online/social-layer';
import { CallBar, FriendCallButton } from './voice-controls';
import { VoiceManager } from './voice-manager';
import { VoiceChatSettings } from './voice-chat-settings';
import { readVoiceSettings } from './voice-settings';

const PARTY: PartyView = {
  id: 'party-1',
  leader: 'p-a',
  members: [
    { id: 'p-a', displayName: 'Mochi', isBot: false, species: 'cat', pet: null, mapId: 'trung-tam' },
    { id: 'p-b', displayName: 'Bông', isBot: false, species: 'rabbit', pet: null, mapId: 'trung-tam' },
    { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true, species: 'rabbit', pet: null, mapId: 'trung-tam' },
  ],
};

const VOICE: VoiceChannel = {
  kind: 'party',
  joined: true,
  members: [
    { id: 'p-a', displayName: 'Mochi', isBot: false, mic: true, voice: null },
    { id: 'p-b', displayName: 'Bông', isBot: false, mic: false, voice: null },
    { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true, mic: true, voice: { pitch: 1.2, rate: 1 } },
  ],
};

function setup() {
  const social = createSocialStore();
  social.update({ selfId: 'p-a', party: PARTY, mapId: 'trung-tam' });
  const sent: VoiceOut[] = [];
  social.onCommand((c: SocialCommand) => {
    if (c.type === 'voice') sent.push(c.message);
  });
  const track = { enabled: true, stop: vi.fn() };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  const voice = new VoiceManager(social, {
    getUserMedia: async () => stream,
    createPeer: () => ({ close() {}, getTransceivers: () => [], addTransceiver: () => ({ sender: { replaceTrack: async () => {} } }), createOffer: async () => ({ sdp: 'x' }), setLocalDescription: async () => {}, localDescription: { sdp: 'x' } }) as unknown as RTCPeerConnection,
    createAudioContext: () => null,
    iceServers: async () => ({ iceServers: [{ urls: 'stun:stun.example:3478' }], ttlSeconds: 3600 }),
    speak: () => false,
  });
  voice.start();
  return { social, voice, sent };
}

beforeEach(() => {
  window.localStorage.clear();
  // The party frame open (not folded to faces).
  window.localStorage.setItem('miu.party.folded', '0');
});

afterEach(() => {
  cleanup();
});

describe('voice in the party frame', () => {
  it('joins with a tap, then turns the microphone off and on; leaving releases it', async () => {
    const { social, voice, sent } = setup();
    render(<PartyFrame social={social} voice={voice} fill={(t) => t} />);
    fireEvent.click(screen.getByRole('button', { name: /Nói chuyện bằng giọng với đội/ }));
    await waitFor(() => expect(sent).toEqual([{ type: 'voice-join', mic: true }]));
    act(() => social.voiceIn({ type: 'voice-state', channel: VOICE }));
    const mic = screen.getByRole('button', { name: 'Tắt micro' });
    expect(mic.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(mic);
    await waitFor(() => expect(sent.at(-1)).toEqual({ type: 'voice-mic', on: false }));
    expect(screen.getByRole('button', { name: 'Bật micro' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Rời trò chuyện/ }));
    expect(sent.at(-1)).toEqual({ type: 'voice-leave' });
    expect(screen.getByRole('button', { name: /Nói chuyện bằng giọng với đội/ })).toBeTruthy();
  });

  it('marks who is in the voice and rings whoever talks', async () => {
    const { social, voice } = setup();
    await act(() => voice.join());
    act(() => social.voiceIn({ type: 'voice-state', channel: VOICE }));
    const { container } = render(<PartyFrame social={social} voice={voice} fill={(t) => t} />);
    expect(container.querySelector('[data-id="voice-mark-p-b"]')?.getAttribute('data-mic')).toBe('false');
    expect(container.querySelector('[data-id="voice-mark-bot-tt-1"]')).toBeTruthy();
    act(() => social.voiceIn({ type: 'voice-speaking', id: 'p-b', on: true }));
    const row = container.querySelector('[data-id="online-party-member-p-b"] .online-party-portrait');
    expect(row?.getAttribute('data-speaking')).toBe('true');
    expect(screen.getByLabelText('Bông đang nói')).toBeTruthy();
  });

  it('mutes one member or sets her volume, from her row', async () => {
    const { social, voice } = setup();
    await act(() => voice.join());
    act(() => social.voiceIn({ type: 'voice-state', channel: VOICE }));
    const { container } = render(<PartyFrame social={social} voice={voice} fill={(t) => t} />);
    fireEvent.click(container.querySelector('[data-id="online-party-member-p-b"] button') as Element);
    fireEvent.click(screen.getByRole('button', { name: 'Tắt tiếng Bông' }));
    expect(voice.getSnapshot().muted['p-b']).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bật tiếng Bông' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Âm lượng của Bông' }), { target: { value: '40' } });
    expect(voice.getSnapshot().volumes['p-b']).toBe(0.4);
  });

  it('shows no microphone button with voice switched off in the settings', () => {
    window.localStorage.setItem('miu.voiceChat', JSON.stringify({ enabled: false }));
    const { social, voice } = setup();
    render(<PartyFrame social={social} voice={voice} fill={(t) => t} />);
    expect(screen.queryByRole('button', { name: /Nói chuyện bằng giọng/ })).toBeNull();
  });
});

describe('calls', () => {
  it('a friend calling shows a card to answer; the call bar shows who she talks with', async () => {
    const { social, voice, sent } = setup();
    render(
      <>
        <SocialLayer social={social} voice={voice} covered={false} fill={(t) => t} />
        <CallBar voice={voice} social={social} />
      </>,
    );
    act(() => social.voiceIn({ type: 'voice-call-invite', from: { id: 'p-c', displayName: 'Cáo', species: 'fox' }, expiresInMs: 30_000 }));
    expect(screen.getByText(/Cáo gọi cho bạn/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Nghe máy' }));
    await waitFor(() => expect(sent).toEqual([{ type: 'voice-call-reply', from: 'p-c', accept: true }]));
    act(() =>
      social.voiceIn({
        type: 'voice-state',
        channel: { kind: 'call', joined: true, members: [{ id: 'p-a', displayName: 'Mochi', isBot: false, mic: true, voice: null }, { id: 'p-c', displayName: 'Cáo', isBot: false, mic: true, voice: null }] },
      }),
    );
    expect(screen.getByText(/Đang nói chuyện với Cáo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Kết thúc/ }));
    expect(sent.at(-1)).toEqual({ type: 'voice-leave' });
  });

  it('calls a friend from the friends list and tells why a call did not start', async () => {
    const { social, voice, sent } = setup();
    render(<FriendCallButton voice={voice} id="p-c" name="Cáo" dataId="friend-call-x" />);
    fireEvent.click(screen.getByRole('button', { name: 'Gọi Cáo bằng giọng' }));
    await waitFor(() => expect(sent).toEqual([{ type: 'voice-call', to: 'p-c' }]));
    act(() => social.voiceIn({ type: 'voice-call-end', id: 'p-c', reason: 'busy' }));
    const toast = social.getSnapshot().toast;
    expect(toast && toastText(toast).vi).toBe('Cáo đang bận nói chuyện.');
    expect(toast && toastText(toast).en).toBe('Cáo is already talking with someone.');
  });
});

describe('voice chat settings', () => {
  it('switch voice off, push-to-talk on, and set the volume on this device', () => {
    render(<VoiceChatSettings dataId="s" />);
    fireEvent.change(screen.getByRole('slider', { name: 'Âm lượng giọng nói' }), { target: { value: '60' } });
    expect(readVoiceSettings().volume).toBe(0.6);
    const ptt = screen.getByRole('radiogroup', { name: 'Bấm giữ để nói' });
    fireEvent.click(ptt.querySelector('[data-id="s-ptt-on"]') as Element);
    expect(readVoiceSettings().pushToTalk).toBe(true);
    const chat = screen.getByRole('radiogroup', { name: 'Nói chuyện bằng giọng' });
    fireEvent.click(chat.querySelector('[data-id="s-chat-off"]') as Element);
    expect(readVoiceSettings().enabled).toBe(false);
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
