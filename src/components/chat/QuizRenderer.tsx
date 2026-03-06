import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Send, RotateCcw, Trophy, BookOpen } from 'lucide-react'
import type { QuizData } from '@/types/chat'
import { MarkdownRenderer } from './MarkdownRenderer'

interface QuizRendererProps {
  quiz: QuizData
  onSubmit: (answers: Record<number, number>) => void
}

export function QuizRenderer({ quiz, onSubmit }: QuizRendererProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [sentToAI, setSentToAI] = useState(false)

  const totalQuestions = quiz.questions.length
  const answeredCount = Object.keys(selectedAnswers).length
  const allAnswered = answeredCount === totalQuestions

  const correctCount = submitted
    ? quiz.questions.filter((q) => selectedAnswers[q.id] === q.correct).length
    : 0
  const scorePercent = submitted ? Math.round((correctCount / totalQuestions) * 100) : 0

  const handleSelect = useCallback(
    (questionId: number, optionIndex: number) => {
      if (submitted) return
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
    },
    [submitted],
  )

  const handleSubmit = useCallback(() => {
    if (!allAnswered) return
    setSubmitted(true)
  }, [allAnswered])

  const handleSendToAI = useCallback(() => {
    if (sentToAI) return
    setSentToAI(true)
    onSubmit(selectedAnswers)
  }, [sentToAI, selectedAnswers, onSubmit])

  const handleReset = useCallback(() => {
    setSelectedAnswers({})
    setSubmitted(false)
    setSentToAI(false)
  }, [])

  const getOptionStyle = (questionId: number, optionIndex: number) => {
    const isSelected = selectedAnswers[questionId] === optionIndex
    const question = quiz.questions.find((q) => q.id === questionId)!
    const isCorrect = optionIndex === question.correct

    if (!submitted) {
      return isSelected
        ? 'border-accent bg-accent/10 text-text-primary ring-1 ring-accent/30'
        : 'border-border-subtle bg-surface-1 text-text-secondary hover:border-accent/30 hover:bg-accent/5'
    }

    // After submission
    if (isCorrect) {
      return 'border-green-500 bg-green-500/10 text-green-400 ring-1 ring-green-500/30'
    }
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
    }
    return 'border-border-subtle/50 bg-surface-1/50 text-text-tertiary'
  }

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index) // A, B, C, D
  }

  return (
    <div className="quiz-container w-full max-w-2xl">
      {/* Quiz Header */}
      <div className="bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/20 rounded-2xl px-6 py-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={20} className="text-accent" />
          <h2 className="text-lg font-bold text-text-primary">{quiz.title}</h2>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{quiz.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
          <span>{totalQuestions} Questions</span>
          <span className="w-1 h-1 rounded-full bg-text-tertiary" />
          <span>MAT Style</span>
        </div>
      </div>

      {/* Progress Bar */}
      {!submitted && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-text-tertiary mb-1.5">
            <span>Progress</span>
            <span>{answeredCount}/{totalQuestions} answered</span>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Score Card (after submit) */}
      {submitted && (
        <div
          className={`rounded-2xl px-6 py-5 mb-5 border ${
            scorePercent >= 70
              ? 'bg-green-500/10 border-green-500/20'
              : scorePercent >= 40
                ? 'bg-yellow-500/10 border-yellow-500/20'
                : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy
                size={28}
                className={
                  scorePercent >= 70
                    ? 'text-green-400'
                    : scorePercent >= 40
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }
              />
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {correctCount}/{totalQuestions} Correct
                </p>
                <p className="text-sm text-text-secondary">
                  {scorePercent >= 70
                    ? "Brilliant work, Mohana! You're smashing it!"
                    : scorePercent >= 40
                      ? "Good effort, Mohana! Let's review and improve!"
                      : "Don't worry Mohana, every mistake is a lesson! Let's learn together."}
                </p>
              </div>
            </div>
            <span
              className={`text-3xl font-bold ${
                scorePercent >= 70
                  ? 'text-green-400'
                  : scorePercent >= 40
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {scorePercent}%
            </span>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6 divide-y divide-border-subtle/30 *:pt-6 first:*:pt-0">
        {quiz.questions.map((q, qIndex) => {
          const isAnsweredCorrectly = submitted && selectedAnswers[q.id] === q.correct
          const isAnsweredWrong = submitted && selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== q.correct

          return (
            <div
              key={q.id}
              className={`rounded-xl border px-5 py-4 transition-all duration-200 ${
                submitted
                  ? isAnsweredCorrectly
                    ? 'border-green-500/20 bg-green-500/5'
                    : isAnsweredWrong
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-border-subtle bg-surface-2'
                  : 'border-border-subtle bg-surface-2'
              }`}
            >
              {/* Question Header */}
              <div
                className={`flex items-start gap-3 mb-3 rounded-lg px-3 py-3 border-l-[3px] ${
                  submitted
                    ? isAnsweredCorrectly
                      ? 'bg-green-500/8 border-l-green-500'
                      : isAnsweredWrong
                        ? 'bg-red-500/8 border-l-red-500'
                        : 'bg-accent/5 border-l-accent/40'
                    : selectedAnswers[q.id] !== undefined
                      ? 'bg-accent/8 border-l-accent'
                      : 'bg-surface-3/50 border-l-purple-500/50'
                }`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    submitted
                      ? isAnsweredCorrectly
                        ? 'bg-green-500/20 text-green-400'
                        : isAnsweredWrong
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-accent/15 text-accent'
                      : selectedAnswers[q.id] !== undefined
                        ? 'bg-accent/20 text-accent'
                        : 'bg-purple-500/15 text-purple-400'
                  }`}
                >
                  {qIndex + 1}
                </span>
                <div className="text-sm text-text-primary leading-relaxed font-medium pt-0.5 quiz-math">
                  <MarkdownRenderer content={q.question} />
                </div>
                {submitted && (
                  <span className="shrink-0 ml-auto">
                    {isAnsweredCorrectly ? (
                      <CheckCircle2 size={20} className="text-green-400" />
                    ) : isAnsweredWrong ? (
                      <XCircle size={20} className="text-red-400" />
                    ) : null}
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 ml-10 mr-1">
                {q.options.map((option, optIndex) => (
                  <button
                    key={optIndex}
                    onClick={() => handleSelect(q.id, optIndex)}
                    disabled={submitted}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left text-sm transition-all duration-150 ${
                      submitted ? 'cursor-default' : 'cursor-pointer'
                    } ${getOptionStyle(q.id, optIndex)}`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${
                        submitted && optIndex === q.correct
                          ? 'border-green-500 bg-green-500 text-white'
                          : submitted && selectedAnswers[q.id] === optIndex && optIndex !== q.correct
                            ? 'border-red-500 bg-red-500 text-white'
                            : selectedAnswers[q.id] === optIndex
                              ? 'border-accent bg-accent text-white'
                              : 'border-current opacity-50'
                      }`}
                    >
                      {getOptionLabel(optIndex)}
                    </span>
                    <span className="leading-snug quiz-math"><MarkdownRenderer content={option} /></span>
                  </button>
                ))}
              </div>

              {/* Explanation (shown after submit for wrong answers) */}
              {submitted && isAnsweredWrong && (
                <div className="mt-3 ml-10 mr-1 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-semibold text-amber-400 mb-1">Explanation</p>
                  <div className="text-sm text-text-secondary leading-relaxed quiz-math"><MarkdownRenderer content={q.explanation} /></div>
                </div>
              )}

              {/* Also show explanation for correct answers but more subtly */}
              {submitted && isAnsweredCorrectly && (
                <div className="mt-3 ml-10 mr-1 px-4 py-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <p className="text-xs font-semibold text-green-400 mb-1">Well done!</p>
                  <div className="text-sm text-text-secondary/70 leading-relaxed quiz-math"><MarkdownRenderer content={q.explanation} /></div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-6">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              allAnswered
                ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20 cursor-pointer'
                : 'bg-surface-3 text-text-tertiary cursor-not-allowed'
            }`}
          >
            <Send size={15} />
            Submit Quiz
          </button>
        ) : (
          <>
            {!sentToAI && (
              <button
                onClick={handleSendToAI}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20 cursor-pointer transition-all duration-200"
              >
                <Send size={15} />
                Send to PrepBuddy for Review
              </button>
            )}
            {sentToAI && (
              <span className="text-sm text-green-400 font-medium">
                Sent! PrepBuddy is reviewing your answers...
              </span>
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-all duration-200 cursor-pointer"
            >
              <RotateCcw size={15} />
              Retake
            </button>
          </>
        )}

        {!submitted && !allAnswered && (
          <span className="text-xs text-text-tertiary">
            Answer all {totalQuestions} questions to submit
          </span>
        )}
      </div>
    </div>
  )
}
