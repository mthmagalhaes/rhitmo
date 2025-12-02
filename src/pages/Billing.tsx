import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <EmptyState
      icon={CreditCard}
      title="Assinatura"
      description="🚧 Em construção: Esta funcionalidade chegará em breve."
    />
  );
};

export default Billing;
