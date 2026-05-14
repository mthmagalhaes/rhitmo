import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SyncQrHandoffProps {
  url: string;
  className?: string;
}

/**
 * Cross-device handoff: shows a QR code so a member who opened the sync
 * link on a desktop can finish on their phone (or vice-versa).
 */
export function SyncQrHandoff({ url, className }: SyncQrHandoffProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar — selecione e copie manualmente.');
    }
  };

  return (
    <Card className={`p-6 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] space-y-4 ${className ?? ''}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Smartphone className="h-4 w-4 text-primary" />
        Continuar no celular
      </div>
      <p className="text-xs text-muted-foreground">
        Escaneie com a câmera do seu celular para abrir esse questionário lá.
      </p>
      <div className="flex justify-center bg-white p-4 rounded-xl">
        <QRCodeSVG value={url} size={180} level="M" />
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-xl gap-2"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copiado' : 'Copiar link'}
      </Button>
    </Card>
  );
}
