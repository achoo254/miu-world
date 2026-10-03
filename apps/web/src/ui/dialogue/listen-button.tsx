// "🔊 Nghe / Listen" on a dialogue bubble, a lesson's question, a reading: reads the text in the language shown
// (in Song ngữ the Vietnamese then the English). Hidden where nothing can be read (no on-device voice, sound
// off). The reading stops when the text changes or the button goes away with its screen.
import { useEffect } from 'react';
import type { TextKey } from '../i18n/i18n';
import { T, useLangMode } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { linesToRead, speakLines, stopSpeaking, useSpeakableLangs } from './speech';

export function ListenButton({
  text,
  dataId,
  label = 'speech.listen',
  small = true,
}: {
  /** The line as shown; without `en` (textbook wording) it is read in Vietnamese. */
  text: Readonly<{ vi: string; en?: string }>;
  dataId: string;
  label?: TextKey;
  small?: boolean;
}) {
  const mode = useLangMode();
  const speakable = useSpeakableLangs();
  const lines = linesToRead(text, mode).filter((line) => speakable.has(line.lang));
  const key = `${text.vi}\n${text.en ?? ''}`;
  useEffect(() => () => stopSpeaking(), [key]);
  if (lines.length === 0) return null;
  return (
    <button type="button" className={buttonClass('ghost', { small })} data-id={dataId} onClick={() => speakLines(lines)}>
      <Icon name="speaker" size={24} />
      <T k={label} />
    </button>
  );
}
