import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { model, taskTools, systemPrompt } from "@/lib/ai/task-agent";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: taskTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
