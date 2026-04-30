import Billing from '@/pages/Billing';
// Configurações: por enquanto encaminha para Billing que já agrega plano/perfil.
// O ProfileSettingsDialog continua acessível pelo header/sidebar profile block.
export default function LiderConfiguracoes() {
  return <Billing />;
}
