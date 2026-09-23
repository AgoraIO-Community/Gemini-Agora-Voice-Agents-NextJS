// Display-only: preserve raw toolkit transcripts and the text sent to TTS.
const CUES = ['laugh', 'laughs', 'breath', 'sigh', 'sighs', 'short pause'];

export function hidePerformanceCues(text: string, inProgress = false): string {
  let visible = text.replace(
    /<(?:laughs?|breath|sighs?|short pause)>|\[(?:laughs?|breath|sighs?|short pause)\]/gi,
    '',
  );
  if (inProgress) {
    const tail = visible.match(/[<\[]([^<>\[\]]*)$/);
    if (tail && CUES.some((cue) => cue.startsWith(tail[1].toLowerCase()))) {
      visible = visible.slice(0, tail.index);
    }
  }
  return visible
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .trim();
}
