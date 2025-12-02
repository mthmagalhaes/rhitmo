import { CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

const Billing = () => {
  return (
    <EmptyState
      icon={CreditCard}
      title="Assinatura"
      description="🚧 Em construção: Esta funcionalidade chegará em breve."
    />
  );
};

export default Billing;
