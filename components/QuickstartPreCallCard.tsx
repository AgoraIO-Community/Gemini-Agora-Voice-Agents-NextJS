'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GEMINI_VOICES = [
  'Kore',
  'Puck',
  'Zephyr',
  'Charon',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
];

type QuickstartPreCallCardProps = {
  voice: string;
  onVoiceChange: (voice: string) => void;
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  voice,
  onVoiceChange,
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div
      className="mx-auto flex w-[min(92vw,26.25rem)] animate-fade-up flex-col items-center rounded-[20px] border border-[#2b2b2b] px-10 py-10 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      style={{
        backgroundImage:
          'linear-gradient(164.988deg, rgba(54,54,54,0.2) 1.0596%, rgba(0,0,0,0) 96.089%), linear-gradient(90deg, rgb(16,16,16) 0%, rgb(16,16,16) 100%)',
      }}
    >
      <h1 className="text-[28px] font-medium leading-[1.2] text-white">
        Try Agora&apos;s Voice Agent
      </h1>
      <p className="mt-[14px] text-sm font-medium leading-6 text-muted-foreground">
        Built on Agora&apos;s flagship Conversational AI engine, for effortless
        agentic conversations.
      </p>

      <div className="mt-6 w-full text-left">
        <label htmlFor="tts-voice" className="text-sm font-medium text-white">
          Voice
        </label>
        <div className="relative mt-2">
          <select
            id="tts-voice"
            value={voice}
            onChange={(event) => onVoiceChange(event.target.value)}
            disabled={isLoading}
            className="w-full appearance-none rounded-xl border border-white/15 bg-zinc-950 pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          >
            {GEMINI_VOICES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      <Button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-6 h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white hover:text-black disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-black"
        aria-label={
          isLoading
            ? 'Starting conversation with AI agent'
            : 'Start conversation with AI agent'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Start Conversation'
        )}
      </Button>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
