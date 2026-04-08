# cf_ai_edge_memory_coach

A Cloudflare AI app built for the Cloudflare internship assignment.

## What it does

**Edge Memory Coach** is an AI-powered chat application that runs on Cloudflare and includes all required assignment components:

- **LLM**: Llama 3.3 on Workers AI
- **Workflow / coordination**: Durable Object agent built with the Cloudflare Agents SDK
- **User input**: Chat interface served from the Worker
- **Memory / state**: Persistent chat history plus stateful notes, mood, and reminders inside the agent

## Features

- Chat with an AI assistant using Workers AI
- Save notes to persistent memory
- Recall saved notes later in the same agent session
- Set reminders that are scheduled and delivered by the agent
- Maintain state with Durable Objects and SQLite-backed persistence

## Project structure

```text
cf_ai_edge_memory_coach/
├── public/
│   └── index.html
├── src/
│   └── index.ts
├── package.json
├── PROMPTS.md
├── README.md
├── tsconfig.json
└── wrangler.jsonc
```

## Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Log in to Cloudflare

```bash
npx wrangler login
```

### 3) Generate runtime types (optional but recommended)

```bash
npm run cf-typegen
```

### 4) Start local development

```bash
npm run dev
```

Open the local URL printed by Wrangler.

## Deploy

```bash
npm run deploy
```

## How to test the required components

### Chat / user input
Open the homepage and send a message.

Example prompts:
- `Remember that my database exam is Friday at 2 PM.`
- `List my saved notes.`
- `Set my mood to focused.`
- `Remind me in 3 minutes to review Dijkstra's algorithm.`

### LLM
The agent uses **Workers AI** with **Llama 3.3**.

### Coordination / workflow
The app uses a **stateful Durable Object agent** to coordinate chat, note storage, and scheduled reminders.

### Memory / state
The app persists:
- Chat messages
- Saved notes
- Reminder metadata
- Current mood state

## Why this fits Cloudflare

This project is intentionally built around Cloudflare-native primitives:
- **Workers AI** for the model layer
- **Agents SDK** for stateful coordination
- **Durable Objects** for persistent session memory
- **Workers static assets** for the frontend

## Notes

- The repository name is prefixed correctly with `cf_ai_`.
- AI prompts used during development are included in `PROMPTS.md`.
- All code in this submission is original for this assignment.
