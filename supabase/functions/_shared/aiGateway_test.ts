// Onda 4.2 — Testes do AI Gateway helper
// Mock global fetch para validar 200, 429, 402 e 5xx sem precisar de rede.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  aiChat,
  aiChatText,
  RateLimitError,
  PaymentRequiredError,
  GatewayError,
} from "./aiGateway.ts";

// Garante que LOVABLE_API_KEY esteja set para o helper não throw em getApiKey
Deno.env.set("LOVABLE_API_KEY", Deno.env.get("LOVABLE_API_KEY") ?? "test-key");

const originalFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = async () => {
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("aiChat — 200 OK retorna conteúdo parseado", async () => {
  mockFetch(200, {
    choices: [{ message: { content: "olá mundo" } }],
  });
  try {
    const data = await aiChat({ messages: [{ role: "user", content: "oi" }] });
    assertEquals(data?.choices?.[0]?.message?.content, "olá mundo");
  } finally {
    restoreFetch();
  }
});

Deno.test("aiChatText — extrai content como string", async () => {
  mockFetch(200, { choices: [{ message: { content: "texto puro" } }] });
  try {
    const text = await aiChatText({ messages: [{ role: "user", content: "x" }] });
    assertEquals(text, "texto puro");
  } finally {
    restoreFetch();
  }
});

Deno.test("aiChat — 429 lança RateLimitError tipado", async () => {
  mockFetch(429, "rate limited");
  try {
    await assertRejects(
      () => aiChat({ messages: [{ role: "user", content: "x" }] }),
      RateLimitError,
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("aiChat — 402 lança PaymentRequiredError tipado", async () => {
  mockFetch(402, "no credits");
  try {
    await assertRejects(
      () => aiChat({ messages: [{ role: "user", content: "x" }] }),
      PaymentRequiredError,
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("aiChat — 500 lança GatewayError genérico", async () => {
  mockFetch(500, "boom");
  try {
    await assertRejects(
      () => aiChat({ messages: [{ role: "user", content: "x" }] }),
      GatewayError,
    );
  } finally {
    restoreFetch();
  }
});
