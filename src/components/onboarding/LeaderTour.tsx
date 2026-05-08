import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/driver-theme.css';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

interface LeaderTourProps {
  autoStart?: boolean;
  onClose?: () => void;
}

/**
 * Wait for a CSS selector to appear in the DOM.
 * Resolves with the element, or null after `timeout` ms.
 */
function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Wait for a CSS selector to appear in the DOM AND be visible.
 * Among multiple matches, returns the first visible one.
 * Resolves with the element, or null after `timeout` ms.
 */
function waitForSelector(selector: string, timeout = 2500): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const findVisible = () => {
      const matches = Array.from(document.querySelectorAll(selector));
      return matches.find(isVisible) as HTMLElement | undefined;
    };

    const existing = findVisible();
    if (existing) return resolve(existing);

    const start = Date.now();
    const interval = window.setInterval(() => {
      const el = findVisible();
      if (el) {
        window.clearInterval(interval);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        window.clearInterval(interval);
        resolve(null);
      }
    }, 80);
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
      await waitForSelector(anchor);
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
          element: '[data-sidebar="sidebar"]',
          popover: {
            title: 'Bem-vindo ao Rhitmo',
            description:
              'Aqui ficam suas áreas: 1:1s, Diário, Pessoas e Avaliações. Tudo organizado em volta dos seus liderados.',
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
            title: 'Diário de bordo',
            description:
              'Cada liderado tem um diário privado seu. Cole transcrições do Meet, Tactiq ou Fireflies e a Rhitmo extrai feedback, ações e padrões automaticamente.',
            side: 'right',
            align: 'start',
            onNextClick: () => {
              void hopAndAdvance('/lider/contexto', '[data-tour="context-feed"]');
            },
            onPrevClick: () => {
              navigate('/lider/inicio');
              window.setTimeout(() => driverRef.current?.movePrevious(), 200);
            },
          },
        },
        // 3 — Contexto
        {
          element: '[data-tour="context-feed"]',
          popover: {
            title: 'Contexto unificado',
            description:
              'Linha do tempo de tudo que aconteceu com seu time: notas, 1:1s, pulses, sinais do Slack. Sua memória organizacional viva.',
            side: 'top',
            align: 'center',
            onNextClick: () => {
              void hopAndAdvance('/lider/avaliacoes', '[data-tour="reviews-list"]');
            },
            onPrevClick: () => {
              void hopAndAdvance('/lider/diario', '[data-tour="member-list"]').then(() => {
                // hopAndAdvance moves next; we want previous instead
                driverRef.current?.movePrevious();
                driverRef.current?.movePrevious();
              });
            },
          },
        },
        // 4 — Avaliações
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
              'Slack e Google Calendar fazem a Rhitmo trabalhar em background: briefs antes das 1:1s, sinais ambientes, lembretes nos canais certos.',
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
    window.setTimeout(() => d.drive(), 100);

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
