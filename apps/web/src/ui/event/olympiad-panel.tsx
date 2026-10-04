import { useEffect, useRef, useState } from 'react';
import {
  ExamSubmitResponse,
  OlympiadPracticeQuestion,
  OlympiadStatusResponse,
  type OlympiadExamQuestionPublic,
  type OlympiadTopicId,
  type OlympiadStatusResponse as StatusData,
} from '@miu/schema/olympiad';
import { z } from 'zod';
import { api } from '../api-client';
import { T, useT } from '../i18n/use-t';
import './olympiad.css';

interface OlympiadPanelProps {
  onClose: () => void;
  onCoinsUpdated?: (coins: number) => void;
}

type ViewMode = 'hub' | 'practice' | 'exam' | 'result' | 'review';

const PracticeResponseSchema = z.strictObject({
  topicId: z.string(),
  questions: z.array(OlympiadPracticeQuestion),
});

const ExamResponseSchema = z.strictObject({
  title: z.string(),
  examDate: z.string(),
  totalQuestions: z.literal(25),
  timeLimitMinutes: z.number(),
  questions: z.array(
    z.strictObject({
      id: z.string(),
      number: z.number(),
      topicId: z.string(),
      prompt: z.string(),
      visualType: z.string(),
      visualData: z.record(z.string(), z.unknown()).optional(),
      choices: z.array(z.strictObject({ id: z.string(), text: z.string() })),
    }),
  ),
});

export function OlympiadPanel({ onClose, onCoinsUpdated }: OlympiadPanelProps) {
  const { t } = useT();
  const [view, setView] = useState<ViewMode>('hub');
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Practice state
  const [practiceTopic, setPracticeTopic] = useState<OlympiadTopicId | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<OlympiadPracticeQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceSelected, setPracticeSelected] = useState<string | null>(null);
  const [practiceChecked, setPracticeChecked] = useState(false);
  const [practiceShowGuide, setPracticeShowGuide] = useState(false);
  const [practiceShowHint, setPracticeShowHint] = useState(false);

  // Exam state
  const [examQuestions, setExamQuestions] = useState<OlympiadExamQuestionPublic[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [examResult, setExamResult] = useState<ExamSubmitResponse | null>(null);

  // Load status on mount
  useEffect(() => {
    let active = true;
    api('GET', '/olympiad/status', OlympiadStatusResponse)
      .then((data) => {
        if (active) {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load olympiad status', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Submit mock exam
  const handleExamSubmit = async (answers: Record<string, string>, elapsedSec?: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const elapsed = elapsedSec ?? (3600 - timeRemaining);
      const res = await api('POST', '/olympiad/submit', ExamSubmitResponse, {
        answers,
        elapsedSeconds: Math.max(0, elapsed),
      });
      setExamResult(res);
      setView('result');
      // Refresh status for best record
      api('GET', '/olympiad/status', OlympiadStatusResponse)
        .then((s) => {
          setStatus(s);
          if (res.rewards.coin > 0 && onCoinsUpdated) {
            onCoinsUpdated(res.rewards.coin);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.error('Failed to submit exam', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Timer countdown for exam
  const examAnswersRef = useRef(examAnswers);
  const timeRemainingRef = useRef(timeRemaining);
  const handleExamSubmitRef = useRef(handleExamSubmit);

  useEffect(() => {
    examAnswersRef.current = examAnswers;
  }, [examAnswers]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  useEffect(() => {
    handleExamSubmitRef.current = handleExamSubmit;
  });

  useEffect(() => {
    if (view !== 'exam' || !timerEnabled) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time is up
          void handleExamSubmitRef.current(examAnswersRef.current, 3600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, timerEnabled]);

  // Start practice on a topic
  const startPractice = async (topicId: OlympiadTopicId) => {
    setLoading(true);
    try {
      const res = await api('GET', `/olympiad/practice/${topicId}`, PracticeResponseSchema);
      setPracticeTopic(topicId);
      setPracticeQuestions(res.questions);
      setPracticeIndex(0);
      setPracticeSelected(null);
      setPracticeChecked(false);
      setPracticeShowGuide(false);
      setPracticeShowHint(false);
      setView('practice');
    } catch (err) {
      console.error('Failed to load practice questions', err);
    } finally {
      setLoading(false);
    }
  };

  // Start mock exam
  const startExam = async () => {
    setLoading(true);
    try {
      const res = await api('GET', '/olympiad/exam', ExamResponseSchema);
      setExamQuestions(res.questions as OlympiadExamQuestionPublic[]);
      setExamIndex(0);
      setExamAnswers({});
      setTimeRemaining(3600);
      setView('exam');
    } catch (err) {
      console.error('Failed to load exam questions', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="olympiad-overlay" role="dialog" aria-modal="true" aria-label="Thử thách Olympic Toán">
      <div className="olympiad-panel">
        {/* HEADER */}
        <header className="olympiad-header">
          <div className="olympiad-header-left">
            <button
              type="button"
              className="olympiad-back-btn"
              onClick={() => {
                if (view === 'practice' || view === 'exam' || view === 'result') {
                  setView('hub');
                } else if (view === 'review') {
                  setView('result');
                } else {
                  onClose();
                }
              }}
              aria-label={t('common.back')}
            >
              ←
            </button>
            <h2 className="olympiad-title">
              {view === 'hub' && (status?.title ?? 'Thử thách Olympic Toán')}
              {view === 'practice' && `Luyện tập: ${status?.topics.find((t) => t.id === practiceTopic)?.name ?? ''}`}
              {view === 'exam' && '🎯 Vòng loại (Thi thử 25 câu)'}
              {view === 'result' && '🏆 Kết quả thi thử'}
              {view === 'review' && '📋 Xem lại 25 câu hỏi'}
            </h2>
          </div>
          <div className="olympiad-chip">
            {view === 'exam' && timerEnabled ? (
              <span style={{ color: timeRemaining < 300 ? '#f87171' : '#fde68a' }}>⏱ {formatTimer(timeRemaining)}</span>
            ) : (
              <span>Vòng loại: 10/10/2026</span>
            )}
          </div>
        </header>

        {/* BODY */}
        <div className="olympiad-body">
          {loading && (
            <p role="status" style={{ textAlign: 'center', padding: '2rem' }}>
              <T k="common.loading" />
            </p>
          )}

          {/* VIEW: HUB */}
          {!loading && view === 'hub' && status && (
            <>
              <p className="olympiad-hub-intro">
                Cánh cổng bí ẩn có 5 phòng thử thách — mỗi phòng một chủ đề toán học. Hãy luyện tập thật kỹ trước khi bước vào phòng thi thử!
              </p>

              {/* 5 Topic Cards */}
              <div className="olympiad-hub-grid">
                {status.topics.map((tp) => (
                  <div key={tp.id} className="olympiad-topic-card">
                    <span className="olympiad-topic-icon">{tp.icon}</span>
                    <h3 className="olympiad-topic-name">{tp.name}</h3>
                    <p className="olympiad-topic-sub">{tp.subtopics}</p>
                    <button type="button" className="olympiad-topic-btn" onClick={() => void startPractice(tp.id)}>
                      Luyện tập ({status.practiceCountByTopic[tp.id] ?? 10} câu)
                    </button>
                  </div>
                ))}
              </div>

              {/* Mock Exam Card */}
              <div className="olympiad-exam-card">
                <div className="olympiad-exam-header">
                  <h3 className="olympiad-exam-title">🎯 Vòng loại (Thi thử)</h3>
                  {status.userBest.score !== null && (
                    <span className="olympiad-exam-badge">
                      Kỷ lục: {status.userBest.score}/100 · {status.userBest.awardTitle ?? 'Đã hoàn thành'}
                    </span>
                  )}
                </div>
                <p className="olympiad-exam-details">
                  25 câu trắc nghiệm · 60 phút · 5 chủ đề x 5 câu · Tối đa 100 điểm.
                </p>
                <button type="button" className="olympiad-exam-cta" onClick={() => void startExam()}>
                  Vào thi thử ➜
                </button>
              </div>
            </>
          )}

          {/* VIEW: PRACTICE */}
          {!loading && view === 'practice' && practiceQuestions.length > 0 && (
            (() => {
              const q = practiceQuestions[practiceIndex];
              if (!q) return null;
              const isCorrect = practiceChecked && practiceSelected === q.correctAnswer;

              return (
                <div className="olympiad-q-container">
                  {/* Progress dots */}
                  <div className="olympiad-q-nav">
                    {practiceQuestions.map((pq, idx) => (
                      <button
                        key={pq.id}
                        type="button"
                        className={`olympiad-q-dot ${idx === practiceIndex ? 'olympiad-q-dot--current' : ''}`}
                        onClick={() => {
                          setPracticeIndex(idx);
                          setPracticeSelected(null);
                          setPracticeChecked(false);
                          setPracticeShowGuide(false);
                          setPracticeShowHint(false);
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Question Card */}
                  <div className="olympiad-q-card">
                    <p className="olympiad-q-prompt">
                      <b>Câu {practiceIndex + 1}:</b> {q.prompt}
                    </p>

                    {/* Choices */}
                    <div className="olympiad-choices">
                      {q.choices.map((c) => {
                        let btnClass = 'olympiad-choice-btn';
                        if (practiceSelected === c.id) {
                          btnClass += ' olympiad-choice-btn--selected';
                        }
                        if (practiceChecked) {
                          if (c.id === q.correctAnswer) {
                            btnClass += ' olympiad-choice-btn--correct';
                          } else if (practiceSelected === c.id) {
                            btnClass += ' olympiad-choice-btn--wrong';
                          }
                        }

                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={btnClass}
                            disabled={practiceChecked}
                            onClick={() => setPracticeSelected(c.id)}
                          >
                            <span className="olympiad-choice-letter">{c.id}</span>
                            <span>{c.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Bar */}
                    <div className="olympiad-action-bar">
                      <div className="olympiad-btn-row">
                        <button
                          type="button"
                          className="olympiad-tool-btn olympiad-tool-btn--blue"
                          onClick={() => setPracticeShowGuide((prev) => !prev)}
                        >
                          💡 Hướng dẫn
                        </button>
                        <button
                          type="button"
                          className="olympiad-tool-btn olympiad-tool-btn--purple"
                          onClick={() => setPracticeShowHint((prev) => !prev)}
                        >
                          💜 Gợi ý
                        </button>
                      </div>

                      {!practiceChecked ? (
                        <button
                          type="button"
                          className="olympiad-tool-btn olympiad-tool-btn--green"
                          disabled={!practiceSelected}
                          onClick={() => setPracticeChecked(true)}
                        >
                          ✔ Kiểm tra
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="olympiad-tool-btn olympiad-tool-btn--rose"
                          onClick={() => {
                            if (practiceIndex < practiceQuestions.length - 1) {
                              setPracticeIndex((i) => i + 1);
                              setPracticeSelected(null);
                              setPracticeChecked(false);
                              setPracticeShowGuide(false);
                              setPracticeShowHint(false);
                            } else {
                              setView('hub');
                            }
                          }}
                        >
                          {practiceIndex < practiceQuestions.length - 1 ? 'Câu tiếp theo ➜' : 'Hoàn thành chủ đề 🏆'}
                        </button>
                      )}
                    </div>

                    {/* Guide Box */}
                    {practiceShowGuide && (
                      <div className="olympiad-dialog-box" style={{ background: '#e0f2fe', borderColor: '#0284c7', color: '#0369a1' }}>
                        <b>💡 Hướng dẫn phương pháp giải:</b>
                        <p style={{ margin: '0.25rem 0 0' }}>{q.guide}</p>
                      </div>
                    )}

                    {/* Hint Box */}
                    {practiceShowHint && (
                      <div className="olympiad-dialog-box" style={{ background: '#f5f3ff', borderColor: '#8b5cf6', color: '#5b21b6' }}>
                        <b>💜 Gợi ý tư duy:</b>
                        <p style={{ margin: '0.25rem 0 0' }}>{q.hint}</p>
                      </div>
                    )}

                    {/* Feedback & Explanation */}
                    {practiceChecked && (
                      <div
                        className="olympiad-dialog-box"
                        style={{
                          background: isCorrect ? '#ecfdf5' : '#fff1f2',
                          borderColor: isCorrect ? '#10b981' : '#f43f5e',
                          color: isCorrect ? '#065f46' : '#9f1239',
                        }}
                      >
                        <b>{isCorrect ? '🎉 Hoan hô! Bé trả lời rất chính xác!' : 'Chưa chính xác rồi, bé xem lời giải nhé:'}</b>
                        <p style={{ margin: '0.25rem 0 0' }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* VIEW: EXAM */}
          {!loading && view === 'exam' && examQuestions.length > 0 && (
            (() => {
              const q = examQuestions[examIndex];
              if (!q) return null;
              const selectedAnswer = examAnswers[q.id];
              const answeredCount = Object.keys(examAnswers).length;

              return (
                <div className="olympiad-q-container">
                  {/* Question dots 1..25 */}
                  <div className="olympiad-q-nav">
                    {examQuestions.map((eq, idx) => {
                      const isAns = !!examAnswers[eq.id];
                      let cls = 'olympiad-q-dot';
                      if (idx === examIndex) cls += ' olympiad-q-dot--current';
                      else if (isAns) cls += ' olympiad-q-dot--answered';
                      return (
                        <button key={eq.id} type="button" className={cls} onClick={() => setExamIndex(idx)}>
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Card */}
                  <div className="olympiad-q-card">
                    <p className="olympiad-q-prompt">
                      <b>Câu {q.number}/25:</b> {q.prompt}
                    </p>

                    <div className="olympiad-choices">
                      {q.choices.map((c) => {
                        const isSelected = selectedAnswer === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`olympiad-choice-btn ${isSelected ? 'olympiad-choice-btn--selected' : ''}`}
                            onClick={() => {
                              setExamAnswers((prev) => ({ ...prev, [q.id]: c.id }));
                            }}
                          >
                            <span className="olympiad-choice-letter">{c.id}</span>
                            <span>{c.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="olympiad-action-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={timerEnabled}
                            onChange={(e) => setTimerEnabled(e.target.checked)}
                          />
                          Đồng hồ 60 phút
                        </label>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          Đã làm: {answeredCount}/25 câu
                        </span>
                      </div>

                      <div className="olympiad-btn-row">
                        {examIndex > 0 && (
                          <button
                            type="button"
                            className="olympiad-tool-btn olympiad-tool-btn--blue"
                            onClick={() => setExamIndex((i) => i - 1)}
                          >
                            ← Câu trước
                          </button>
                        )}
                        {examIndex < 24 ? (
                          <button
                            type="button"
                            className="olympiad-tool-btn olympiad-tool-btn--blue"
                            onClick={() => setExamIndex((i) => i + 1)}
                          >
                            Câu tiếp ➜
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="olympiad-tool-btn olympiad-tool-btn--rose"
                          disabled={submitting}
                          onClick={() => {
                            if (window.confirm('Bé có muốn nộp bài thi thử để chấm điểm ngay không?')) {
                              void handleExamSubmit(examAnswers);
                            }
                          }}
                        >
                          {submitting ? 'Đang chấm điểm...' : 'Nộp bài 🏁'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* VIEW: RESULT (mock 46) */}
          {!loading && view === 'result' && examResult && (
            <div className="olympiad-result-grid">
              {/* Left Column: Breakdown */}
              <div className="olympiad-breakdown-card">
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>Điểm theo 5 chủ đề</h3>
                {Object.values(examResult.breakdown).map((b) => (
                  <div key={b.topicId} className="olympiad-bar-row">
                    <div className="olympiad-bar-header">
                      <span>{b.topicName}</span>
                      <span>
                        {b.correct}/{b.total} ({b.score}/20 điểm)
                      </span>
                    </div>
                    <div className="olympiad-progress-bar">
                      <div className="olympiad-progress-fill" style={{ width: `${(b.correct / b.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '0.5rem', fontWeight: 800, fontSize: '0.9375rem', color: '#64748b' }}>
                  ⏱ Thời gian làm bài: {Math.floor(examResult.elapsedSeconds / 60)} phút {examResult.elapsedSeconds % 60} giây
                </div>
              </div>

              {/* Right Column: Total Score & Award */}
              <div className="olympiad-score-box">
                <div style={{ fontWeight: 800, color: '#7a6a55' }}>Tổng điểm bài thi</div>
                <div className="olympiad-score-big">
                  {examResult.score}
                  <small style={{ fontSize: '1.5rem', color: '#7a6a55' }}> / 100</small>
                </div>
                <div className="olympiad-award-badge">
                  {examResult.award === 'gold' && '🥇 Giải Vàng (Gold Award)'}
                  {examResult.award === 'silver' && '🥈 Giải Bạc (Silver Award)'}
                  {examResult.award === 'bronze' && '🥉 Giải Đồng (Bronze Award)'}
                  {examResult.award === 'consolation' && '🎖 Giải Khuyến khích'}
                  {!examResult.award && 'Cố gắng ở lượt thi tới nhé!'}
                </div>

                <div className="olympiad-tiers-row">
                  <div className={`olympiad-tier-item ${examResult.award === 'gold' ? 'olympiad-tier-item--active' : ''}`}>
                    <div style={{ fontSize: '1.5rem' }}>🥇</div>
                    <b>Vàng</b>
                    <div>≥ 80 đ</div>
                  </div>
                  <div className={`olympiad-tier-item ${examResult.award === 'silver' ? 'olympiad-tier-item--active' : ''}`}>
                    <div style={{ fontSize: '1.5rem' }}>🥈</div>
                    <b>Bạc</b>
                    <div>≥ 60 đ</div>
                  </div>
                  <div className={`olympiad-tier-item ${examResult.award === 'bronze' ? 'olympiad-tier-item--active' : ''}`}>
                    <div style={{ fontSize: '1.5rem' }}>🥉</div>
                    <b>Đồng</b>
                    <div>≥ 40 đ</div>
                  </div>
                  <div className={`olympiad-tier-item ${examResult.award === 'consolation' ? 'olympiad-tier-item--active' : ''}`}>
                    <div style={{ fontSize: '1.5rem' }}>🎖</div>
                    <b>K.Khích</b>
                    <div>≥ 20 đ</div>
                  </div>
                </div>
              </div>

              {/* Rewards Banner */}
              <div className="olympiad-rewards-banner">
                🎁 Phần thưởng đạt được: ⭐ +{examResult.rewards.xp} XP &nbsp;·&nbsp; 🪙 +{examResult.rewards.coin} Xu
              </div>

              {/* Action buttons */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="olympiad-tool-btn olympiad-tool-btn--blue"
                  onClick={() => setView('review')}
                >
                  📋 Xem lại lời giải 25 câu hỏi
                </button>
                <button
                  type="button"
                  className="olympiad-tool-btn olympiad-tool-btn--rose"
                  onClick={() => setView('hub')}
                >
                  Luyện tập tiếp ➜
                </button>
              </div>
            </div>
          )}

          {/* VIEW: REVIEW */}
          {!loading && view === 'review' && examResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="olympiad-tool-btn olympiad-tool-btn--blue"
                  onClick={() => setView('result')}
                >
                  ← Quay lại kết quả
                </button>
                <span style={{ fontWeight: 800, color: '#fef08a' }}>
                  Đúng {examResult.correctCount}/25 câu · Tổng {examResult.score}/100 điểm
                </span>
              </div>

              {examResult.review.map((item) => (
                <div
                  key={item.id}
                  className="olympiad-q-card"
                  style={{
                    borderLeftWidth: '8px',
                    borderLeftColor: item.isCorrect ? '#10b981' : '#f43f5e',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem' }}>
                    Câu {item.number}: {item.prompt}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.5rem' }}>
                    {item.choices.map((c) => {
                      const isCorrectChoice = c.id === item.correctAnswer;
                      const isUserChoice = c.id === item.chosenAnswer;
                      let bg = '#f8fafc';
                      let border = '#cbd5e1';
                      if (isCorrectChoice) {
                        bg = '#dcfce7';
                        border = '#16a34a';
                      } else if (isUserChoice) {
                        bg = '#fee2e2';
                        border = '#dc2626';
                      }

                      return (
                        <div
                          key={c.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            background: bg,
                            border: `2px solid ${border}`,
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                          }}
                        >
                          <b>{c.id}.</b> {c.text}
                          {isUserChoice && <span style={{ marginLeft: '0.5rem' }}>👉 (Bé chọn)</span>}
                          {isCorrectChoice && <span style={{ marginLeft: '0.5rem' }}>✔</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '2px solid #93c5fd',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      color: '#1e3a8a',
                      fontSize: '0.9375rem',
                    }}
                  >
                    <b>💡 Lời giải chi tiết:</b> {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
