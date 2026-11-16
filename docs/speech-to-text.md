# Speech-to-text (Groq Whisper)

Notes from a recording are written in two steps when `GROQ_API_KEY` is set on the server:

1. **Groq Whisper** (`whisper-large-v3-turbo`) turns the recording into timed text.
2. The "I'm lost" presses are placed in the text at their times, and **Gemini reads only the text** to write the study pack. Text costs far less than audio.

Gemini listens to the audio itself, as before, when:
- the class is detected as **Arabic** (Whisper is weak on Moroccan Darija);
- the file is larger than `GROQ_MAX_FILE_MB` (25 MB by default, about 1 h 40 of class at the app's bitrate);
- Groq fails, is over its free quota, or returns almost no text.

Without `GROQ_API_KEY`, Gemini always listens to the audio.

Code: `lib/server/transcriber.ts`, `lib/server/transcribingGenerator.ts`, wired in `lib/server/generatorFactory.ts`.

## Setup

1. Create a free account at console.groq.com.
2. API Keys → Create API key → copy it (shown once).
3. Vercel → Settings → Environment Variables → `GROQ_API_KEY`, type **Secret** → Redeploy.

## Check it works

Vercel → your project → **Logs**, after sending a class:
- `[notes] writing from a … transcript` → transcribed by Groq, notes from text.
- `[notes] … the notes model will listen to it` → Gemini listened (Arabic class, large file, or Groq problem; the line says which).

Groq's free tier covers a few hours of audio per day; beyond that it is billed per hour of audio. Check the current limits in the Groq console (Settings → Limits).
