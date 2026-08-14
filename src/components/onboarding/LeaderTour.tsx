import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/driver-theme.css';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { trackFunnel } from '@/lib/analytics';

interface LeaderTourProps {
  autoStart?: boolean;
  onClose?: () => void;
}

function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Wait for a CSS selector to appear AND be visible. Uses MutationObserver
 * (more efficient than polling) with a timeout safety net.
 */
function waitForSelector(selector: string, timeout = 2500): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const findVisible = () =>
      Array.from(document.querySelectorAll(selector)).find(isVisible) as HTMLElement | undefined;

    const existing = findVisible();
    if (existing) {
      console.debug('[LeaderTour] selector found immediately', { selector });
      return resolve(existing);
    }

    let resolved = false;
    const observer = new MutationObserver(() => {
      const el = findVisible();
      if (el && !resolved) {
        resolved = true;
        observer.disconnect();
        window.clearTimeout(timer);
        console.debug('[LeaderTour] selector found via observer', { selector });
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const timer = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      console.debug('[LeaderTour] selector NOT found within timeout', { selector, timeout });
      trackFunnel('tour_step_missing', { payload: { selector, timeout } });
      resolve(null);
    }, timeout);
  });
}

/**
 * Contextual 60-second welcome tour for new leaders.
 * Uses driver.js with the Creme/Bento theme. Manual control via onNextClick
 * lets us navigate routes and wait for the target element to mount before
 * advancing — fixes the "popover disappears after step 1" race condition.
 */
export function LeaderTour({ autoStart = true, onClose }: LeaderTourProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { markComplete } = useOnboardingTour();
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const userClosedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;

    // Hop to a route, wait for its anchor to mount, then advance the tour.
    const hopAndAdvance = async (path: string, anchor: string) => {
      navigate(path);
      // Give react-router + lazy chunks a tick before we start polling
      await new Promise((r) => window.setTimeout(r, 60));
      const found = await waitForSelector(anchor);
      if (!found) {
        toast({
          title: 'Não consegui abrir este passo',
          description: 'Encerrei o tour. Você pode refazê-lo pelo menu da workspace.',
        });
        userClosedRef.current = true;
        driverRef.current?.destroy();
        return;
      }
      // Small settle delay so layout is stable when driver re-positions
      await new Promise((r) => window.setTimeout(r, 120));
      driverRef.current?.moveNext();
    };

    const d = driver({
      showProgress: true,
      progressText: 'Passo {{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Pronto',
      popoverClass: 'rhitmo-theme',
      allowClose: true,
      overlayOpacity: 0.5,
      smoothScroll: true,
      disableActiveInteraction: true,
      steps: [
        // 1 — Sidebar (no route change)
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Bem-vindo ao Rhitmo',
            description:
              'Aqui ficam suas áreas: 1:1s, Anotações & Evidências, Pessoas e Avaliações. Tudo organizado em volta dos seus liderados.',
            side: 'right',
            align: 'start',
            onNextClick: () => {
              void hopAndAdvance('/lider/diario', '[data-tour="member-list"]');
            },
          },
        },
        // 2 — Diário
        {
          element: '[data-tour="member-list"]',
          popover: {
            title: 'Anotações & Evidências',
            description:
              'Cada liderado tem um espaço privado de anotações e evidências. Cole transcrições do Meet, Tactiq ou Fireflies e a Rhitmo extrai feedback, ações e padrões automaticamente.',
            side: 'right',
            align: 'start',
            onNextClick: () => {
              void hopAndAdvance('/lider/avaliacoes', '[data-tour="reviews-list"]');
            },
            onPrevClick: () => {
              navigate('/lider/inicio');
              window.setTimeout(() => driverRef.current?.movePrevious(), 200);
            },
          },
        },
        // 3 — Avaliações
        {
          element: '[data-tour="reviews-list"]',
          popover: {
            title: 'Performance Reviews',
            description:
              'Avaliações montadas a partir das evidências reais que você capturou ao longo do trimestre. Sem começar do zero.',
            side: 'right',
            align: 'start',
            onNextClick: () => {
              void hopAndAdvance(
                '/lider/configuracoes?tab=integracoes',
                '[data-tour="integrations"]',
              );
            },
          },
        },
        // 5 — Integrações
        {
          element: '[data-tour="integrations"]',
          popover: {
            title: 'Conecte suas ferramentas',
            description:
              'Slack e Google Calendar fazem a Rhitmo trabalhar em background: briefs antes das 1:1s, sinais ambientes, lembretes nos canais certos. O passo a passo completo de como conectar a agenda está na aba Ajuda, aqui mesmo em Configurações.',

            side: 'top',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        userClosedRef.current = true;
        driverRef.current?.destroy();
      },
      onDestroyed: () => {
        if (!userClosedRef.current) return;
        markComplete();
        toast({
          title: 'Tudo pronto. Bom rhitmo. 🌀',
          description: 'Você pode refazer este tour pelo menu da workspace, no rodapé da sidebar.',
        });
        onClose?.();
      },
    });

    driverRef.current = d;
    // Wait for the first anchor to actually be visible before starting,
    // so we don't fire driver.js against a hidden sidebar in mobile viewports.
    window.setTimeout(async () => {
      const found = await waitForSelector('[data-tour="sidebar"]');
      if (!found) {
        toast({
          title: 'Não consegui iniciar o tour',
          description: 'Tente novamente pelo menu da workspace, no rodapé da sidebar.',
        });
        userClosedRef.current = true;
        driverRef.current?.destroy();
        return;
      }
      d.drive();
    }, 100);

    return () => {
      try {
        driverRef.current?.destroy();
      } catch {
        /* ignore */
      }
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return null;
}
