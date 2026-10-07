// The Olympic Math practice's calls: every answer is graded by the server, support layers come one at a time, a run
// (practice or mock exam) is named by an id made here when it starts so a resent request pays nothing twice.
import {
  ExamResponse,
  ExamSubmitResponse,
  OlympiadStatusResponse,
  PracticeCheckResponse,
  PracticeFinishResponse,
  PracticeResponse,
  PracticeSupportResponse,
  type OlympiadTopicId,
} from '@miu/schema/olympiad';
import { api } from '../../api-client';

export const loadStatus = (): Promise<OlympiadStatusResponse> => api('GET', '/olympiad/status', OlympiadStatusResponse);
export const loadPractice = (topic: OlympiadTopicId): Promise<PracticeResponse> => api('GET', `/olympiad/practice/${topic}`, PracticeResponse);
export const checkPractice = (questionId: string, runId: string, choice: string): Promise<PracticeCheckResponse> =>
  api('POST', `/olympiad/practice/${encodeURIComponent(questionId)}/check`, PracticeCheckResponse, { runId, choice });
export const practiceSupport = (questionId: string, layer: 'guide' | 'hint' | 'answer'): Promise<PracticeSupportResponse> =>
  api('POST', `/olympiad/practice/${encodeURIComponent(questionId)}/support`, PracticeSupportResponse, { layer });
export const finishPractice = (topic: OlympiadTopicId, runId: string): Promise<PracticeFinishResponse> => api('POST', `/olympiad/practice/${topic}/finish`, PracticeFinishResponse, { runId });
export const loadExam = (): Promise<ExamResponse> => api('GET', '/olympiad/exam', ExamResponse);
export const submitExam = (runId: string, answers: Readonly<Record<string, string>>, elapsedSeconds: number): Promise<ExamSubmitResponse> =>
  api('POST', '/olympiad/submit', ExamSubmitResponse, { runId, answers, elapsedSeconds });

/**
 * A new run id, a version-4 UUID (the server keys a run's pay by it). Built from `getRandomValues`, which every
 * page has (`randomUUID` exists only on https and localhost, not on a review over the LAN).
 */
export function newRunId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
