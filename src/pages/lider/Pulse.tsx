import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from 'react-i18next';

export default function LiderPulse() {
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto p-6">
      <EmptyState
        icon={Activity}
        title={t('nav.placeholder.pulse_title')}
        description={t('nav.placeholder.pulse_desc')}
      />
    </div>
  );
}
