/**
 * Single source of truth for the Rhitmo Slack bot slash commands.
 * Must mirror the `case` branches in supabase/functions/slack-bot/index.ts
 * and the manifest in docs/slack-app-manifest.md.
 *
 * If you add/remove a command here, update those two files in the same PR.
 */
export type SlackCommandPrivacy = 'private' | 'public' | 'menu';

export interface SlackCommand {
  cmd: `/${string}`;
  desc: string;
  privacy: SlackCommandPrivacy;
  audience: 'leader' | 'member' | 'all';
}

export const SLACK_COMMANDS: SlackCommand[] = [
  { cmd: '/rhitmo',     desc: 'Menu principal com todas as ações',                privacy: 'menu',    audience: 'all' },
  { cmd: '/nota',       desc: 'Registrar observação privada sobre um liderado',   privacy: 'private', audience: 'leader' },
  { cmd: '/kudos',      desc: 'Reconhecimento privado (DM + Diário de Bordo)',     privacy: 'private', audience: 'leader' },
  { cmd: '/brief',      desc: 'Resumo consolidado pré-1:1 de um liderado',        privacy: 'private', audience: 'leader' },
  { cmd: '/mentor',     desc: 'Chat IA contextual com a Rhitmo',                  privacy: 'private', audience: 'leader' },
  { cmd: '/meu-pdi',    desc: 'Ver seu plano de desenvolvimento (liderados)',     privacy: 'private', audience: 'member' },
  { cmd: '/meu-rhitmo', desc: 'Resumo executivo do seu momento (liderados)',      privacy: 'private', audience: 'member' },
];

export const SLACK_PRIVATE_COMMANDS = SLACK_COMMANDS.filter(c => c.privacy === 'private').map(c => c.cmd);
export const SLACK_PUBLIC_COMMANDS  = SLACK_COMMANDS.filter(c => c.privacy === 'public').map(c => c.cmd);

/** Short marketing string (used in i18n.slackDescription). */
export const SLACK_COMMANDS_SHORT_LIST = SLACK_COMMANDS.map(c => c.cmd).join(', ');
