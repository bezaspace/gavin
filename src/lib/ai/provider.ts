import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const provider = createOpenAICompatible({
  name: "custom-provider",
  baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export const model = provider(process.env.OPENAI_MODEL ?? "gpt-4o");
