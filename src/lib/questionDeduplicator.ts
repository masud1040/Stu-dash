/**
 * Question Deduplicator & Semantic Similarity Helper
 *
 * Prevents exact and semantically duplicate questions during interview sessions
 * and when adding new questions to the Question Bank.
 */

// Common question filler prefixes and phrases to strip before semantic comparison
const QUESTION_PREFIXES = [
  'can you explain',
  'could you explain',
  'please explain',
  'explain what',
  'explain how',
  'explain',
  'what is the difference between',
  'what is difference between',
  'what is',
  'what are',
  'how does',
  'how do you',
  'tell me about',
  'describe how',
  'describe',
  'can you tell me',
  'could you please introduce yourself and',
  'introduce yourself and',
  'doya kore',
  'apnar',
  'bolun',
  'ki',
];

// Common stop words to ignore during token comparison
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up', 'down',
  'you', 'your', 'we', 'our', 'they', 'their', 'it', 'its', 'this', 'that', 'these',
  'those', 'can', 'could', 'will', 'would', 'should', 'use', 'using', 'work', 'works',
]);

/**
 * Normalizes question text for comparison by removing punctuation and common question prefixes
 */
export function normalizeQuestion(text: string): string {
  if (!text) return '';
  let cleaned = text
    .toLowerCase()
    .replace(/[?,.!"'();:\-_/[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const prefix of QUESTION_PREFIXES) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  return cleaned;
}

/**
 * Extracts significant tokens from a question
 */
export function extractKeywords(text: string): Set<string> {
  const normalized = normalizeQuestion(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Calculates Jaccard token similarity between two questions (0.0 to 1.0)
 */
export function calculateQuestionSimilarity(q1: string, q2: string): number {
  if (!q1 || !q2) return 0;

  const norm1 = normalizeQuestion(q1);
  const norm2 = normalizeQuestion(q2);

  // Exact normalized match
  if (norm1 === norm2) return 1.0;

  const tokens1 = extractKeywords(q1);
  const tokens2 = extractKeywords(q2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokens1, ...tokens2]).size;
  if (unionCount === 0) return 0;

  return intersectionCount / unionCount;
}

/**
 * Determines whether two questions are exact or semantically duplicate.
 * Threshold of 0.65+ overlap on significant keywords indicates semantic duplication.
 */
export function areQuestionsSemanticallyDuplicate(q1: string, q2: string, threshold = 0.65): boolean {
  if (!q1 || !q2) return false;
  if (q1.trim().toLowerCase() === q2.trim().toLowerCase()) return true;

  const norm1 = normalizeQuestion(q1);
  const norm2 = normalizeQuestion(q2);
  if (norm1 === norm2) return true;

  const similarity = calculateQuestionSimilarity(q1, q2);
  return similarity >= threshold;
}

/**
 * Filters out duplicate and semantically similar questions from a list,
 * preserving order and uniqueness.
 */
export function deduplicateQuestions<T extends { question: string }>(
  questions: T[],
  existingQuestions: { question: string }[] = []
): T[] {
  const result: T[] = [];
  const referenceList: { question: string }[] = [...existingQuestions];

  for (const item of questions) {
    const isDup = referenceList.some((ref) =>
      areQuestionsSemanticallyDuplicate(item.question, ref.question)
    );

    if (!isDup) {
      result.push(item);
      referenceList.push(item);
    }
  }

  return result;
}
