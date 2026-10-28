import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { capture } from '@/lib/productAnalytics';
import { checkoutReturnEvent } from '@/lib/billingRules';

/** Retorno do Stripe em /billing: registra o resultado e segue para Faturamento. */
export default function CheckoutReturn() {
  const { search } = useLocation();
  const event = checkoutReturnEvent(search);
  useEffect(() => {
    if (event) capture(event);
  }, [event]);
  const suffix = event === 'checkout_completed' ? '&success=true' : '';
  return <Navigate to={`/lider/configuracoes?tab=faturamento${suffix}`} replace />;
}
