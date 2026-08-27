/**
 * Post-test questionnaire (playtest builds only).
 *
 * Five short questions asked *after* the test segment — never during Level 1,
 * never mid-puzzle. The design rules behind the wording:
 *
 * - No question names a feature approvingly or supplies its own answer. "Was
 *   the awesome Peek feature clear?" is exactly the shape being avoided: it
 *   asserts the feature is good, and it teaches the tester what Peek was
 *   supposed to do at the moment we are trying to find out whether they knew.
 * - Comprehension questions are free text, and this milestone deliberately does
 *   **not** grade them automatically (Goal 20). No model, no keyword matcher,
 *   no cloud call decides whether a tester "got" the rule. The cohort tool
 *   prints answers verbatim for a human to code.
 * - The one closed question ("would you play another puzzle") offers a genuine
 *   middle option, because a forced yes/no manufactures agreement. GOV.UK's
 *   guidance notes closed questions are easier to answer than open ones, so
 *   the closed one is kept for the single item where a count is useful
 *   (https://www.gov.uk/service-manual/design/designing-good-questions).
 * - Every question is skippable. A blank answer is data too, and pressure to
 *   answer is pressure to invent.
 *
 * Responses stay on the device until the tester chooses to share their bundle.
 */

export const QUESTIONNAIRE_VERSION = 1;
export const PLAYTEST_RESPONSES_STORAGE_KEY = "flipstitch.playtest.responses.v1";

export type QuestionId =
  | "ruleInOwnWords"
  | "peekUnderstanding"
  | "confusionMoment"
  | "wouldPlayAnother"
  | "freeComment";

export type QuestionKind = "text" | "choice";

export type QuestionDefinition = {
  id: QuestionId;
  kind: QuestionKind;
  prompt: string;
  /** Shown under the prompt. Never a hint about the "right" answer. */
  help?: string;
  choices?: readonly { value: string; label: string }[];
  optional: boolean;
};

/** Maximum characters stored per free-text answer. Keeps bundles small. */
export const MAX_ANSWER_LENGTH = 600;

export const QUESTIONS: readonly QuestionDefinition[] = [
  {
    id: "ruleInOwnWords",
    kind: "text",
    prompt: "In your own words, what is the main rule of this game?",
    help: "However you would explain it to someone else. There is no right answer here.",
    optional: true
  },
  {
    id: "peekUnderstanding",
    kind: "text",
    prompt: "If you used the Peek button, what did you think it did?",
    help: "If you did not use it, say so.",
    optional: true
  },
  {
    id: "confusionMoment",
    kind: "text",
    prompt: "Was there a moment when you did not know what to do? What was happening?",
    optional: true
  },
  {
    id: "wouldPlayAnother",
    kind: "choice",
    prompt: "Would you play another puzzle?",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" }
    ],
    optional: true
  },
  {
    id: "freeComment",
    kind: "text",
    prompt: "Anything else you want to say about the game?",
    optional: true
  }
];

export const WOULD_PLAY_VALUES = ["yes", "no", "unsure"] as const;
export type WouldPlayAnother = (typeof WOULD_PLAY_VALUES)[number];

export type QuestionnaireAnswers = Partial<Record<QuestionId, string>>;

export type QuestionnaireResponse = {
  version: typeof QUESTIONNAIRE_VERSION;
  respondedAt: number;
  answers: QuestionnaireAnswers;
};

/** Trims, bounds, and drops empty answers. Unknown ids are discarded. */
export function normalizeAnswers(input: Record<string, unknown>): QuestionnaireAnswers {
  const known = new Set(QUESTIONS.map((question) => question.id));
  const answers: QuestionnaireAnswers = {};
  for (const [key, value] of Object.entries(input)) {
    if (!known.has(key as QuestionId)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, MAX_ANSWER_LENGTH);
    if (trimmed.length === 0) continue;
    if (key === "wouldPlayAnother" && !(WOULD_PLAY_VALUES as readonly string[]).includes(trimmed)) continue;
    answers[key as QuestionId] = trimmed;
  }
  return answers;
}

export function makeQuestionnaireResponse(answers: Record<string, unknown>, respondedAt: number): QuestionnaireResponse {
  return { version: QUESTIONNAIRE_VERSION, respondedAt, answers: normalizeAnswers(answers) };
}

export function readQuestionnaireResponse(raw: string | null): QuestionnaireResponse | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== QUESTIONNAIRE_VERSION) return null;
    if (typeof record.answers !== "object" || record.answers === null) return null;
    return {
      version: QUESTIONNAIRE_VERSION,
      respondedAt:
        typeof record.respondedAt === "number" && Number.isFinite(record.respondedAt) ? record.respondedAt : 0,
      answers: normalizeAnswers(record.answers as Record<string, unknown>)
    };
  } catch {
    return null;
  }
}

/** True when the tester actually said something we can code. */
export function hasAnyAnswer(response: QuestionnaireResponse | null): boolean {
  return response !== null && Object.keys(response.answers).length > 0;
}
