// Curated rotative self-reflection prompts — 8 per locale.
// The week index modulo 8 picks the prompt of the week.
export const PROMPTS: Record<string, Array<{ key: string; text: string }>> = {
  'pt-BR': [
    { key: 'energy_high', text: 'O que mais te energizou nesta semana?' },
    { key: 'energy_drain', text: 'O que mais te drenou nesta semana?' },
    { key: 'proud_moment', text: 'Qual foi o momento que você mais se orgulhou?' },
    { key: 'support_needed', text: 'Onde você precisa de mais apoio do seu líder?' },
    { key: 'learned', text: 'O que você aprendeu nesta semana que vai levar adiante?' },
    { key: 'blocker', text: 'Qual obstáculo está te impedindo de avançar?' },
    { key: 'team_dynamic', text: 'Como você descreveria a dinâmica do time esta semana?' },
    { key: 'next_priority', text: 'Qual sua principal prioridade para a próxima semana?' },
  ],
  en: [
    { key: 'energy_high', text: 'What energized you the most this week?' },
    { key: 'energy_drain', text: 'What drained you the most this week?' },
    { key: 'proud_moment', text: 'What was your proudest moment this week?' },
    { key: 'support_needed', text: 'Where do you need more support from your leader?' },
    { key: 'learned', text: 'What did you learn this week that you will carry forward?' },
    { key: 'blocker', text: 'What obstacle is preventing you from moving forward?' },
    { key: 'team_dynamic', text: 'How would you describe the team dynamic this week?' },
    { key: 'next_priority', text: 'What is your top priority for next week?' },
  ],
  es: [
    { key: 'energy_high', text: '¿Qué te dio más energía esta semana?' },
    { key: 'energy_drain', text: '¿Qué te agotó más esta semana?' },
    { key: 'proud_moment', text: '¿Cuál fue tu momento de mayor orgullo?' },
    { key: 'support_needed', text: '¿Dónde necesitas más apoyo de tu líder?' },
    { key: 'learned', text: '¿Qué aprendiste esta semana que llevarás adelante?' },
    { key: 'blocker', text: '¿Qué obstáculo te impide avanzar?' },
    { key: 'team_dynamic', text: '¿Cómo describirías la dinámica del equipo esta semana?' },
    { key: 'next_priority', text: '¿Cuál es tu principal prioridad para la próxima semana?' },
  ],
};

export function pickPromptForWeek(locale: string, weekStarting: string): { key: string; text: string } {
  const list = PROMPTS[locale] ?? PROMPTS['pt-BR'];
  const weekDate = new Date(weekStarting + 'T00:00:00Z');
  const epochWeek = Math.floor(weekDate.getTime() / (7 * 86400 * 1000));
  return list[epochWeek % list.length];
}
