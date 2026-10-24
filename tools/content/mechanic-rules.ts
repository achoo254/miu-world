// Which quest mechanics may practise each kind of exercise (a clock exercise needs a clock challenge). A kind is
// practised when, among the steps that train it, every mechanic of at least one option is present. A new exercise
// kind fails to compile until it has a rule.
import type { ExerciseType } from '../../packages/schema/src/learning';

const INTERACTIVE = ['drag-drop', 'sort', 'classify', 'fill-blank', 'multi-select', 'clock', 'calendar', 'connect'].map((m) => [m]);

/**
 * Ways a quest may cover each exercise type. An item is covered when, among the steps pointing at it,
 * every mechanic of at least one option is present. A new exercise type fails to compile until it has a rule.
 */
export const MECHANIC_RULES: Record<ExerciseType, readonly (readonly string[])[]> = {
  'chon-dap-an': [['quiz'], ['multi-select']],
  noi: [['classify'], ['connect'], ['fill-blank']],
  'sap-xep': [['sort']],
  'tro-choi': INTERACTIVE,
  tinh: [['riddle'], ['fill-blank']],
  // Also "lập các số…": pick every number the cards can make.
  'dien-so': [['riddle'], ['fill-blank'], ['drag-drop'], ['multi-select']],
  // Signs between numbers, or "find the flowers greater than 60" (pick or sort into groups).
  'so-sanh': [['fill-blank'], ['multi-select'], ['classify']],
  dem: [['riddle'], ['fill-blank'], ['drag-drop']],
  'bai-toan-loi-van': [['riddle'], ['fill-blank']],
  'do-luong-thuc-hanh': [['worksheet']],
  've-hinh': [['connect'], ['worksheet']],
  'nhan-dien-hinh': [['multi-select'], ['quiz'], ['classify']],
  'xem-dong-ho': [['clock']],
  'xem-lich': [['calendar']],
  'khoi-dong': [['speak']],
  'doc-thanh-tieng': [['read']],
  'doc-hieu': [['read'], ['quiz'], ['multi-select'], ['classify']],
  'tim-tu': [['classify'], ['multi-select'], ['fill-blank']],
  'dien-chu': [['fill-blank']],
  'xep-tu': [['sort'], ['classify']],
  'dat-cau': [['sort'], ['classify']],
  'dau-cau': [['fill-blank']],
  'ke-chuyen-tranh': [['sort', 'speak']],
  'noi-ve-ban-than': [['speak']],
  'viet-chu': [['worksheet']],
  'nghe-viet': [['worksheet']],
  'viet-doan': [['worksheet']],
};
