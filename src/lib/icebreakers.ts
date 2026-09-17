export function icebreakers(input: {
  name: string;
  reasons: string[];
  interests: string[];
  vibes: string[];
  intention: string;
  prompt?: { question: string; answer: string } | null;
  focusLabel?: string | null;
}) {
  const lines: string[] = [];
  if (input.focusLabel) lines.push(`I liked your ${input.focusLabel}. Want to tell me more?`);
  if (input.prompt?.answer) {
    lines.push(`“${input.prompt.answer}” — that stayed with me. How did that start?`);
  }
  const interest = input.interests[0];
  if (interest) lines.push(`We're both into ${interest}. What's your latest obsession?`);
  const vibe = input.vibes[0];
  if (vibe) lines.push(`${vibe} energy. Does that show up on a first coffee or later?`);
  if (input.intention) {
    lines.push(`We're both looking for ${input.intention.toLowerCase().replaceAll("_", " ")}. What does that look like for you this year?`);
  }
  if (input.reasons[0]) lines.push(`${input.reasons[0]}. That's a good place to start.`);
  const unique = [...new Set(lines)].filter(Boolean);
  if (!unique.length) unique.push(`Hey ${input.name} — want to skip the small talk?`);
  return unique.slice(0, 3);
}
