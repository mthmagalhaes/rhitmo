import { ptBR, enUS, es } from 'date-fns/locale';
import i18n from '@/i18n';

export const getDateLocale = (lang?: string) => {
  const l = lang || i18n.language;
  if (l.startsWith('en')) return enUS;
  if (l.startsWith('es')) return es;
  return ptBR;
};
