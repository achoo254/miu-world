// Things in the child's home that open the timetable board instead of a quest step: the timetable on the
// wall above the desk, and the uniform calendar beside the wardrobe (map `nha-cua-be`).

/** Which part of the board comes first when it opens. */
export type TimetableFocus = 'timetable' | 'uniform';

export const TIMETABLE_TARGETS: ReadonlyMap<string, TimetableFocus> = new Map([
  ['nha-thoi-khoa-bieu', 'timetable'],
  ['nha-lich-dong-phuc', 'uniform'],
]);
