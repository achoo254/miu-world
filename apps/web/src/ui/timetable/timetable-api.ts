// The selected child's timetable on the server (blank template until the family fills it in).
import { Timetable } from '@miu/schema/timetable';
import { api } from '../api-client';

export function loadTimetable(): Promise<Timetable> {
  return api('GET', '/timetable', Timetable);
}

/** Stores the whole timetable; resolves with what the server kept (text trimmed). */
export function saveTimetable(timetable: Timetable): Promise<Timetable> {
  return api('PUT', '/timetable', Timetable, timetable);
}
