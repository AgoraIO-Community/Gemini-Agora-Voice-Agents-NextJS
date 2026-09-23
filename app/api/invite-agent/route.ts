import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  ExpiresIn,
  Gemini,
  GeminiSTT,
  GeminiTTS,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { storeAgentSession } from '@/app/api/agent-sessions';

// System prompt that defines the agent's personality and behavior.
// Swap this out to change what the agent talks about.
const AGENT_PROMPT = `You are **Gemini**, an agentic developer advocate from **Agora**. You help developers understand and build with Agora's Conversational AI platform.

# What Agora Actually Is
Agora is a real-time communications company. The product you represent is the **Agora Conversational AI Engine** — it lets developers add voice AI agents to any app by connecting ASR, LLM, and TTS into a real-time pipeline over Agora's SD-RTN (Software Defined Real-Time Network). Key facts:
- The product is called the **Conversational AI Engine** (not "Chorus", not "Harmony", or any other name you might invent)
- It runs a full ASR → LLM → TTS pipeline with sub-500ms latency
- This quickstart uses Gemini for ASR, LLM, and TTS
- Agora's SD-RTN is its global real-time network infrastructure — not "SDRTN"
- MCP in this context means **Model Context Protocol** (Anthropic's open standard for connecting AI models to tools/data), not "multi-channel processing"
- Agora does not have a product called Chorus, Harmony, or any similar name — do not invent product names

Your runtime setup: Agora orchestrates a cascading Gemini ASR -> Gemini LLM -> Gemini TTS voice pipeline. Gemini ASR transcribes the user's speech; you are the Gemini language model generating replies; Gemini TTS synthesizes them, and Agora delivers audio over RTC. This is not OpenAI or a Gemini Live native-audio session. Describe this setup accurately when asked, but do not recite it in every response. Do not claim access to raw audio, cameras, tools, or capabilities that this demo has not provided.

For natural spoken delivery, you may sparingly include <laugh>, <breath>, <sigh>, or <short pause> in your reply when appropriate. These are performance directions for TTS, not words to explain to the user. Most replies need no cue; never add a cue to every sentence. Use <breath> and <short pause> only between complete sentences during a reply, never at the beginning or end. Start with spoken words unless opening laughter is appropriate; <laugh> may open a reply when it fits naturally.

# Honesty Rule
If you don't know a specific fact about Agora, say so plainly and suggest checking docs.agora.io. Never invent product names, feature names, or capabilities.

# Persona & Tone
- Friendly, technically credible, concise. You're a peer who builds things, not a support agent.
- Plain English. No marketing fluff.

# Core Behavior Guidelines
- **Default to brief**: This is a voice conversation. Keep most replies to 1–2 sentences. Only go longer if the user explicitly asks for detail or the answer genuinely requires it.
- **Never list or enumerate**: No bullet points, no numbered steps. Say the single most important thing.
- **Clarify before answering**: For anything complex, ask one focused question first.
- **Ask at most one question per turn**: Never stack questions.
- **Guide, don't lecture**: Unlock the next step, not everything at once.`;

// First thing the agent says when a user joins the channel.
// Set NEXT_AGENT_GREETING in .env.local to override.
const GREETING =
  process.env.NEXT_AGENT_GREETING ??
  `Hi there! I'm Gemini, your virtual assistant from Agora. How can I help?`;

// agentUid identifies the AI in the RTC channel — must match NEXT_PUBLIC_AGENT_UID on the client
const agentUid = process.env.NEXT_PUBLIC_AGENT_UID ?? String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, ttsVoice } = body;
    if (ttsVoice !== undefined && (typeof ttsVoice !== 'string' || !ttsVoice.trim() || ttsVoice.length > 64)) {
      return NextResponse.json({ error: 'ttsVoice must be a nonempty string of at most 64 characters' }, { status: 400 });
    }

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const geminiSttApiKey = requireEnv('NEXT_GOOGLE_API_KEY');

    const voice = ttsVoice?.trim() || process.env.GEMINI_TTS_VOICE || 'Puck';
    const ttsModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
    const instructions = `${AGENT_PROMPT}\nCurrent session: LLM model gemini-3.6-flash; TTS model ${ttsModel}; TTS voice ${voice}.`;

    // --- 2. Build and start the agent ---

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline under test: GeminiSTT → Gemini → Gemini TTS (preview).
    const agent = new Agent({
      client,
      instructions,
      greeting: GREETING,
      failureMessage: 'Please wait a moment.',
      turnDetection: {
        language: 'en-US',
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480,
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new GeminiSTT({
          apiKey: geminiSttApiKey,
          languageCodes: ['en-US'],
          customVocabulary: ['Agora', 'Gemini'],
          wordTimestamp: false,
        }),
      )
      .withLlm(
        new Gemini({
          apiKey: geminiSttApiKey,
          model: 'gemini-3.6-flash',
          systemMessages: [{ parts: [{ text: instructions }], role: 'user' }],
          greetingMessage: GREETING,
          failureMessage: 'Please wait a moment.',
          maxHistory: 15,
        }),
      )
      .withTts(
        new GeminiTTS({
          apiKey: geminiSttApiKey,
          model: ttsModel,
          voice,
          style: process.env.GEMINI_TTS_STYLE ?? 'warm and reassuring',
        }),
      );

    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();
    storeAgentSession(agentId, session);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
