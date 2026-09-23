# Agora Conversational AI Next.js Quickstart

## Gemini TTS preview variant

**Current environment:** `gemini-3.8-flash-tts` greeting audio is verified in all three demos.

This recipe uses the published Agora Agent Kit SDK **v2.11.0**.
The pipeline is GeminiSTT → Gemini `gemini-3.6-flash` → Gemini 3.8 Flash TTS.
All three stages use server-only `NEXT_GOOGLE_API_KEY`. AgentSession automatically uses
`agora-feature: gemini-live` and the preview endpoint for start and subsequent
session operations. Keep the retained session for stopping the agent.

Set these optional values in `.env.local`:

```dotenv
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
GEMINI_TTS_VOICE=Puck
GEMINI_TTS_STYLE="warm and reassuring"
```

Use `GEMINI_TTS_MODEL=gemini-3.8-flash-tts` and restart the backend after configuration changes.
SDK dependencies are pinned to v2.11.0; no sibling SDK checkout is required.
Gemini TTS remains a preview provider within the released SDK.

Build and run a real-time voice agent with **GeminiSTT**, Gemini 3.6, and Gemini TTS preview using Next.js.

The app provides the browser voice experience, token generation, agent session lifecycle, live transcript, agent state, and per-stage pipeline latency.

## Pipeline

```text
Microphone -> GeminiSTT -> Gemini 3.6 LLM -> Gemini TTS -> Browser
```

Gemini ASR, Gemini LLM, and Gemini TTS use the same Google API key. Gemini TTS uses the same server-only Google API key through the preview SDK.

## Prerequisites

- [Node.js 22 or newer](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation)
- [Agora CLI](https://github.com/AgoraIO/cli)
- An Agora project with Conversational AI access enabled
- A Google API key with access to Gemini

## Quickstart

### 1. Clone the repository

```bash
git clone https://github.com/AgoraIO-Community/Gemini-Agora-Voice-Agents-NextJS.git
cd Gemini-Agora-Voice-Agents-NextJS
```

### 2. Install and sign in to the Agora CLI

Skip installation if `agora` is already available on your path.

```bash
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh -s -- --add-to-path
agora login
agora project use <project-id-or-name>
```

### 3. Create the local environment

Install dependencies and create `.env.local` from the example:

```bash
pnpm install
```

Write the Agora App ID, App Certificate, and other project values from the selected Agora project:

```bash
agora project env write .env.local
```

Open `.env.local` and add your Google API key:

```env
NEXT_GOOGLE_API_KEY=your_google_api_key
```

Keep `.env.local` private. It is ignored by Git and server-only values are never exposed to the browser bundle.

### 4. Run the application

```bash
pnpm run doctor
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and select **Start conversation**.

## Configuration

Configuration is defined in [`env.local.example`](env.local.example).

| Variable | Required | Description |
| --- | :---: | --- |
| `NEXT_PUBLIC_AGORA_APP_ID` | Yes | Agora project App ID. |
| `NEXT_AGORA_APP_CERTIFICATE` | Yes | Server-only Agora App Certificate. |
| `NEXT_GOOGLE_API_KEY` | Yes | Google API key used by GeminiSTT, Gemini 3.6, and Gemini TTS. |
| `NEXT_PUBLIC_AGENT_UID` | No | Agent RTC UID. Defaults to `123456`. |
| `NEXT_AGENT_GREETING` | No | Overrides the default opening message. |
| `GEMINI_TTS_MODEL` | No | TTS model; defaults to `gemini-3.8-flash-tts`. |
| `GEMINI_TTS_VOICE` | No | Default Gemini TTS voice; defaults to `Puck`. |
| `GEMINI_TTS_STYLE` | No | Optional description of the speaking style. |

## Voice selection and cues

Choose from all 30 Gemini voices before starting; Puck is the default. The selected
voice applies to that session. API callers that omit `ttsVoice` use
`GEMINI_TTS_VOICE` or Puck. End the conversation to choose another voice.

The prompt describes the Gemini ASR/LLM/TTS pipeline and selected voice and model.
It permits occasional performance cues. The transcript view hides known cues in
agent messages, including incomplete streamed cues; raw transcript events and TTS
input stay unchanged. The **Show cues** toggle displays cues in the transcript.
Streaming cue interpretation by the preview TTS has not been verified.

The agent introduces itself as **Gemini** in the prompt and default greeting.

## How it works

1. The browser requests an RTC and RTM token from `/api/generate-agora-token`.
2. The app starts the Conversational AI agent through `/api/invite-agent`.
3. The browser joins Agora RTC and RTM and publishes microphone audio.
4. GeminiSTT transcribes the user, Gemini 3.6 generates the response, and Gemini TTS produces the agent audio.
5. Transcript, agent state, and per-stage latency metrics are delivered over RTM.
6. `/api/stop-conversation` ends the session and releases client media resources.

## Commands

```bash
pnpm install       # Install dependencies
pnpm run doctor    # Check prerequisites and environment
pnpm dev           # Run the development server
pnpm run lint      # Check formatting and lint rules
pnpm run build     # Create a production build
pnpm run verify    # Run the full verification suite
```

## Deployment

The app can run as a standard Next.js deployment. Set the variables from `.env.local` in the hosting provider’s server environment, including `NEXT_AGORA_APP_CERTIFICATE` and `NEXT_GOOGLE_API_KEY`. Do not prefix secret values with `NEXT_PUBLIC_`.

## Troubleshooting

### The agent does not join

Run `pnpm run doctor` and confirm that `NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`, and `NEXT_GOOGLE_API_KEY` are non-empty. Also confirm that the selected Agora project has Conversational AI access enabled.

### No transcript or audio appears

Check the browser console for the agent connection and confirm that microphone permission was granted. The pipeline panel displays the latest Gemini ASR, Gemini LLM, and Gemini TTS latency metrics when those events arrive.

### RTM login fails

Ensure the app uses the combined RTC and RTM token generated by `/api/generate-agora-token`, and that the browser UID matches the UID used when the token was created.

## Project structure

```text
app/api/                 Token, invite, and stop route handlers
components/              Voice UI, transcript, state, and metrics components
lib/                     Shared client helpers
app/api/invite-agent/    GeminiSTT, Gemini 3.6, and Gemini TTS configuration
env.local.example        Safe configuration template
docs/ai/RECIPE.md        Implementation recipe and design constraints
```

## Documentation

- [Implementation recipe](docs/ai/RECIPE.md)
- [Architecture guide](docs/ai/L1/02_architecture.md)
- [Contributing guide](CONTRIBUTING.md)

## License

Released under the [MIT License](LICENSE).
