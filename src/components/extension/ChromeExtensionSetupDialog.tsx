import { useState } from 'react';
import { Download, Copy, Check, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useExtensionToken } from '@/hooks/useExtensionToken';
import { useToast } from '@/hooks/use-toast';

interface ChromeExtensionSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChromeExtensionSetupDialog({ open, onOpenChange }: ChromeExtensionSetupDialogProps) {
  const { toast } = useToast();
  const {
    token,
    maskedToken,
    loading,
    copied,
    showToken,
    setShowToken,
    generateToken,
    copyToken,
  } = useExtensionToken();

  const handleDownload = () => {
    fetch('/rhitmo-recorder-extension.zip')
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rhitmo-recorder-extension.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast({ title: 'Erro ao baixar extensão', variant: 'destructive' }));
  };

  const handleGenerateAndCopy = async () => {
    const newToken = await generateToken();
    if (newToken) {
      await copyToken(newToken);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Conector Chrome — Rhitmo Recorder
          </DialogTitle>
          <DialogDescription>
            Grave reuniões no Google Meet automaticamente. Ao entrar em uma chamada, a extensão inicia a gravação e envia o áudio para transcrição pela IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Step 1: Download */}
          <Button onClick={handleDownload} className="w-full rounded-xl gap-2">
            <Download className="h-4 w-4" />
            Baixar Extensão (.zip)
          </Button>

          <Separator />

          {/* Step 2: Install instructions */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Como instalar:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Descompacte o arquivo ZIP em uma pasta.</li>
              <li>No Chrome, acesse <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">chrome://extensions</code></li>
              <li>Ative o <strong>Modo Desenvolvedor</strong> (toggle no canto superior direito).</li>
              <li>Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta.</li>
            </ol>
          </div>

          <Separator />

          {/* Step 3: Token */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Token de Conexão</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Gere um token dedicado e cole no popup da extensão para conectá-la à sua conta.
            </p>

            {/* Token display field */}
            {token && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={showToken ? token : (maskedToken || '')}
                  className="font-mono text-xs bg-muted/50"
                  onClick={(e) => {
                    if (showToken) {
                      (e.target as HTMLInputElement).select();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? 'Ocultar' : 'Mostrar'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant={token ? 'outline' : 'default'}
                size="default"
                className="flex-1 rounded-xl gap-2"
                onClick={handleGenerateAndCopy}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {loading
                  ? 'Gerando...'
                  : copied
                    ? 'Copiado!'
                    : token
                      ? 'Gerar Novo Token'
                      : 'Gerar e Copiar Token'}
              </Button>

              {token && !copied && (
                <Button
                  variant="outline"
                  size="default"
                  className="rounded-xl gap-2"
                  onClick={() => copyToken()}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              )}
            </div>

            {token && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Guarde este token — ele não será exibido novamente após fechar este modal.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
