/**
 * Edge-side mirror of src/lib/slackCommands.ts
 *
 * MUST stay in sync with:
 *   - src/lib/slackCommands.ts (frontend UI listings)
 *   - supabase/functions/slack-bot/index.ts (case branches that handle each cmd)
 *   - docs/slack-app-manifest.md (Slack App manifest)
 */
export type SlackCommandPrivacy = 'private' | 'public' | 'menu';
export type SlackCommandAudience = 'leader' | 'member' | 'all';

export interface SlackCommand {
  cmd: string;
  desc: string;
  privacy: SlackCommandPrivacy;
  audience: SlackCommandAudience;
}

export const SLACK_COMMANDS: SlackCommand[] = [
  { cmd: '/rhitmo',     desc: 'Menu principal com todas as ações',                privacy: 'menu',    audience: 'all' },
  { cmd: '/nota',       desc: 'Registrar observação privada sobre um liderado',   privacy: 'private', audience: 'leader' },
  { cmd: '/kudos',      desc: 'Reconhecimento público no canal',                  privacy: 'public',  audience: 'leader' },
  { cmd: '/brief',      desc: 'Resumo consolidado pré-1:1 de um liderado',        privacy: 'private', audience: 'leader' },
  { cmd: '/mentor',     desc: 'Chat IA contextual com a Rhitmo',                  privacy: 'private', audience: 'leader' },
  { cmd: '/meu-pdi',    desc: 'Ver seu plano de desenvolvimento (liderados)',     privacy: 'private', audience: 'member' },
  { cmd: '/meu-rhitmo', desc: 'Resumo executivo do seu momento (liderados)',      privacy: 'private', audience: 'member' },
];

export function commandsForAudience(aud: 'leader' | 'member'): SlackCommand[] {
  return SLACK_COMMANDS.filter(c => c.audience === 'all' || c.audience === aud);
}
