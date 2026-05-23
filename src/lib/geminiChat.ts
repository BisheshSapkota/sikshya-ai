import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import {
  MAX_HISTORY_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MAX_USER_MESSAGE_CHARS,
  trimForHistory,
} from "./chatLimits";
import type { PendingAttachment } from "./fileUpload";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEN_MODEL_NAME =
  import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.0-flash";

export const SYSTEM_PROMPT = `
You are Sikshya AI — one friendly tutor for Nepali students (Class 8 BLE, Class 10 SEE, Class 12 NEB/+2). Any subject.

PERSONA: Warm 20-year-old university student in Kathmandu. Clear, never stiff.

LANGUAGE: Default English. If the student writes fully in Roman Nepali, reply in Roman Nepali.

FILES: When images or PDFs are attached, read them carefully first. Solve questions, explain diagrams, or grade written answers quickly and clearly.

EVALUATION (when grading an answer):
Score out of X: [score]
Strengths:
- [points]
Weaknesses:
- [points]
Model Answer:
[answer]

MATH: Use $...$ or $$...$$ LaTeX when needed.
Keep answers focused (roughly 150–400 words unless grading or file needs more detail).
`.trim();

export function buildSystemSuffix(userText: string): string {
  const nepali =
    /(?:sir|ko|garna|sod(h|)a|halnu|huncha|bhayo|chha|cha|padhnu|garidin)/i.test(
      userText
    );
  return nepali
    ? "\nUser uses Roman Nepali — mirror that."
    : "\nUser uses English — reply in English.";
}

function attachmentsToParts(files: PendingAttachment[]): Part[] {
  const parts: Part[] = [];
  for (const f of files) {
    if (f.textContent) {
      parts.push({
        text: `[Attached text file: ${f.name}]\n${f.textContent}`,
      });
      continue;
    }
    if (f.base64) {
      parts.push({
        inlineData: { mimeType: f.mimeType, data: f.base64 },
      });
    }
  }
  return parts;
}

export async function askGemini(params: {
  userText: string;
  attachments: PendingAttachment[];
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("MISSING_API_KEY");
  }

  const userText = params.userText.trim().slice(0, MAX_USER_MESSAGE_CHARS);
  const hasFiles = params.attachments.length > 0;
  if (!userText && !hasFiles) {
    throw new Error("EMPTY");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEN_MODEL_NAME,
    systemInstruction: SYSTEM_PROMPT + buildSystemSuffix(userText),
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const historyText = params.history
    .slice(-MAX_HISTORY_MESSAGES)
    .map(
      (m) =>
        `${m.role === "user" ? "Student" : "Sikshya"}: ${trimForHistory(m.content)}`
    )
    .join("\n\n");

  const parts: Part[] = [];

  if (historyText) {
    parts.push({ text: `Recent conversation:\n${historyText}\n\n---\n` });
  }

  parts.push(...attachmentsToParts(params.attachments));

  const prompt =
    userText ||
    (hasFiles
      ? "Analyze the attached file(s). Explain or solve what's shown. If it's an exam answer, grade it with Score/Strengths/Weaknesses/Model Answer."
      : "");

  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  return result.response.text() || "I couldn't generate a reply. Try again.";
}
