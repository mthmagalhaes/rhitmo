import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';

const Analytics = () => {
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
      icon={BarChart3}
      title="Analytics"
      description="🚧 Em construção: Esta funcionalidade chegará em breve."
    />
  );
};

export default Analytics;
