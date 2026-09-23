# 02 Architecture

> Runtime architecture for browser RTC/RTM, Next.js route handlers, and Agora managed agent session.

## High-Level Shape

- Next.js App Router frontend and API routes in one deployable app.
- Browser joins Agora RTC channel and uses RTM for transcript/state/metrics/errors.
- Server-side routes mint token and call Agora Agent Server SDK.
- Agent executes STT -> LLM -> TTS pipeline in Agora cloud.

## Component Graph

```text
Browser UI (LandingPage + ConversationComponent)
  -> GET /api/generate-agora-token
  -> POST /api/invite-agent
  -> RTC join/publish mic
  -> RTM subscribe + AgoraVoiceAI events
  -> POST /api/stop-conversation

Next.js API routes
  -> agora-token (RtcTokenBuilder.buildTokenWithRtm)
  -> agora-agents (start/stop managed agent)

Agora Cloud
  -> Agent session (GeminiSTT preview + Gemini LLM + GeminiTTS by default)
  -> RTM payloads (transcript, state, metrics, error)
```

## Start Sequence

1. UI fetches RTC+RTM token and channel.
2. UI invites agent and initializes RTM in parallel.
3. UI mounts conversation view.
4. `useJoin` connects RTC once `isReady` guard passes.
5. `AgoraVoiceAI.init()` subscribes transcript/state/metrics streams.

## End Sequence

1. UI calls `/api/stop-conversation` with `agent_id` if present.
2. UI logs out RTM client.
3. RTC hook ownership handles leave/unpublish cleanup.
4. Component state resets to pre-call shell.

## Core State Domains

- Session bootstrap: `LandingPage` (`agoraData`, `rtmClient`, loading/error flags).
- RTC transport and mic: `ConversationComponent` + `agora-rtc-react` hooks.
- Transcript + agent state: `AgoraVoiceAI` events mapped through `lib/conversation.ts`.
- Metrics and connection issues: `AGENT_METRICS`, `MESSAGE_ERROR`, `SAL_STATUS`, RTM fallback parsing.

## External Dependencies

- `agora-rtc-react` / `agora-rtc-sdk-ng` for media transport.
- `agora-rtm` for data channel.
- `agora-agent-client-toolkit` and `agora-agent-uikit` for conversation logic/UI.
- `agora-agents` for managed agent lifecycle.

## Deployment Modes

- Local development via `pnpm run dev`.
- Vercel deployment as single Next.js app with server env vars.

## Data and Control Boundaries

- Browser never sees the app certificate; only receives signed short-lived tokens.
- Agent lifecycle control (`start`, `stop`) is server-routed.
- Transcript/state/metrics are data-plane RTM events from agent to browser.
- UI control-plane actions (start/end, renew) originate in `LandingPage`.

## Internal Interfaces Between Components

`LandingPage` -> `ConversationComponent` props:

- `agoraData` (`token`, `uid`, `channel`, optional `agentId`)
- `rtmClient` (already logged-in and subscribed)
- `onTokenWillExpire(uid)` callback for dual-token renewal
- `onEndConversation()` callback for teardown and route stop call

`ConversationComponent` -> child UI components:

- normalized transcript items and current in-progress turn
- agent visualizer state derived from transport + semantic state
- connection issue list and derived severity
- recent metric window for stage latency chips

## Why the App Router Structure Matters

- API handlers under `app/api` co-deploy with UI and share env management.
- Client components isolate browser-only SDK usage via dynamic import and `ssr: false`.
- This avoids SSR-side access to WebRTC-dependent modules.

## Change Impact Hints

- Changes to token or invite routes affect both startup and renewal paths.
- Changes to transcript mapping can break both transcript panel and visualizer semantics.
- Changes to RTM setup in `LandingPage` affect toolkit subscription readiness.

## Related Deep Dives

- [conversation_lifecycle.md](L2/conversation_lifecycle.md) — Detailed bootstrapping and teardown timeline.
- [transcript_pipeline.md](L2/transcript_pipeline.md) — Event mapping, UID remap, in-progress/completed segmentation.


### Voice selection

Choose a voice before starting a conversation. The selector lists all 30 Gemini
voice names and defaults to Puck. The selected voice is sent as optional
`ttsVoice` in the start request and applies to that session only. API callers
that omit it retain the `GEMINI_TTS_VOICE` environment default (or Puck).
End the conversation to choose another voice.

The prompt describes the Gemini ASR/LLM/TTS pipeline and the session's selected
voice and model. It permits occasional performance cues. The transcript view
hides only known cues in agent messages (including incomplete streaming cues);
raw toolkit events and TTS input remain unchanged. Streaming cue interpretation
by the preview TTS has not been verified.

The transcript header includes a **Show cues** toggle, off by default. It changes
only rendered agent text and never modifies TTS input or raw transcript events.

The agent introduces itself as **Gemini** in the prompt and default greeting.
