// Task: classify_intent
// Classifica a intenção/tipo de uma mensagem em uma lista de categorias.
// Input: { text: string, categories: string[] }
// Output: { category: string, confidence: number }

import { aiToolCall } from "../../_shared/aiGateway.ts";

export interface ClassifyInput {
  text: string;
  categories: string[];
}

export async function classifyIntent(
  input: ClassifyInput
): Promise<{ category: string; confidence: number }> {
  if (!input?.text || !Array.isArray(input.categories) || input.categories.length < 2) {
    throw new Error("input.text and input.categories[2+] are required");
  }

  const result = await aiToolCall<{ category: string; confidence: number }>({
    model: "google/gemini-2.5-flash-lite",
    temperature: 0,
    max_tokens: 200,
    toolName: "classify",
    messages: [
      {
        role: "system",
        content:
          "You are a strict classifier. Pick the single best category for the input. Confidence is a 0-1 number reflecting how sure you are.",
      },
      {
        role: "user",
        content: `Categories: ${input.categories.join(", ")}\n\nText: ${input.text.slice(0, 8_000)}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "classify",
          description: "Return the chosen category and confidence",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", enum: input.categories },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["category", "confidence"],
            additionalProperties: false,
          },
        },
      },
    ],
  });

  return result;
}
