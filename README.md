# FocusNotes

AI note taker for students. Record a class, then get structured notes, a summary, a ranked list of what to focus on, a quiz, and a simple re-explanation of every moment where you pressed "I'm lost".

## Run it

You need Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local   # then put your Gemini API key in .env.local
npm run dev
```

Open http://localhost:3000 in Chrome, Edge or Safari.

### AI provider

The app picks its AI provider from the key it finds in `.env.local`:

| Key set | Provider | Cost |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini (tries `gemini-3.8-flash`, then `gemini-3.5-flash`, then `gemini-2.5-flash` if one is busy; change the list with `GEMINI_MODEL`) | Free tier, with daily limits. Get a key at https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | Claude | Paid |
| none | Demo mode: always shows the same example study pack | Free |

If both keys are set, Gemini is used. On Gemini's free tier, Google may use the content you send to improve its products, so do not use it for private recordings.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and run the production version |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run the unit tests |
| `npm run check:ai` | Check that the Gemini key works and which models answer |

## Project structure

```
app/
  page.tsx              Home screen: wires the hooks and components together
  api/notes/route.ts    POST /api/notes: validation, rate limit, error mapping
components/             One file per piece of interface (Recorder, Tabs, results/…)
hooks/                  useSpeechRecorder, useClassHistory, useUnsavedWarning
lib/
  schema.ts             Shape of a study pack and of API requests (Zod)
  transcript.ts         Timeline of speech + "I'm lost" markers
  quiz.ts, markdown.ts  Quiz scoring, Markdown export
  client/               Browser-only code: API client, saved classes
  server/               Server-only code: AI generator, prompt, rate limiter
tests/                  Unit tests for everything in lib/
```

Design rules the code follows:

- Each file has one job. Components only render, hooks hold browser state, `lib/` holds logic that can be tested without a browser.
- The API route depends on the `StudyPackGenerator` interface, not on a specific AI provider. `GeminiStudyPackGenerator`, `ClaudeStudyPackGenerator` and `DemoStudyPackGenerator` are three implementations; adding another provider means adding a class, not editing the route.
- `lib/schema.ts` is the single source of truth for data shapes, used by the server, the browser and the AI output format.

## Security

- The API keys live only on the server (`.env.local`, never committed) and are never sent to the browser.
- Every request is validated (type, size, allowed languages) before it reaches the AI.
- Requests are rate limited per client (10 every 10 minutes). The limiter is in memory, so replace it with a shared store such as Redis before running more than one server instance.
- The transcript is passed to the AI as data inside tags, and the prompt tells the model not to follow instructions found in it.
- AI output is checked against the schema, and quiz questions that cannot be graded are dropped.
- Security headers are set in `next.config.ts`: Content Security Policy, no framing, no MIME sniffing, HSTS, and a permissions policy that allows only the microphone.
- Error messages shown to users never include internal details; those go to the server log.
- Data saved in the browser is validated when loaded.

## Known limits

- Live transcription uses the browser's speech recognition. It needs an internet connection, and Chrome sends the audio to Google to transcribe it.
- No audio file upload yet (needs a speech-to-text service).
- No accounts: notes live only in the browser that created them.
- Recording a class can require the teacher's consent. The app reminds the student but does not enforce it.
