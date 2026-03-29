import { useNavigate } from 'react-router-dom';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export const UpgradeBanner = () => {
  const navigate = useNavigate();
  const { limits, memberCount, teamCount, reviewCount, checkLimit } = useEnforcedLimits();

  const nearLimits: { name: string; current: number; max: number }[] = [];

  const memberStatus = checkLimit(memberCount, limits.maxMembers);
  if (memberStatus !== 'allowed') {
    nearLimits.push({ name: 'Liderados', current: memberCount, max: limits.maxMembers });
  }

  const teamStatus = checkLimit(teamCount, limits.maxTeams);
  if (teamStatus !== 'allowed') {
    nearLimits.push({ name: 'Times', current: teamCount, max: limits.maxTeams });
  }

  const reviewStatus = checkLimit(reviewCount, limits.maxReviews);
  if (reviewStatus !== 'allowed') {
    nearLimits.push({ name: 'Avaliações/mês', current: reviewCount, max: limits.maxReviews });
  }

  if (nearLimits.length === 0) return null;

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Você está próximo do limite do plano {limits.planName}
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <div className="space-y-1 mt-1">
          {nearLimits.map((limit) => (
            <div key={limit.name} className="text-sm">
              {limit.current}/{limit.max} {limit.name}
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => navigate('/billing')}
        >
          Fazer Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};
