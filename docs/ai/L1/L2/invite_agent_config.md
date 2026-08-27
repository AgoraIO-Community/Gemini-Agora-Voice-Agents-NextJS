> **When to Read This:** Load this document when you are changing the agent's prompt, voice, VAD behavior, model selection, or wiring a bring-your-own-key (BYOK) provider.

# Invite Agent Config

## Where It Lives

All of the managed agent configuration is built in `app/api/invite-agent/route.ts`. The route receives `{ requester_id, channel_name }` from `LandingPage`, constructs an `Agent` from `agora-agents`, and starts a session bound to the requester's RTC channel.

## Top-Level Constants

| Constant            | Default                                              | Purpose                                                   |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `ADA_PROMPT`        | Long-form instructions for "Ada", an Agora assistant | The system prompt for the LLM.                            |
| `GREETING`          | Friendly first line                                   | Spoken on session start unless `NEXT_AGENT_GREETING` set. |

`NEXT_AGENT_GREETING` overrides `GREETING` at runtime. `ADA_PROMPT` has no env override — edit the constant.

## The Agent Builder Chain

Standard `AgoraClient` starts the `GeminiSTT` preview-provider session and authenticates with the Agora app ID and certificate. The default providers all reuse `NEXT_GOOGLE_API_KEY`; the Gemini LLM and MiniMaxTTS stages are not Agora-managed.

```ts
const client = new AgoraClient({ area: Area.US, appId, appCertificate });
const googleApiKey = requireEnv('NEXT_GOOGLE_API_KEY');

const agent = new Agent({
  client,
  instructions: ADA_PROMPT,
  greeting: GREETING,
  failureMessage: 'Please wait a moment.',
  turnDetection: { language: 'en-US', config: { /* VAD settings */ } },
  advancedFeatures: { enable_rtm: true, enable_tools: true },
  parameters: {
    audio_scenario: 'chorus',
    data_channel: 'rtm',
    enable_error_message: true,
    enable_metrics: true,
  },
})
  .withStt(new GeminiSTT({
    apiKey: googleApiKey,
    languageCodes: ['en-US'],
    customVocabulary: ['Agora', 'Gemini'],
    wordTimestamp: false,
  }))
  .withLlm(new Gemini({
    apiKey: googleApiKey,
    model: 'gemini-3.6-flash',
    greetingMessage: GREETING,
    failureMessage: 'Please wait a moment.',
    maxHistory: 15,
    maxOutputTokens: 1024,
    temperature: 0.7,
    topP: 0.95,
  }))
  .withTts(new MiniMaxTTS({
    key: googleApiKey,
    voiceName: 'en-US-Chirp3-HD-Charon',
    languageCode: 'en-US',
    sampleRate: 24000,
  }));
```

## Session Options

`createSession` takes the session options object. `session.start()` is called separately and returns the `agentId`.

```ts
const session = agent.createSession({
  channel: channel_name,
  agentUid,
  remoteUids: [requester_id],
  idleTimeout: 30,
  expiresIn: ExpiresIn.hours(1),
  debug: false,
});
const agentId = await session.start();
```

| Option        | Effect                                                                               |
| ------------- | ------------------------------------------------------------------------------------ |
| `channel`     | The RTC channel name the agent joins.                                                |
| `agentUid`    | The UID the agent occupies in the channel — must match `NEXT_PUBLIC_AGENT_UID`.      |
| `remoteUids`  | Restricts the agent to the requester's UID — protects against cross-channel sniping. |
| `idleTimeout` | Seconds of silence before the session ends.                                          |
| `expiresIn`   | Hard ceiling on session length, mirrors the 1-hour RTC token.                        |
| `debug`       | Logs Agora REST API calls to the console when `true`.                                |

## Editing Each Surface

### Change the prompt

Edit `ADA_PROMPT`. Keep it concise; very long prompts amplify Gemini LLM latency.

### Change the greeting

Either edit `GREETING` (changes everyone) or set `NEXT_AGENT_GREETING` in `.env.local` / Vercel (changes the deployment only).

### Change VAD behavior

Edit `turnDetection.config.start_of_speech` and `turnDetection.config.end_of_speech`. Both blocks accept the new VAD param shape — do **not** revert to the deprecated `turnDetection.type: 'agora_vad'`.

### Swap the STT model

The default is `GeminiSTT` (`gemini-3.5-transcribe-live`) with `NEXT_GOOGLE_API_KEY` and standard `AgoraClient`. Replace the provider constructor only when intentionally changing providers.

Gemini custom vocabulary and word timestamps are incompatible. Keep `wordTimestamp: false` explicit whenever `customVocabulary` is configured; the SDK rejects `wordTimestamp: true` with a custom vocabulary.

### Swap the LLM

The default is `Gemini` model `gemini-3.6-flash`, reusing `NEXT_GOOGLE_API_KEY`.

### Swap the TTS

The default is `MiniMaxTTS` with voice `en-US-Chirp3-HD-Charon`, language `en-US`, sample rate 24000, and the same `NEXT_GOOGLE_API_KEY`. Replace the constructor only when intentionally selecting another provider.

## Response Contract

On success the route returns `AgentResponse`:

```json
{
  "agent_id": "string",
  "create_ts": 1700000000,
  "state": "RUNNING"
}
```

`agent_id` is what `LandingPage` later passes to `/api/stop-conversation`.

## Verification

`scripts/verify-api-contracts.ts` mocks `Agent.prototype.createSession` and asserts:

- Missing `channel_name` or `requester_id` → `400`.
- Mocked success → `200` with `agent_id`, `create_ts`, `state`.

After editing this file, run:

```bash
pnpm run verify:api
pnpm run typecheck
```

## Failure Modes

| Symptom                                                | Cause                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `400 channel_name and requester_id are required`       | Browser sent an empty body or wrong field names.               |
| `500 Agora credentials are not set`                    | `NEXT_AGORA_APP_CERTIFICATE` missing in env.                   |
| Agent joins but never speaks                           | `NEXT_GOOGLE_API_KEY` missing/invalid or MiniMaxTTS voice settings changed incorrectly. |
| Agent state stuck on `IDLE`                            | `enable_rtm: true` missing or RTM client not subscribed yet.   |
| `verify:api` fails on the route                        | New required field added without updating the harness.         |

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Interfaces](../06_interfaces.md)
- [Token Model](token_model.md)
