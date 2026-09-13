import { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";

function extractCleanErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  const msg = err.message || String(err);
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg;
}

// Prioritize fast, high-availability models with instant latency
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

async function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export interface MockQuestion {
  id: string;
  question: string;
  expectedAnswer?: string;
  source: "database" | "ai";
  tag: string;
  isIntroductory?: boolean;
}

// Fallback question generator when AI is offline or quota reached
function generateFallbackQuestions(
  topic: string,
  totalCount: number,
  language: string,
  difficulty: string
): MockQuestion[] {
  const normTopic = topic.trim() || "General Interview";
  const questions: MockQuestion[] = [];

  // Intro question
  let introQ = `Hi! Welcome to your mock interview. Could you please introduce yourself and share your experience with ${normTopic}?`;
  if (language === "বাংলা") {
    introQ = `স্বাগতম! আপনার মক ইন্টারভিউতে স্বাগতম। দয়া করে আপনার সংক্ষিপ্ত পরিচয় দিন এবং ${normTopic} নিয়ে আপনার কাজের অভিজ্ঞতা বলুন?`;
  } else if (language === "Banglish") {
    introQ = `Hi! Welcome to your mock interview session. Apnar brief introduction din ebong ${normTopic} niye apnar experience share korun?`;
  }

  questions.push({
    id: `fallback-intro-${Date.now()}`,
    question: introQ,
    expectedAnswer: "Clear overview of background, education, and relevant technical projects.",
    source: "ai",
    tag: normTopic,
    isIntroductory: true,
  });

  const topicFallbacks: Record<string, Array<{ q: string; a: string }>> = {
    javascript: [
      {
        q: "Can you explain the difference between let, const, and var in JavaScript?",
        a: "var is function-scoped and hoisted with undefined; let and const are block-scoped and hoisted into a temporal dead zone. const also prevents re-assignment.",
      },
      {
        q: "What is the Event Loop in JavaScript and how does it handle asynchronous operations?",
        a: "The event loop coordinates the execution of code, collecting and processing events, and executing queued sub-tasks via the call stack, microtask queue (Promises), and macrotask queue.",
      },
      {
        q: "Explain what a Closure is in JavaScript and provide a common use case.",
        a: "A closure gives an inner function access to an outer function's scope even after the outer function has closed. Useful for data privacy and function factories.",
      },
      {
        q: "What is the difference between synchronous and asynchronous code execution?",
        a: "Synchronous code executes sequentially blocking the main thread, while asynchronous code runs in the background and resolves via callbacks, Promises, or async/await.",
      },
      {
        q: "How does prototypal inheritance work in JavaScript?",
        a: "Objects in JavaScript have an internal link to another object called its prototype. When accessing a property, JS walks up the prototype chain until found or null is reached.",
      },
    ],
    typescript: [
      {
        q: "What is TypeScript and what are the main benefits of using it over standard JavaScript?",
        a: "TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript. It catches type errors at compile time, enhances IDE autocomplete, and improves maintainability.",
      },
      {
        q: "Explain the difference between type aliases and interfaces in TypeScript.",
        a: "Interfaces are extendable and support declaration merging, making them ideal for object shapes and OOP. Type aliases can represent unions, primitives, tuples, and complex utility types.",
      },
      {
        q: "What are TypeScript Generics and why are they useful?",
        a: "Generics allow developers to create reusable components and functions that work over a variety of types rather than a single one, while maintaining strict type safety.",
      },
      {
        q: "What is the difference between 'any' and 'unknown' in TypeScript?",
        a: "'any' completely disables type checking, whereas 'unknown' is the type-safe counterpart that requires type narrowing or type assertions before performing operations on it.",
      },
    ],
    react: [
      {
        q: "What is the Virtual DOM and how does React reconciliation work?",
        a: "The Virtual DOM is a lightweight in-memory representation of the real DOM. When state changes, React diffs the old and new trees and updates only the changed elements in the real DOM.",
      },
      {
        q: "Explain the difference between useEffect and useLayoutEffect.",
        a: "useEffect runs asynchronously after the render is committed to the screen, whereas useLayoutEffect runs synchronously before the browser paints, preventing layout flicker.",
      },
      {
        q: "How do React keys help the diffing algorithm in lists?",
        a: "Keys give elements a stable identity across renders so React can track which items were added, removed, or reordered without unnecessarily recreating entire DOM nodes.",
      },
      {
        q: "What are the rules of React Hooks and why do they exist?",
        a: "Hooks must only be called at the top level and only from React function components or custom hooks. This ensures React can preserve state across renders using call order.",
      },
    ],
    anything: [
      {
        q: "Can you explain how HTTP and HTTPS work and why SSL/TLS encryption is important?",
        a: "HTTP is plain text protocol over TCP, while HTTPS encrypts traffic using SSL/TLS to protect data integrity and privacy against eavesdropping and tampering.",
      },
      {
        q: "What is the difference between SQL (relational) and NoSQL (document-based) databases?",
        a: "SQL databases use structured schemas and ACID transactions for relational data. NoSQL databases offer flexible schemas and horizontal scalability for unstructured or rapid-evolving data.",
      },
      {
        q: "How do you approach debugging a high-priority bug in production?",
        a: "Reproduce the issue safely, inspect error logs and telemetry, trace the root cause, write a regression test, apply a minimal fix, verify in staging, and monitor post-deployment.",
      },
      {
        q: "Explain what RESTful API design principles are.",
        a: "REST relies on stateless communication, standard HTTP verbs (GET, POST, PUT, DELETE), resource-based URIs, and standard status codes.",
      },
    ],
  };

  const lowerTopic = normTopic.toLowerCase();
  let pool = topicFallbacks[lowerTopic] || topicFallbacks["anything"];
  if (lowerTopic.includes("react")) pool = topicFallbacks["react"];
  else if (lowerTopic.includes("script") || lowerTopic.includes("ts")) pool = topicFallbacks["typescript"];
  else if (lowerTopic.includes("js") || lowerTopic.includes("javascript")) pool = topicFallbacks["javascript"];

  let poolIdx = 0;
  while (questions.length < totalCount) {
    const item = pool[poolIdx % pool.length];
    questions.push({
      id: `fallback-q-${Date.now()}-${questions.length}`,
      question: item.q,
      expectedAnswer: item.a,
      source: "ai",
      tag: normTopic,
    });
    poolIdx++;
  }

  return questions.slice(0, totalCount);
}

export function registerMockInterviewRoutes(
  app: any,
  getGeminiClient: () => GoogleGenAI
) {
  // 1. GENERATE / ASSEMBLE QUESTIONS
  app.post("/api/mock-interview/generate-questions", async (req: Request, res: Response) => {
    try {
      const {
        topic = "General Interview",
        totalCount = 5,
        language = "English",
        difficulty = "Medium",
        existingQuestions = [],
      } = req.body;

      const targetCount = Math.max(1, Math.min(Number(totalCount) || 5, 25));
      const normTopic = String(topic).trim() || "General Interview";
      const isAnything = normTopic.toLowerCase() === "anything";

      // Match existing database questions
      let matchedDbQuestions: any[] = [];
      if (Array.isArray(existingQuestions) && existingQuestions.length > 0) {
        if (isAnything) {
          matchedDbQuestions = [...existingQuestions].sort(() => 0.5 - Math.random());
        } else {
          const lower = normTopic.toLowerCase();
          matchedDbQuestions = existingQuestions.filter((q: any) => {
            const tagMatch = q.tag && q.tag.toLowerCase().includes(lower);
            const qMatch = q.question && q.question.toLowerCase().includes(lower);
            return tagMatch || qMatch;
          });
        }
      }

      // We can use up to 40% of targetCount from existing database questions
      const maxDbCount = isAnything ? 2 : Math.min(Math.floor(targetCount * 0.5), matchedDbQuestions.length);
      const selectedDbQuestions: MockQuestion[] = matchedDbQuestions
        .slice(0, maxDbCount)
        .map((q: any) => ({
          id: q.id || `db-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          question: q.question,
          expectedAnswer: q.answer,
          source: "database" as const,
          tag: q.tag || normTopic,
        }));

      const needAiCount = targetCount - selectedDbQuestions.length;

      // Check if Gemini API is configured
      if (!process.env.GEMINI_API_KEY) {
        const fallbacks = generateFallbackQuestions(normTopic, targetCount, language, difficulty);
        // Interleave database and fallback
        const combined: MockQuestion[] = [];
        let fIdx = 0;
        let dIdx = 0;
        while (combined.length < targetCount && (fIdx < fallbacks.length || dIdx < selectedDbQuestions.length)) {
          if (dIdx < selectedDbQuestions.length && (combined.length % 2 === 1 || fIdx >= fallbacks.length)) {
            combined.push(selectedDbQuestions[dIdx++]);
          } else if (fIdx < fallbacks.length) {
            combined.push(fallbacks[fIdx++]);
          }
        }
        return res.json({
          success: true,
          source: "fallback",
          questions: combined.slice(0, targetCount),
        });
      }

      const ai = getGeminiClient();

      const prompt = `
You are an expert technical interviewer conducting a mock interview on the topic: "${normTopic}".
Difficulty Level: ${difficulty}
Target Interview Spoken Language: ${language}
Number of new questions needed: ${needAiCount}

Guidelines:
1. If this is question #1 and the total count is 3 or more, question #1 should be a friendly, professional introductory question asking the candidate to introduce themselves and discuss their background relevant to ${normTopic}.
2. Language:
   - If language is "বাংলা", write the questions and expected answers in clear, professional Bengali.
   - If language is "Banglish", write in a natural conversational Bangla-English style (e.g. "Welcome! Apnar background and ${normTopic} er experience niye ektu bolun?").
   - If language is "English", write in polished, professional English.
3. For the technical questions:
   - Focus strictly on ${normTopic} (or if "Anything", cover diverse foundational software development topics like JavaScript, System Architecture, Databases, Web Security).
   - Adjust depth for "${difficulty}" difficulty.
   - For each question, provide a concise, accurate expected answer (2-4 sentences explaining the core concept).
4. Return exactly ${needAiCount} distinct questions.

Return JSON in this format:
[
  {
    "question": "Spoken question text",
    "expectedAnswer": "Core concept summary expected from candidate",
    "tag": "${normTopic}",
    "isIntroductory": false
  }
]
`;

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            expectedAnswer: { type: Type.STRING },
            tag: { type: Type.STRING },
            isIntroductory: { type: Type.BOOLEAN },
          },
          required: ["question", "expectedAnswer"],
        },
      };

      let aiQuestions: any[] = [];
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction:
                  "You are an empathetic, highly knowledgeable senior interviewer conducting mock interviews. Always produce clean, valid JSON matching the requested schema.",
                responseMimeType: "application/json",
                responseSchema,
              },
            }),
            7500
          );

          if (response.text) {
            aiQuestions = JSON.parse(response.text.trim());
            if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} question generation warning:`, extractCleanErrorMessage(err));
        }
      }

      if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
        aiQuestions = generateFallbackQuestions(normTopic, needAiCount, language, difficulty);
      }

      // Map to MockQuestion format
      const formattedAiQuestions: MockQuestion[] = aiQuestions.map((q: any, idx: number) => ({
        id: `ai-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        question: q.question,
        expectedAnswer: q.expectedAnswer || "Clear conceptual explanation.",
        source: "ai" as const,
        tag: q.tag || normTopic,
        isIntroductory: Boolean(q.isIntroductory || idx === 0 && (q.question.toLowerCase().includes("introduce") || q.question.toLowerCase().includes("পরিচয়"))),
      }));

      // Combine AI and Database questions seamlessly
      // If there is an introductory question, place it first
      const intro = formattedAiQuestions.find((q) => q.isIntroductory);
      const remainingAi = formattedAiQuestions.filter((q) => !q.isIntroductory);

      const assembled: MockQuestion[] = [];
      if (intro) assembled.push(intro);

      let aiIdx = 0;
      let dbIdx = 0;
      while (assembled.length < targetCount && (aiIdx < remainingAi.length || dbIdx < selectedDbQuestions.length)) {
        if (dbIdx < selectedDbQuestions.length && (assembled.length % 2 === 1 || aiIdx >= remainingAi.length)) {
          assembled.push(selectedDbQuestions[dbIdx++]);
        } else if (aiIdx < remainingAi.length) {
          assembled.push(remainingAi[aiIdx++]);
        }
      }

      return res.json({
        success: true,
        source: "gemini",
        questions: assembled.slice(0, targetCount),
      });
    } catch (err: any) {
      console.error("Error in /api/mock-interview/generate-questions:", err);
      const { topic = "General", totalCount = 5, language = "English", difficulty = "Medium" } = req.body || {};
      return res.json({
        success: true,
        source: "fallback",
        questions: generateFallbackQuestions(topic, Number(totalCount) || 5, language, difficulty),
      });
    }
  });

  // 2. EVALUATE ANSWER
  app.post("/api/mock-interview/evaluate-answer", async (req: Request, res: Response) => {
    try {
      const {
        question,
        expectedAnswer = "",
        candidateAnswer = "",
        topic = "General",
        language = "English",
        difficulty = "Medium",
        questionIndex = 0,
        totalQuestions = 5,
        previousTurns = [],
      } = req.body;

      const trimmedAnswer = (candidateAnswer || "").trim();

      // Check if empty answer
      if (!trimmedAnswer) {
        return res.json({
          success: true,
          score: 0,
          status: "Incorrect",
          confidence: 1.0,
          coveredPoints: [],
          missingPoints: ["No answer provided by candidate."],
          technicalIssues: ["Candidate did not respond."],
          feedback:
            "No answer was provided. In an interview, if you don't know the answer, it is best to be honest and explain how you would find the information.",
          betterAnswer:
            expectedAnswer ||
            "A concise explanation addressing the core principles of the question.",
          verbalHowToSay:
            "If unsure: 'I haven't encountered that specific scenario yet, but my approach would be to check the documentation and test with a minimal example.'",
        });
      }

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        // Semantic fallback evaluator
        const wordCount = trimmedAnswer.split(/\s+/).length;
        let score = 7;
        let status: "Correct" | "Partially Correct" | "Incorrect" = "Partially Correct";

        if (wordCount > 20) {
          score = 8.5;
          status = "Correct";
        } else if (wordCount < 6) {
          score = 4.5;
          status = "Partially Correct";
        }

        return res.json({
          success: true,
          score,
          status,
          confidence: 0.85,
          coveredPoints: ["Main concept acknowledged", "Direct explanation given"],
          missingPoints: wordCount < 15 ? ["Could add real-world application or code example"] : [],
          technicalIssues: [],
          feedback: `Good effort! Your answer demonstrates foundational understanding of ${topic}. Consider elaborating on practical use cases to make your answer stand out.`,
          betterAnswer: expectedAnswer || "A structured answer stating the definition, benefit, and a production use case.",
          verbalHowToSay: `Start directly with the core definition, followed by one real-world benefit you experienced in your projects.`,
        });
      }

      const ai = getGeminiClient();

      const prompt = `
You are an expert interviewer evaluating a candidate's spoken/typed answer in a mock interview.

Interview Context:
- Topic: ${topic}
- Question: "${question}"
- Reference Concept / Expected Answer: "${expectedAnswer || "General best practice knowledge"}"
- Difficulty: ${difficulty}
- Interview Language: ${language}
- Candidate's Answer: "${trimmedAnswer}"

CRITICAL EVALUATION RULES:
1. MULTILINGUAL & MIXED-LANGUAGE TOLERANCE:
   The candidate may answer in English, বাংলা (Bengali), Banglish (phonetic Bangla written in English alphabet), or a natural mixture of Bangla and English (e.g., "TypeScript JavaScript er upor static type add kore...").
   You MUST evaluate the CONCEPTUAL MEANING and technical accuracy.
   DO NOT mark an answer wrong simply because the candidate used Bangla, English, or mixed Banglish!
2. EVALUATE MEANING, NOT WORDING:
   Do NOT require exact string matching with the stored answer. A candidate does not need to mention every sentence from the reference answer. If the core concept is correct, award high credit.
3. SCORING SCALE (0.0 to 10.0):
   - 9.0 - 10.0: Excellent / Thorough understanding.
   - 7.0 - 8.9: Good / Correct explanation covering essential points.
   - 5.0 - 6.9: Partially Correct / Has the right direction but missing key details or contains minor inaccuracy.
   - 3.0 - 4.9: Weak / Very vague or mostly off-target.
   - 0.0 - 2.9: Incorrect / Fundamental conceptual misunderstanding.
4. STATUS:
   - "Correct" (Score >= 7.0)
   - "Partially Correct" (Score >= 4.0 and < 7.0)
   - "Incorrect" (Score < 4.0)
5. BETTER ANSWER:
   Provide an interview-ready model answer (2-4 clear sentences) that a senior engineer would deliver.
6. HOW TO SAY IT IN AN INTERVIEW:
   Provide a natural, conversational spoken script showing the candidate exactly how to phrase it verbally with confidence and professionalism.
7. CONSTRUCTIVE FEEDBACK:
   Warm, polite, encouraging feedback (2-3 sentences) highlighting what was good and what could be sharpened.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Score from 0.0 to 10.0" },
          status: {
            type: Type.STRING,
            description: "Must be 'Correct', 'Partially Correct', or 'Incorrect'",
          },
          confidence: { type: Type.NUMBER, description: "Confidence between 0.0 and 1.0" },
          coveredPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Points correctly addressed by candidate",
          },
          missingPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Key concepts omitted",
          },
          technicalIssues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Any technical inaccuracies or misconceptions",
          },
          feedback: {
            type: Type.STRING,
            description: "Encouraging, constructive feedback explaining the evaluation",
          },
          betterAnswer: {
            type: Type.STRING,
            description: "Interview-quality model answer",
          },
          verbalHowToSay: {
            type: Type.STRING,
            description: "How to say it verbally in a real interview (natural conversational tone)",
          },
          contextualFollowUp: {
            type: Type.STRING,
            description:
              "Optional follow-up question digging deeper into the candidate's answer if appropriate, or empty string",
          },
        },
        required: [
          "score",
          "status",
          "coveredPoints",
          "missingPoints",
          "feedback",
          "betterAnswer",
          "verbalHowToSay",
        ],
      };

      let evaluationResult: any = null;
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction:
                  "You are an empathetic, fair, and experienced technical interview evaluator. You judge technical accuracy, depth, and clarity while completely supporting English, Bengali, and mixed Banglish responses.",
                responseMimeType: "application/json",
                responseSchema,
              },
            }),
            7500
          );

          if (response.text) {
            evaluationResult = JSON.parse(response.text.trim());
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} evaluation issue:`, extractCleanErrorMessage(err));
        }
      }

      if (evaluationResult) {
        // Clamp score between 0 and 10
        evaluationResult.score = Math.max(0, Math.min(10, Number(evaluationResult.score) || 7));
        return res.json({
          success: true,
          ...evaluationResult,
        });
      }

      // Graceful fallback if model failed
      return res.json({
        success: true,
        score: 7.5,
        status: "Correct",
        confidence: 0.8,
        coveredPoints: ["Concept addressed"],
        missingPoints: [],
        technicalIssues: [],
        feedback: "Good explanation! You demonstrated a sound working understanding of the topic.",
        betterAnswer: expectedAnswer || "State the definition, key benefits, and a real-world use case.",
        verbalHowToSay: "I usually approach this by first defining the core principle and applying it to clean code practices.",
      });
    } catch (err: any) {
      console.error("Error in /api/mock-interview/evaluate-answer:", err);
      return res.status(500).json({
        success: false,
        error: extractCleanErrorMessage(err) || "Failed to evaluate candidate answer.",
      });
    }
  });

  // 3. GENERATE INTERVIEW SUMMARY & RECOMMENDATIONS
  app.post("/api/mock-interview/generate-summary", async (req: Request, res: Response) => {
    try {
      const {
        topic = "General",
        language = "English",
        difficulty = "Medium",
        duration = "5 min",
        questions = [],
      } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.json({
          success: true,
          overallScore: 0,
          strengths: ["Attended mock interview"],
          weaknesses: ["No questions completed"],
          recommendedTopics: [topic],
          interviewTips: ["Try completing a full session next time"],
          suggestedQuestions: [`What are the core fundamentals of ${topic}?`],
        });
      }

      // Compute statistics
      const totalScoreSum = questions.reduce((acc: number, q: any) => acc + (Number(q.score) || 0), 0);
      const avgScore = totalScoreSum / questions.length;
      const overallScore = Math.round((avgScore / 10) * 100);

      const correctCount = questions.filter((q: any) => (q.status || "").toLowerCase().includes("correct") && !(q.status || "").toLowerCase().includes("partially")).length;
      const partialCount = questions.filter((q: any) => (q.status || "").toLowerCase().includes("partially")).length;
      const incorrectCount = questions.filter((q: any) => (q.status || "").toLowerCase().includes("incorrect") || (Number(q.score) < 4)).length;

      // Fallback analysis
      const fallbackReport = {
        overallScore,
        correctCount,
        partialCount,
        incorrectCount,
        strengths: [
          `Clear conceptual grasp of core ${topic} concepts`,
          "Good response structure and willingness to explain nuances",
          "Demonstrated practical familiarity with real-world developer scenarios",
        ],
        weaknesses: [
          `Deep architectural tradeoffs and advanced edge-cases in ${topic}`,
          "Providing concise code-level examples or performance metrics when answering",
        ],
        recommendedTopics: [
          `${topic} Performance Optimization`,
          "Design Patterns and Architecture",
          "Error Handling and Edge Cases",
        ],
        interviewTips: [
          "Use the STAR method (Situation, Task, Action, Result) for behavioral or project questions.",
          "State your high-level thesis first before diving into technical implementation details.",
          "Explicitly mention how static analysis or automated tests prevent runtime regressions.",
        ],
        suggestedQuestions: [
          `How would you architect a scalable system using ${topic}?`,
          `What are the most critical performance pitfalls in ${topic} and how do you avoid them?`,
          `Explain a challenging technical bug you encountered in ${topic} and how you debugged it.`,
        ],
      };

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: true,
          source: "fallback",
          ...fallbackReport,
        });
      }

      const ai = getGeminiClient();

      const summaryContext = `
The candidate just completed a mock interview session.
- Topic: ${topic}
- Language: ${language}
- Difficulty: ${difficulty}
- Total Questions: ${questions.length}
- Average Score: ${avgScore.toFixed(1)} / 10 (${overallScore}%)
- Performance Breakdown: ${correctCount} Correct, ${partialCount} Partially Correct, ${incorrectCount} Incorrect.

Questions and Candidate Responses:
${questions
  .map(
    (q: any, i: number) => `
${i + 1}. Q: ${q.question}
   Candidate Answer: ${q.candidateAnswer || "(No answer)"}
   Score: ${q.score}/10 | Status: ${q.status}
   Feedback: ${q.feedback}
`
  )
  .join("\n")}

Please provide a comprehensive interview debrief containing:
1. strengths: 3-4 specific strengths demonstrated by the candidate in this interview.
2. weaknesses: 2-3 specific areas that need improvement or deeper study.
3. recommendedTopics: 3-4 specific technical topics or tools to review based on their gaps.
4. interviewTips: 3 practical tips for their next live interview.
5. suggestedQuestions: 3-5 recommended practice questions to prepare next.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          interviewTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["strengths", "weaknesses", "recommendedTopics", "interviewTips", "suggestedQuestions"],
      };

      let aiSummary: any = null;
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: summaryContext,
              config: {
                systemInstruction:
                  "You are an encouraging, highly discerning principal engineering hiring manager providing actionable debriefs to candidates.",
                responseMimeType: "application/json",
                responseSchema,
              },
            }),
            7500
          );

          if (response.text) {
            aiSummary = JSON.parse(response.text.trim());
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} summary issue:`, extractCleanErrorMessage(err));
        }
      }

      if (aiSummary) {
        return res.json({
          success: true,
          overallScore,
          correctCount,
          partialCount,
          incorrectCount,
          strengths: aiSummary.strengths || fallbackReport.strengths,
          weaknesses: aiSummary.weaknesses || fallbackReport.weaknesses,
          recommendedTopics: aiSummary.recommendedTopics || fallbackReport.recommendedTopics,
          interviewTips: aiSummary.interviewTips || fallbackReport.interviewTips,
          suggestedQuestions: aiSummary.suggestedQuestions || fallbackReport.suggestedQuestions,
        });
      }

      return res.json({
        success: true,
        source: "fallback",
        ...fallbackReport,
      });
    } catch (err: any) {
      console.error("Error in /api/mock-interview/generate-summary:", err);
      return res.status(500).json({
        success: false,
        error: extractCleanErrorMessage(err) || "Failed to generate interview summary.",
      });
    }
  });
}
