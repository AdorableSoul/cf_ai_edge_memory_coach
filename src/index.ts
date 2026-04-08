import { AIChatAgent } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, tool } from "ai";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type Reminder = {
  id: string;
  topic: string;
  dueAt: string;
};

type CoachState = {
  notes: Note[];
  reminders: Reminder[];
  mood: string;
};

type Env = {
  AI: Ai;
  ASSETS: Fetcher;
  MemoryCoachAgent: DurableObjectNamespace;
};

export class MemoryCoachAgent extends AIChatAgent<Env, CoachState> {
  initialState: CoachState = {
    notes: [],
    reminders: [],
    mood: "focused"
  };

  maxPersistedMessages = 200;

  async onChatMessage() {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: [
        "You are Edge Memory Coach, a concise AI study and productivity partner.",
        "Use tools whenever the user asks to save memory, recall notes, update mood, or set a reminder.",
        "Keep responses practical, short, and helpful.",
        "When you use saved notes, mention that the answer came from the user's saved memory."
      ].join(" "),
      messages: await convertToModelMessages(this.messages),
      tools: {
        save_note: tool({
          description: "Save an important note or fact for the user.",
          inputSchema: z.object({
            title: z.string().min(1),
            content: z.string().min(1)
          }),
          execute: async ({ title, content }) => {
            const note: Note = {
              id: crypto.randomUUID(),
              title,
              content,
              createdAt: new Date().toISOString()
            };

            const nextNotes = [note, ...this.state.notes].slice(0, 25);
            this.setState({ ...this.state, notes: nextNotes });
            return { ok: true, note };
          }
        }),

        list_notes: tool({
          description: "List saved notes from memory.",
          inputSchema: z.object({}),
          execute: async () => {
            return {
              count: this.state.notes.length,
              notes: this.state.notes
            };
          }
        }),

        set_mood: tool({
          description: "Update the assistant tone or user working mode, such as focused, calm, or urgent.",
          inputSchema: z.object({ mood: z.string().min(1) }),
          execute: async ({ mood }) => {
            this.setState({ ...this.state, mood });
            return { ok: true, mood };
          }
        }),

        schedule_reminder: tool({
          description: "Schedule a reminder in N minutes for the current user session.",
          inputSchema: z.object({
            topic: z.string().min(1),
            minutesFromNow: z.number().int().min(1).max(1440)
          }),
          execute: async ({ topic, minutesFromNow }) => {
            const due = new Date(Date.now() + minutesFromNow * 60_000);
            const reminder: Reminder = {
              id: crypto.randomUUID(),
              topic,
              dueAt: due.toISOString()
            };

            this.setState({
              ...this.state,
              reminders: [...this.state.reminders, reminder]
            });

            await this.schedule(minutesFromNow * 60, "deliverReminder", reminder, {
              retry: { maxAttempts: 2, baseDelayMs: 500, maxDelayMs: 3_000 }
            });

            return {
              ok: true,
              reminder
            };
          }
        })
      }
    });

    return result.toUIMessageStreamResponse();
  }

  async deliverReminder(reminder: Reminder) {
    const remaining = this.state.reminders.filter((item) => item.id !== reminder.id);

    this.setState({ ...this.state, reminders: remaining });

    // Store a system message in the chat history so the reminder appears next time
    this.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Reminder: ${reminder.topic} (scheduled for ${new Date(reminder.dueAt).toLocaleString()}).`
        }
      ]
    } as never);

    await this.saveMessages();
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const agentResponse = await routeAgentRequest(request, env, {
      cors: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      locationHint: "enam"
    });

    if (agentResponse) {
      return agentResponse;
    }

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, app: "cf_ai_edge_memory_coach" });
    }

    return env.ASSETS.fetch(request);
  }
};
