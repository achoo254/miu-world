// Lines the screen says again and again, in pools that rotate without repeats (owner rule: nothing
// that loops may repeat back-to-back). `{name}` is the player's character name; `{who}` the target.
import type { InteractableKind } from '../../game-bridge/game-store';

/** Talking to someone (or touching something) whose turn in the quest has not come yet. */
export const NOT_NOW_LINES: Record<InteractableKind, readonly string[]> = {
  npc: [
    '{who}: Tớ đang đợi {name} ở bước sau nhé!',
    '{who}: {name} xem nhiệm vụ hiện tại ở góc trái nhé.',
    '{who}: Chưa đến lượt tớ đâu, {name} đi theo mũi tên vàng nào.',
    '{who}: Hẹn gặp {name} một lát nữa!',
    '{who}: {name} ơi, còn việc đang dang dở kìa.',
  ],
  object: [
    '{who} vẫn nằm im ở đây. Có lẽ để sau nhé.',
    '{name} nhìn {who} một lúc, chưa thấy gì lạ.',
    'Chưa phải lúc dùng tới {who}.',
    '{who} có vẻ chờ {name} quay lại sau.',
  ],
  riddle: [
    '{who} đang ngủ say. Hãy làm xong việc trước đã.',
    '{who} khẽ rung lá, như muốn nói: chưa đến lúc.',
    'Gió thổi qua {who}. {name} quay lại sau nhé.',
  ],
  chest: [
    '{who} khóa chặt. Cần giải đố trước.',
    '{name} thử nhấc nắp {who} nhưng nó không nhúc nhích.',
    '{who} kêu cạch cạch. Chìa khóa ở đâu nhỉ?',
  ],
  gate: [
    '{who} đóng kín. Phải xong chương này mới mở được.',
    '{name} đẩy thử {who}, nó vẫn đứng im.',
    'Sau {who} là chương mới, nhưng chưa mở đâu.',
  ],
};

/** A clue just found, when the server sends no line of its own. */
export const FOUND_LINES: readonly string[] = [
  'Giỏi lắm {name}! Tìm thấy {who}.',
  'A ha! {who} đây rồi.',
  '{name} tinh mắt thật, thấy ngay {who}!',
  'Thêm một manh mối: {who}.',
  'Tuyệt! {who} nằm ngay đây.',
];

export function fillLine(line: string, who: string, name: string): string {
  return line.replaceAll('{who}', who).replaceAll('{name}', name);
}

/** A wrong answer on a step whose content has no feedback pool of its own. */
export const TRY_AGAIN_LINES: readonly string[] = [
  'Gần đúng rồi, {name} thử lại nhé!',
  'Chưa khớp đâu. Mở Gợi ý nếu cần nha.',
  'Không sao, sai là để học mà. Thử lần nữa nào!',
  '{name} bình tĩnh đếm lại xem sao.',
  'Hmm, chưa phải. Mình cùng thử cách khác nhé.',
];

/** Touching anything once the chapter is done (the child came back to wander). */
export const DONE_LINES: readonly string[] = [
  '{who}: Cảm ơn {name} đã giúp mọi người ở đây nhé!',
  '{who}: Nơi này vui hẳn lên nhờ {name} đấy.',
  '{who}: Nhiệm vụ mới sắp tới, {name} nhớ quay lại nha!',
  '{name} ngắm {who} một lát. Mọi thứ đã yên bình.',
  '{who}: {name} giỏi quá, việc ở đây xong hết rồi!',
];
