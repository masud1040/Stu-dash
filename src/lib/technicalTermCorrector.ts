/**
 * Technical Term Corrector for Speech-to-Text
 *
 * Intelligently corrects obvious speech-recognition mistakes when the intended
 * technical term is clear from context, without altering the candidate's core phrasing.
 * Preserves both raw and corrected transcripts.
 */

interface TermCorrectionRule {
  // Regex to detect the spoken artifact
  pattern: RegExp;
  // Proper canonical replacement
  replacement: string;
  // Optional required surrounding context keywords (if needed to ensure safety)
  contextKeywords?: string[];
}

// Rules for technical terminology correction
const TECHNICAL_RULES: TermCorrectionRule[] = [
  // Programming Languages & Frameworks
  { pattern: /\bjava\s+script\b/gi, replacement: 'JavaScript' },
  { pattern: /\btype\s+script\b/gi, replacement: 'TypeScript' },
  { pattern: /\breact\s+j\.?s\b/gi, replacement: 'React.js' },
  { pattern: /\bnode\s+j\.?s\b/gi, replacement: 'Node.js' },
  { pattern: /\bnext\s+j\.?s\b/gi, replacement: 'Next.js' },
  { pattern: /\bexpress\s+j\.?s\b/gi, replacement: 'Express.js' },
  { pattern: /\bvue\s+j\.?s\b/gi, replacement: 'Vue.js' },

  // React Hooks (require context or direct match)
  {
    pattern: /\b(?:you\s+state|use\s+state)\b/gi,
    replacement: 'useState',
    contextKeywords: ['react', 'hook', 'state', 'variable', 'set', 'component', 'value', 'manage', 'kori', 'er'],
  },
  {
    pattern: /\b(?:you\s+effect|use\s+effect)\b/gi,
    replacement: 'useEffect',
    contextKeywords: ['react', 'hook', 'lifecycle', 'render', 'side effect', 'mount', 'dependency', 'array', 'component', 'kori'],
  },
  {
    pattern: /\b(?:you\s+ref|use\s+ref)\b/gi,
    replacement: 'useRef',
    contextKeywords: ['react', 'hook', 'dom', 'reference', 'mutable', 'current', 'component', 'input'],
  },
  {
    pattern: /\b(?:you\s+memo|use\s+memo)\b/gi,
    replacement: 'useMemo',
    contextKeywords: ['react', 'hook', 'memoize', 'calculation', 'cache', 'expensive', 'render', 'performance'],
  },
  {
    pattern: /\b(?:you\s+callback|use\s+callback)\b/gi,
    replacement: 'useCallback',
    contextKeywords: ['react', 'hook', 'function', 'memoize', 'dependency', 're-render', 'pass'],
  },
  {
    pattern: /\b(?:you\s+context|use\s+context)\b/gi,
    replacement: 'useContext',
    contextKeywords: ['react', 'hook', 'context', 'provider', 'consumer', 'global', 'state', 'prop'],
  },
  {
    pattern: /\b(?:you\s+reducer|use\s+reducer)\b/gi,
    replacement: 'useReducer',
    contextKeywords: ['react', 'hook', 'action', 'dispatch', 'complex', 'state', 'redux'],
  },

  // Asynchronous & JavaScript concepts
  {
    pattern: /\b(?:a\s+sync|a\s+sink)\b/gi,
    replacement: 'async',
    contextKeywords: ['await', 'function', 'promise', 'javascript', 'code', 'thread', 'non-blocking', 'call'],
  },
  {
    pattern: /\ba\s+wait\b/gi,
    replacement: 'await',
    contextKeywords: ['async', 'promise', 'resolve', 'function', 'call', 'api'],
  },

  // Web & APIs
  { pattern: /\brest\s+api\b/gi, replacement: 'REST API' },
  { pattern: /\brestful\s+api\b/gi, replacement: 'RESTful API' },
  { pattern: /\bgraph\s+ql\b/gi, replacement: 'GraphQL' },
  { pattern: /\bpost\s*man\b/gi, replacement: 'Postman' },

  // Databases & Backend
  { pattern: /\bmongo\s*db\b/gi, replacement: 'MongoDB' },
  { pattern: /\bfire\s*base\b/gi, replacement: 'Firebase' },
  { pattern: /\bfire\s*store\b/gi, replacement: 'Firestore' },
  { pattern: /\b(?:post\s*gres|post\s*gres\s*q\s*l|postgres\s*ql)\b/gi, replacement: 'PostgreSQL' },
  { pattern: /\bno\s*sql\b/gi, replacement: 'NoSQL' },

  // Git & Collaboration
  { pattern: /\bgit\s*hub\b/gi, replacement: 'GitHub' },
  { pattern: /\bgit\s*lab\b/gi, replacement: 'GitLab' },

  // Standard Web Acronyms & Terms
  { pattern: /\bhtml\b/gi, replacement: 'HTML' },
  { pattern: /\bcss\b/gi, replacement: 'CSS' },
  { pattern: /\bjson\b/gi, replacement: 'JSON' },
  { pattern: /\bj\s*w\s*t\b/gi, replacement: 'JWT' },
  { pattern: /\bvirtual\s+dom\b/gi, replacement: 'Virtual DOM' },
  { pattern: /\b(?:o\s*o\s*p|oops)\s+(?:concept|principles|programming|paradigm|architecture)\b/gi, replacement: 'OOP $1' },
  { pattern: /\btailwind\s*css\b/gi, replacement: 'Tailwind CSS' },
  { pattern: /\bredux\s+toolkit\b/gi, replacement: 'Redux Toolkit' },
];

/**
 * Checks if the text surrounding an index contains any of the context keywords
 */
function hasContext(text: string, index: number, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) return true;

  // Window of 120 characters before and after
  const start = Math.max(0, index - 120);
  const end = Math.min(text.length, index + 120);
  const surrounding = text.substring(start, end).toLowerCase();

  return keywords.some((kw) => surrounding.includes(kw.toLowerCase()));
}

export interface TermCorrectionResult {
  raw: string;
  corrected: string;
  correctionsCount: number;
  appliedTerms: string[];
}

/**
 * Intelligently corrects technical terms in a transcript while preserving the
 * candidate's actual speech and meaning.
 */
export function correctTechnicalTerms(rawTranscript: string): TermCorrectionResult {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return { raw: '', corrected: '', correctionsCount: 0, appliedTerms: [] };
  }

  let corrected = rawTranscript;
  let correctionsCount = 0;
  const appliedTerms: string[] = [];

  for (const rule of TECHNICAL_RULES) {
    // Reset regex state
    rule.pattern.lastIndex = 0;

    corrected = corrected.replace(rule.pattern, (match, offset) => {
      // If context keywords are specified, verify surrounding context
      if (rule.contextKeywords && !hasContext(rawTranscript, offset, rule.contextKeywords)) {
        return match; // Keep original if no technical context found
      }

      if (match !== rule.replacement) {
        correctionsCount++;
        if (!appliedTerms.includes(rule.replacement)) {
          appliedTerms.push(rule.replacement);
        }
        return rule.replacement;
      }
      return match;
    });
  }

  return {
    raw: rawTranscript,
    corrected,
    correctionsCount,
    appliedTerms,
  };
}
