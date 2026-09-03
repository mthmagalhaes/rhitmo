import { useEffect } from 'react';
import { usePersona } from './usePersona';

/**
 * Aplica o tema por papel no `<html data-role="...">`.
 *
 * A mesma pessoa pode ser líder e liderada ao mesmo tempo; quando ela troca
 * para a visão de liderado, o app inteiro muda de família cromática (tokens em
 * `index.css` sob `[data-role='member']`) para deixar o contexto óbvio.
 * É só aparência — não afeta RLS, escopo de dados nem permissões.
 */
export function useRoleTheme(): 'leader' | 'member' {
  const persona = usePersona();
  const role = persona === 'direct_report' ? 'member' : 'leader';

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-role', role);
    return () => {
      el.setAttribute('data-role', 'leader');
    };
  }, [role]);

  return role;
}
