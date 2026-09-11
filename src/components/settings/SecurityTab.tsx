import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, ShieldAlert, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}

/**
 * Verificação em duas etapas (TOTP) + orientações de segurança da conta.
 * Não altera regras de negócio: usa apenas o módulo de MFA do próprio auth.
 */
export function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error('Não foi possível carregar a verificação em duas etapas.');
    } else {
      setFactors((data?.totp ?? []) as Factor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `App autenticador ${new Date().toLocaleDateString('pt-BR')}`,
    });
    if (error || !data) {
      toast.error(error?.message ?? 'Não foi possível iniciar a verificação em duas etapas.');
      setEnrolling(false);
      return;
    }
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setEnrolling(false);
  };

  const confirmEnroll = async () => {
    if (!factorId || code.trim().length < 6) return;
    setVerifying(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      toast.error('Não foi possível validar agora. Tente de novo.');
      setVerifying(false);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setVerifying(false);
    if (error) {
      toast.error('Código inválido. Confira o app autenticador e tente de novo.');
      return;
    }
    toast.success('Verificação em duas etapas ativada.');
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode('');
    void refresh();
  };

  const removeFactor = async (id: string) => {
    setRemovingId(id);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setRemovingId(null);
    if (error) {
      toast.error('Não foi possível remover agora.');
      return;
    }
    toast.success('Verificação em duas etapas removida.');
    void refresh();
  };

  const active = factors.filter((f) => f.status === 'verified');

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="font-serif tracking-tight">Verificação em duas etapas</CardTitle>
              <CardDescription>
                Um código de 6 dígitos no seu celular, além da senha, para entrar na Rhitmo.
              </CardDescription>
            </div>
            {!loading && (
              <Badge
                variant={active.length ? 'default' : 'secondary'}
                className="rounded-full gap-1 shrink-0"
              >
                {active.length ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {active.length ? 'Ativa' : 'Desativada'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : active.length > 0 ? (
            <div className="space-y-2">
              {active.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.friendly_name || 'App autenticador'}</p>
                    <p className="text-xs text-muted-foreground">Código de 6 dígitos</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-destructive"
                    onClick={() => removeFactor(f.id)}
                    disabled={removingId === f.id}
                  >
                    {removingId === f.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : qr ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Abra seu app autenticador (Google Authenticator, 1Password, Authy) e leia o código
                abaixo.
              </p>
              <img src={qr} alt="Código para o app autenticador" className="h-44 w-44 rounded-xl bg-white p-2" />
              {secret && (
                <p className="text-xs text-muted-foreground">
                  Sem câmera? Digite esta chave: <span className="font-mono">{secret}</span>
                </p>
              )}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="totp-code">Código de 6 dígitos</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="rounded-xl font-mono tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button className="rounded-xl" onClick={confirmEnroll} disabled={verifying || code.length < 6}>
                  {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Ativar
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => {
                    setQr(null);
                    setSecret(null);
                    setFactorId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button className="rounded-xl" onClick={startEnroll} disabled={enrolling}>
              {enrolling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ativar verificação em duas etapas
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="font-serif tracking-tight">Como protegemos sua conta</CardTitle>
          <CardDescription>Regras que já valem para todo mundo na Rhitmo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Senhas que já apareceram em vazamentos públicos são recusadas no cadastro e na troca.</p>
          <p>Para trocar a senha estando logado, é preciso informar a senha atual.</p>
          <p>Todo acesso sensível a dados de pessoas fica registrado para o responsável pela conta.</p>
          <Button variant="outline" size="sm" className="rounded-xl mt-2 gap-1" asChild>
            <Link to="/confianca" target="_blank" rel="noreferrer">
              Ver página de Confiança e Segurança <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
