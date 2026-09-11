import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/driver-theme.css';
import { useToast } from '@/hooks/use-toast';
import { trackFunnel } from '@/lib/analytics';
import type { TourStepDef } from '@/components/onboarding/tourSteps';

function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Espera um seletor aparecer E estar visível (MutationObserver + timeout). */
function waitForSelector(selector: string, timeout = 2500): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const findVisible = () =>
      Array.from(document.querySelectorAll(selector)).find(isVisible) as HTMLElement | undefined;

    const existing = findVisible();
    if (existing) return resolve(existing);

    let resolved = false;
    const observer = new MutationObserver(() => {
      const el = findVisible();
      if (el && !resolved) {
        resolved = true;
        observer.disconnect();
        window.clearTimeout(timer);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const timer = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      trackFunnel('tour_step_missing', { payload: { selector, timeout } });
      resolve(null);
    }, timeout);
  });
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

interface Options {
  steps: TourStepDef[];
  variant: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

/**
 * Motor de tour guiado reutilizável (driver.js + tema Creme/Bento).
 * Navega entre rotas, espera a âncora montar e PULA passos cuja âncora
 * não apareceu, em vez de encerrar o tour inteiro.
 */
export function useGuidedTour({ steps, variant, autoStart = true, onComplete, onClose }: Options) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || startedRef.current || steps.length === 0) return;
    startedRef.current = true;

    /** Procura o próximo passo alcançável a partir de `from` (direção +1/-1). */
    const hopTo = async (from: number, dir: 1 | -1) => {
      for (let i = from; i >= 0 && i < steps.length; i += dir) {
        const step = steps[i];
        if (step.route && window.location.pathname + window.location.search !== step.route) {
          navigate(step.route);
          await sleep(80);
        }
        const found = await waitForSelector(step.anchor);
        if (!found) continue;
        await sleep(120);
        trackFunnel('tour_step_view', { payload: { variant, index: i } });
        driverRef.current?.moveTo(i);
        return true;
      }
      // Nada alcançável nessa direção: encerra com elegância.
      driverRef.current?.destroy();
      return false;
    };

    const d = driver({
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Pronto',
      popoverClass: 'rhitmo-theme',
      allowClose: true,
      overlayOpacity: 0.55,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 16,
      disableActiveInteraction: true,
      steps: steps.map((step, index) => ({
        element: step.anchor,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? 'bottom',
          align: step.align ?? 'start',
          onNextClick: () => {
            if (index === steps.length - 1) {
              finishedRef.current = true;
              driverRef.current?.destroy();
              return;
            }
            void hopTo(index + 1, 1);
          },
          onPrevClick: () => {
            void hopTo(index - 1, -1);
          },
        },
      })),
      onDestroyStarted: () => {
        driverRef.current?.destroy();
      },
      onDestroyed: () => {
        if (finishedRef.current) {
          trackFunnel('tour_completed', { payload: { variant } });
          onComplete?.();
          toast({
            title: 'Tudo pronto. Bom rhitmo. 🌀',
            description: 'Você pode refazer este tour pelo menu da workspace, no rodapé da lateral.',
          });
        } else {
          trackFunnel('tour_abandoned', { payload: { variant } });
        }
        onClose?.();
      },
    });

    driverRef.current = d;

    void (async () => {
      const first = steps[0];
      if (first.route && window.location.pathname !== first.route) {
        navigate(first.route);
        await sleep(120);
      }
      const found = await waitForSelector(first.anchor, 4000);
      if (!found) {
        // Tenta o próximo passo alcançável antes de desistir.
        d.drive(0);
        const ok = await hopTo(1, 1);
        if (!ok) {
          toast({
            title: 'Não consegui iniciar o tour agora',
            description: 'Tente de novo pelo menu da workspace, no rodapé da lateral.',
          });
        }
        return;
      }
      trackFunnel('tour_started', { payload: { variant } });
      d.drive(0);
    })();

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
}
