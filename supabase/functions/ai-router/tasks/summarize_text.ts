// Task: summarize_text
// Sumariza qualquer bloco de texto em até N frases.
// Input: { text: string, max_sentences?: number, language?: 'pt-BR'|'en' }
// Output: { summary: string }

import { aiChatText } from "../../_shared/aiGateway.ts";

export interface SummarizeInput {
  text: string;
  max_sentences?: number;
  language?: "pt-BR" | "en";
}

export async function summarizeText(input: SummarizeInput): Promise<{ summary: string }> {
  if (!input?.text || typeof input.text !== "string") {
    throw new Error("input.text is required");
  }
  const maxSentences = Math.max(1, Math.min(10, input.max_sentences ?? 3));
  const lang = input.language ?? "pt-BR";

  const summary = await aiChatText({
    model: "google/gemini-2.5-flash-lite",
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          lang === "pt-BR"
            ? `Você é um sumarizador objetivo. Resuma o texto fornecido em no máximo ${maxSentences} frase(s) curtas, em português do Brasil. Sem floreios. Sem opiniões.`
            : `You are an objective summarizer. Summarize the provided text in at most ${maxSentences} short sentence(s). No fluff. No opinions.`,
      },
      { role: "user", content: input.text.slice(0, 30_000) },
    ],
  });

  return { summary: summary.trim() };
}
