import { useGuidedTour } from '@/hooks/useGuidedTour';
import { stepsFor, type TourVariant } from '@/components/onboarding/tourSteps';

interface GuidedTourProps {
  variant: TourVariant;
  autoStart?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

/**
 * Tour guiado da Rhitmo. O roteiro vem de `tourSteps`, a mecânica de
 * `useGuidedTour`. Este componente é só a casca que liga os dois.
 */
export function GuidedTour({ variant, autoStart = true, onComplete, onClose }: GuidedTourProps) {
  useGuidedTour({
    steps: stepsFor(variant),
    variant,
    autoStart,
    onComplete,
    onClose,
  });
  return null;
}
