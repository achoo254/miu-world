// Sharing out of the game: a link goes through the phone's share sheet (a copy of the link on a computer), a picture
// through the share sheet as a file (a download where files cannot be shared). Each completed share is reported once
// for the usage numbers (which way and what kind, nothing about who). Nothing here leaves the page by itself: the
// share sheet is the person's own choice, and cancelling it is not a failure.
import { trackShare, type ShareContentType } from '../../analytics/track';

export interface LinkShare {
  title: string;
  text: string;
  url: string;
}

export type LinkShareOutcome = 'web-share' | 'copy-link' | 'cancelled' | 'failed';
export type ImageShareOutcome = 'web-share' | 'download' | 'cancelled' | 'failed';

/** What a share is about, for the usage numbers: the kind, and the textbook lesson when it is one's result. */
export interface ShareKind {
  contentType: ShareContentType;
  lessonId?: string;
}

/** A phone or tablet (touch first) whose browser has a share sheet; a computer copies the link instead. */
export function hasShareSheet(): boolean {
  return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

const isCancel = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

/** Copies `text` to the clipboard; false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Shares a link by the share sheet, or copies it. */
export async function shareLink(share: LinkShare, kind: ShareKind): Promise<LinkShareOutcome> {
  if (hasShareSheet()) {
    try {
      await navigator.share(share);
      trackShare({ method: 'web-share', ...kind });
      return 'web-share';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      // The sheet failed to open: the link is copied instead.
    }
  }
  if (!(await copyText(share.url))) return 'failed';
  trackShare({ method: 'copy-link', ...kind });
  return 'copy-link';
}

/** Saves `file` to the device as a download. */
function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  // The click has started the download; the address can go once the browser has taken it.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Whether `file` can go through the share sheet on this device (the button says "share" rather than "save"). */
export function canShareFile(file: File): boolean {
  return hasShareSheet() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Shares a picture by the share sheet, or saves it. `text` goes with it (the link, for a picture that has none). */
export async function shareImage(file: File, text: string, kind: ShareKind): Promise<ImageShareOutcome> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], text });
      trackShare({ method: 'web-share', ...kind });
      return 'web-share';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      // The sheet failed to open: the picture is saved instead.
    }
  }
  try {
    download(file);
  } catch {
    return 'failed';
  }
  trackShare({ method: 'download', ...kind });
  return 'download';
}
