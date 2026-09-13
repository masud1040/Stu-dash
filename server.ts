import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { registerMockInterviewRoutes } from "./server/mockInterviewRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function generateFallbackReport(
  userName: string,
  todaySessions: any[],
  totalTodayMinutes: number,
  todaySubjectsSummary: string,
  completedTasksCount: number,
  habitsCompletedCount: number,
  notice?: string
) {
  const hours = (totalTodayMinutes / 60).toFixed(1);
  return {
    headline: totalTodayMinutes > 0 
      ? `Solid Dedication Today: ${hours} Hours Logged!` 
      : `Ready to Build Momentum, ${userName}!`,
    moodBadge: totalTodayMinutes >= 120 ? "Deep Focus Master" : totalTodayMinutes > 0 ? "Steady Learner" : "Ready to Recharge",
    summary: totalTodayMinutes > 0
      ? `Great job putting in the effort today, ${userName}! You've invested ${hours} hours across your study sessions. Every minute of dedicated learning compounds into significant academic mastery.`
      : `You haven't logged a study session yet today, ${userName}. Even a 15-minute focused session before the day ends can keep your consistency streak glowing!`,
    highlights: [
      totalTodayMinutes > 0 ? `Completed ${todaySessions.length} focused study session(s) today.` : "No study sessions recorded for today yet.",
      todaySubjectsSummary ? `Subjects covered: ${todaySubjectsSummary}` : "Pick a priority subject to start with tomorrow.",
      `Completed ${completedTasksCount} todo task(s) and tracked habits.`
    ],
    tomorrowTip: "Set up your study environment tonight and choose your #1 highest-priority topic before going to bed.",
    statPills: [
      { label: "Today's Study Time", value: `${hours} hrs` },
      { label: "Today's Sessions", value: `${todaySessions.length}` },
      { label: "Tasks Completed", value: `${completedTasksCount}` }
    ],
    ...(notice ? { notice } : {})
  };
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock Interview AI Routes
  registerMockInterviewRoutes(app, getGeminiClient);

  app.post("/api/analytics/study-summary", async (req, res) => {
    try {
      const {
        sessions = [],
        subjects = [],
        userName = "Student",
        today = new Date().toISOString().split("T")[0],
        completedTasksCount = 0,
        habitsCompletedCount = 0,
      } = req.body;

      // Filter sessions for today and recent days
      const todaySessions = sessions.filter((s: any) => s.date === today);
      const totalTodayMinutes = todaySessions.reduce(
        (acc: number, s: any) => acc + (Number(s.duration) || 0),
        0
      );

      // Subject breakdown
      const subjectMap = new Map<string, string>();
      subjects.forEach((sub: any) => {
        if (sub.id) subjectMap.set(sub.id, sub.name || "General Study");
      });

      const subjectMinutes: { [name: string]: number } = {};
      todaySessions.forEach((s: any) => {
        const name = subjectMap.get(s.subjectId) || "General Study";
        subjectMinutes[name] = (subjectMinutes[name] || 0) + (Number(s.duration) || 0);
      });

      const todaySubjectsSummary = Object.entries(subjectMinutes)
        .map(([name, mins]) => `${name}: ${(mins / 60).toFixed(1)} hrs (${mins} mins)`)
        .join(", ");

      // Check all sessions for broader context
      const totalLifetimeMinutes = sessions.reduce(
        (acc: number, s: any) => acc + (Number(s.duration) || 0),
        0
      );

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: true,
          source: "fallback",
          report: generateFallbackReport(
            userName,
            todaySessions,
            totalTodayMinutes,
            todaySubjectsSummary,
            completedTasksCount,
            habitsCompletedCount
          )
        });
      }

      const ai = getGeminiClient();

      const promptContext = `
Student Name: ${userName}
Date: ${today}
Today's Total Study Minutes: ${totalTodayMinutes} minutes (${(totalTodayMinutes / 60).toFixed(1)} hours)
Today's Study Sessions Count: ${todaySessions.length}
Today's Subject Breakdown: ${todaySubjectsSummary || "None logged yet today"}
Completed Tasks: ${completedTasksCount}
Completed Habits: ${habitsCompletedCount}
All-Time Logged Study Hours: ${(totalLifetimeMinutes / 60).toFixed(1)} hours across ${sessions.length} total sessions.

Please analyze this study data and craft a brief, deeply encouraging end-of-day summary report. 
Tone: Friendly, motivating, empowering, and genuine (like a supportive academic mentor).
Include:
1. headline: A catchy, positive title acknowledging today's study progress.
2. moodBadge: A short 2-3 word positive badge (e.g. "Laser Focused", "Consistent Champion", "Steady Growth").
3. summary: 2-3 sentences praising their efforts, acknowledging their subjects, and reinforcing positive study habits.
4. highlights: 2-3 concise bullet points summarizing what was accomplished today.
5. tomorrowTip: 1 actionable, practical, motivating tip for tomorrow's study session.
6. statPills: 3 key metric pills (label and value), e.g. Study Time, Primary Focus, Momentum.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING, description: "A brief, encouraging headline" },
          moodBadge: { type: Type.STRING, description: "Short 2-3 word positive badge" },
          summary: { type: Type.STRING, description: "2-3 sentences of warm encouragement and analysis" },
          highlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-3 key highlights from today's study work"
          },
          tomorrowTip: { type: Type.STRING, description: "One practical tip for tomorrow" },
          statPills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING }
              },
              required: ["label", "value"]
            },
            description: "3 key metrics"
          }
        },
        required: ["headline", "moodBadge", "summary", "highlights", "tomorrowTip", "statPills"]
      };

      // Candidate models: prioritize high-availability fast model
      const CANDIDATE_MODELS = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
      ];

      let parsedReport: any = null;
      let usedModel: string | null = null;
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptContext,
            config: {
              systemInstruction:
                "You are an encouraging and insightful academic coach on StudyDash. Analyze the student's study data and produce an uplifting, concise end-of-day summary report. Never be discouraging or clinical; celebrate progress of any size and inspire positive consistency.",
              responseMimeType: "application/json",
              responseSchema
            }
          });

          if (response.text) {
            parsedReport = JSON.parse(response.text.trim());
            usedModel = modelName;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const cleanMsg = extractCleanErrorMessage(err);
          console.warn(`Model ${modelName} encountered issue: ${cleanMsg}. Trying fallback model...`);
        }
      }

      if (parsedReport) {
        return res.json({
          success: true,
          source: "gemini",
          model: usedModel,
          report: parsedReport
        });
      }

      // If all AI models are temporarily in high demand or unreachable, gracefully return data-derived report
      console.warn("All Gemini models encountered high demand; providing intelligent fallback:", extractCleanErrorMessage(lastError));
      const fallbackReport = generateFallbackReport(
        userName,
        todaySessions,
        totalTodayMinutes,
        todaySubjectsSummary,
        completedTasksCount,
        habitsCompletedCount,
        "AI model experienced temporary high demand; synthesized from your active study metrics."
      );

      return res.json({
        success: true,
        source: "fallback",
        report: fallbackReport,
        warning: extractCleanErrorMessage(lastError)
      });
    } catch (err: any) {
      console.error("Gemini summary endpoint error:", err);
      return res.status(500).json({
        success: false,
        error: extractCleanErrorMessage(err) || "Failed to generate study summary."
      });
    }
  });

  // Vite middleware in dev; static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
