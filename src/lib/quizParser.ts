import type { QuizData } from '@/types/chat'

/**
 * Extracts quiz JSON from a message using multiple detection strategies:
 * 1. Direct parse of the entire content as JSON (for pure JSON responses)
 * 2. ```quiz-json ... ``` fenced blocks
 * 3. ```json ... ``` fenced blocks containing quiz data
 * 4. ``` ... ``` generic fenced blocks containing quiz data
 * 5. Raw JSON with "type": "quiz" anywhere in the message (balanced brace extraction)
 * 6. Aggressive regex extraction as last resort
 */
export function parseQuizFromMessage(content: string): {
  quiz: QuizData | null
  beforeText: string
  afterText: string
} {
  const trimmed = content.trim()

  // Strategy 1: Try parsing the entire content as JSON directly
  // This is the most common case when the AI returns pure JSON as instructed
  if (trimmed.startsWith('{')) {
    const quiz = tryParseQuiz(trimmed)
    if (quiz) {
      return { quiz, beforeText: '', afterText: '' }
    }
  }

  // Strategy 2-4: Fenced code blocks
  const fencedPatterns = [
    /```quiz-json\s*\n?([\s\S]*?)\n?\s*```/,
    /```json\s*\n?([\s\S]*?)\n?\s*```/,
    /```\s*\n?([\s\S]*?)\n?\s*```/,
  ]

  for (const regex of fencedPatterns) {
    const match = content.match(regex)
    if (match) {
      const quiz = tryParseQuiz(match[1])
      if (quiz) {
        const beforeText = content.slice(0, match.index).trim()
        const afterText = content.slice(match.index! + match[0].length).trim()
        return { quiz, beforeText, afterText }
      }
    }
  }

  // Strategy 5: Raw JSON — look for { anywhere in content that contains quiz markers
  if (looksLikeQuizContent(content)) {
    // Try every { in the content, not just the first one
    let searchFrom = 0
    while (searchFrom < content.length) {
      const bracePos = content.indexOf('{', searchFrom)
      if (bracePos === -1) break

      const jsonStr = extractBalancedJson(content, bracePos)
      if (jsonStr) {
        const quiz = tryParseQuiz(jsonStr.text)
        if (quiz) {
          const beforeText = content.slice(0, jsonStr.start).trim()
          const afterText = content.slice(jsonStr.end).trim()
          return { quiz, beforeText, afterText }
        }
        // Skip past this balanced block and try the next one
        searchFrom = jsonStr.end
      } else {
        searchFrom = bracePos + 1
      }
    }
  }

  // Strategy 6: Regex-based fallback — extract quiz structure from broken JSON
  if (looksLikeQuizContent(content)) {
    const quiz = regexExtractQuiz(content)
    if (quiz) {
      return { quiz, beforeText: '', afterText: '' }
    }
  }

  return { quiz: null, beforeText: content, afterText: '' }
}

/** Check if content likely contains quiz data (loose check) */
function looksLikeQuizContent(content: string): boolean {
  const lower = content.toLowerCase()
  return (
    (lower.includes('"type"') || lower.includes("'type'")) &&
    (lower.includes('"quiz"') || lower.includes("'quiz'")) &&
    lower.includes('questions')
  )
}

function tryParseQuiz(jsonString: string): QuizData | null {
  const trimmed = jsonString.trim()

  // Attempt 1: Direct parse
  const direct = safeParseQuiz(trimmed)
  if (direct) return direct

  // Attempt 2: Repair common LLM JSON issues and retry
  const repaired = repairJson(trimmed)
  if (repaired !== trimmed) {
    const fromRepaired = safeParseQuiz(repaired)
    if (fromRepaired) return fromRepaired
  }

  return null
}

function safeParseQuiz(jsonString: string): QuizData | null {
  try {
    const parsed = JSON.parse(jsonString)
    if (parsed.type === 'quiz' && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed as QuizData
    }
  } catch {
    // Not valid JSON
  }
  return null
}

/**
 * Attempts to fix common JSON issues produced by LLMs:
 * - Trailing commas before ] or }
 * - Unescaped newlines/tabs inside strings
 * - Smart quotes → regular quotes
 * - Missing closing brackets (append them)
 */
function repairJson(input: string): string {
  let s = input

  // Replace smart/curly quotes with regular quotes
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([\]}])/g, '$1')

  // Fix unescaped control characters inside JSON strings
  // Walk through and escape any raw newlines/tabs inside strings
  s = fixControlCharsInStrings(s)

  // If braces/brackets are unbalanced, try to close them
  s = closeUnbalancedBrackets(s)

  return s
}

function fixControlCharsInStrings(input: string): string {
  const result: string[] = []
  let inString = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (escape) {
      result.push(ch)
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      result.push(ch)
      continue
    }

    if (ch === '"') {
      inString = !inString
      result.push(ch)
      continue
    }

    if (inString) {
      // Replace raw control characters with their escaped versions
      if (ch === '\n') { result.push('\\n'); continue }
      if (ch === '\r') { result.push('\\r'); continue }
      if (ch === '\t') { result.push('\\t'); continue }
    }

    result.push(ch)
  }

  return result.join('')
}

function closeUnbalancedBrackets(input: string): string {
  let braces = 0
  let brackets = 0
  let inString = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }

  let result = input
  while (brackets > 0) { result += ']'; brackets-- }
  while (braces > 0) { result += '}'; braces-- }

  return result
}

function extractBalancedJson(content: string, startSearch: number): { text: string; start: number; end: number } | null {
  // Find the first '{' at or after startSearch
  const start = content.indexOf('{', startSearch)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < content.length; i++) {
    const ch = content[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return { text: content.slice(start, i + 1), start, end: i + 1 }
      }
    }
  }

  return null
}

/**
 * Last-resort regex-based quiz extractor for when JSON is malformed.
 * Extracts title, description, and individual questions using patterns.
 */
function regexExtractQuiz(content: string): QuizData | null {
  try {
    // Extract title
    const titleMatch = content.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const title = titleMatch ? unescapeJsonString(titleMatch[1]) : 'Quiz'

    // Extract description
    const descMatch = content.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const description = descMatch ? unescapeJsonString(descMatch[1]) : ''

    // Extract individual question blocks using "id" as anchors
    const questions: QuizData['questions'] = []
    const idPattern = /"id"\s*:\s*(\d+)/g
    let idMatch: RegExpExecArray | null

    const idPositions: { id: number; pos: number }[] = []
    while ((idMatch = idPattern.exec(content)) !== null) {
      idPositions.push({ id: parseInt(idMatch[1]), pos: idMatch.index })
    }

    for (let i = 0; i < idPositions.length; i++) {
      const start = idPositions[i].pos
      const end = i + 1 < idPositions.length ? idPositions[i + 1].pos : content.length
      const block = content.slice(start, end)

      // Extract question text
      const qMatch = block.match(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (!qMatch) continue
      const questionText = unescapeJsonString(qMatch[1])

      // Extract options array — find "options" then grab strings
      const optionsMatch = block.match(/"options"\s*:\s*\[([^\]]*)\]/)
      if (!optionsMatch) continue
      const optStrings = optionsMatch[1].match(/"((?:[^"\\]|\\.)*)"/g)
      if (!optStrings || optStrings.length < 2) continue
      const options = optStrings.map((s) => unescapeJsonString(s.slice(1, -1)))

      // Extract correct answer index
      const correctMatch = block.match(/"correct"\s*:\s*(\d+)/)
      const correct = correctMatch ? parseInt(correctMatch[1]) : 0

      // Extract explanation
      const explMatch = block.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const explanation = explMatch ? unescapeJsonString(explMatch[1]) : ''

      questions.push({
        id: idPositions[i].id,
        question: questionText,
        options,
        correct,
        explanation,
      })
    }

    if (questions.length === 0) return null

    return { type: 'quiz', title, description, questions }
  } catch {
    return null
  }
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/**
 * Builds a formatted string of the user's quiz answers to send back to the AI for review.
 */
export function buildQuizSubmissionMessage(
  quiz: QuizData,
  selectedAnswers: Record<number, number>,
): string {
  const lines: string[] = [
    `I just completed the quiz: "${quiz.title}"`,
    `Here are my answers:\n`,
  ]

  for (const q of quiz.questions) {
    const selectedIdx = selectedAnswers[q.id]
    const selectedOption = selectedIdx !== undefined ? q.options[selectedIdx] : 'Not answered'
    const isCorrect = selectedIdx === q.correct
    lines.push(`Q${q.id}: ${q.question}`)
    lines.push(`My answer: ${selectedOption} ${isCorrect ? '(Correct)' : '(Wrong — correct answer: ' + q.options[q.correct] + ')'}`)
    lines.push('')
  }

  const correctCount = quiz.questions.filter((q) => selectedAnswers[q.id] === q.correct).length
  lines.push(`Score: ${correctCount}/${quiz.questions.length}`)
  lines.push('')
  lines.push('Please review my answers. For each question I got wrong: (1) explain exactly why my answer is incorrect, (2) show the correct step-by-step solution with any shortcut method if available, (3) explain the common trap or mistake pattern I fell into, and (4) give me a tip to avoid this mistake on the actual MAT exam. Also suggest which topics I should revise based on my weak areas.')

  return lines.join('\n')
}
