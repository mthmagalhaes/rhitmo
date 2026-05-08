import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/driver-theme.css';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

interface LeaderTourProps {
  /** When true, starts the tour immediately on mount. */
  autoStart?: boolean;
  /** Called when the tour is closed (finished or dismissed). */
  onClose?: () => void;
}

/**
 * Contextual 60-second welcome tour for new leaders.
 * Uses driver.js with the Creme/Bento theme. Navigates between routes
 * automatically via react-router. Marks completion in user_preferences.
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

    const goTo = (path: string) =>
      new Promise<void>((resolve) => {
        navigate(path);
        // Allow lazy route + element to mount before driver re-positions
        window.setTimeout(resolve, 450);
      });

    const d = driver({
      showProgress: true,
      progressText: 'Passo {{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Pronto',
      popoverClass: 'rhitmo-theme',
      allowClose: true,
      overlayOpacity: 0.45,
      smoothScroll: true,
      steps: [
        {
          element: '[data-sidebar="sidebar"]',
          popover: {
            title: 'Bem-vindo ao Rhitmo',
            description:
              'Aqui ficam suas áreas: 1:1s, Diário, Pessoas e Avaliações. Tudo organizado em volta dos seus liderados.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: 'main',
          popover: {
            title: 'Diário de bordo',
            description:
              'Cole transcrições do Meet, Tactiq ou Fireflies aqui. A Rhitmo extrai feedback, ações e padrões automaticamente. Esse é o seu superpoder.',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: async () => {
            await goTo('/lider/diario');
          },
        },
        {
          element: 'main',
          popover: {
            title: 'Contexto unificado',
            description:
              'Linha do tempo de tudo que acontece com seu time: notas, 1:1s, pulses, sinais do Slack. Sua memória organizacional.',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: async () => {
            await goTo('/lider/contexto');
          },
        },
        {
          element: 'main',
          popover: {
            title: 'Performance Reviews',
            description:
              'Avaliações montadas a partir das evidências reais que você capturou ao longo do trimestre. Sem começar do zero.',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: async () => {
            await goTo('/lider/avaliacoes');
          },
        },
        {
          element: 'main',
          popover: {
            title: 'Conecte suas ferramentas',
            description:
              'Slack e Google Calendar fazem a Rhitmo trabalhar em background — briefs antes das 1:1s, sinais ambientes, lembretes nos canais certos.',
            side: 'top',
            align: 'center',
          },
          onHighlightStarted: async () => {
            await goTo('/lider/configuracoes?tab=integracoes');
          },
        },
      ],
      onDestroyed: () => {
        if (!userClosedRef.current) return;
        markComplete();
        toast({
          title: 'Tudo pronto. Bom rhitmo. 🌀',
          description: 'Você pode refazer este tour pelo menu da workspace, no rodapé da sidebar.',
        });
        onClose?.();
      },
      onCloseClick: () => {
        userClosedRef.current = true;
        driverRef.current?.destroy();
      },
      onPopoverRender: () => {
        // any custom hook if needed
      },
    });

    driverRef.current = d;
    // Start on a slight delay so the page is settled
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
