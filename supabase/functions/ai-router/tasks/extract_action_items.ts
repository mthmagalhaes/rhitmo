// Task: extract_action_items
// Extrai ações pendentes / decisões de uma transcrição ou nota.
// Input: { text: string }
// Output: { items: Array<{ title: string, owner?: string, deadline?: string }> }

import { aiToolCall } from "../../_shared/aiGateway.ts";

export interface ExtractInput {
  text: string;
}

export interface ActionItem {
  title: string;
  owner?: string;
  deadline?: string;
}

export async function extractActionItems(
  input: ExtractInput
): Promise<{ items: ActionItem[] }> {
  if (!input?.text || typeof input.text !== "string") {
    throw new Error("input.text is required");
  }

  const result = await aiToolCall<{ items: ActionItem[] }>({
    model: "google/gemini-2.5-flash",
    temperature: 0.1,
    max_tokens: 1500,
    toolName: "extract_actions",
    messages: [
      {
        role: "system",
        content:
          "Extraia APENAS ações pendentes ou decisões claras do texto. Não invente. Se não houver ações, retorne items: []. Owner e deadline são opcionais — preencha apenas se explicitamente mencionados.",
      },
      { role: "user", content: input.text.slice(0, 30_000) },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extract_actions",
          description: "Lista de ações pendentes",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Descrição curta da ação" },
                    owner: { type: "string", description: "Pessoa responsável (se mencionada)" },
                    deadline: { type: "string", description: "Prazo (se mencionado, formato livre)" },
                  },
                  required: ["title"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    ],
  });

  return result;
}
