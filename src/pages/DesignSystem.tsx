import { useState } from 'react';
import { Copy, Check, Download, Palette, Type, Image, Layout, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

import logoHorizontal from '@/assets/rhitmo-logo-horizontal.png';
import logoVertical from '@/assets/rhitmo-logo-vertical.png';
import logoIcon from '@/assets/rhitmo-logo-icon.png';
import logoMono from '@/assets/rhitmo-logo-mono.png';
import socialInstagram from '@/assets/rhitmo-social-instagram.png';
import socialLinkedin from '@/assets/rhitmo-social-linkedin.png';
import socialTwitter from '@/assets/rhitmo-social-twitter.png';

const colors = [
  { name: 'Primary', hex: '#7C3AED', hsl: 'hsl(263, 84%, 58%)', role: 'Botões, links, acentos' },
  { name: 'Secondary', hex: '#1A1035', hsl: 'hsl(256, 53%, 13%)', role: 'Texto, headings' },
  { name: 'Background', hex: '#F5F3EE', hsl: 'hsl(42, 25%, 94%)', role: 'Canvas principal' },
  { name: 'Surface', hex: '#FAF8F5', hsl: 'hsl(36, 33%, 97%)', role: 'Cards, containers' },
  { name: 'Success', hex: '#059669', hsl: 'hsl(161, 93%, 30%)', role: 'Confirmações' },
  { name: 'Warning', hex: '#D97706', hsl: 'hsl(32, 94%, 43%)', role: 'Alertas' },
  { name: 'Destructive', hex: '#DC2626', hsl: 'hsl(0, 72%, 50%)', role: 'Erros' },
  { name: 'Info', hex: '#0EA5E9', hsl: 'hsl(198, 88%, 48%)', role: 'Informativo' },
];

const logos = [
  { name: 'Horizontal', src: logoHorizontal, desc: 'Uso principal em headers e materiais' },
  { name: 'Vertical', src: logoVertical, desc: 'Uso em cards e ícones grandes' },
  { name: 'Ícone', src: logoIcon, desc: 'Favicon, app icon, perfis' },
  { name: 'Monocromática', src: logoMono, desc: 'Para fundos escuros', dark: true },
];

const socials = [
  { name: 'Instagram Post', src: socialInstagram, size: '1080×1080' },
  { name: 'LinkedIn Banner', src: socialLinkedin, size: '1584×396' },
  { name: 'Twitter/X Header', src: socialTwitter, size: '1500×500' },
];

export default function DesignSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (user?.email !== 'matheus@rhitmo.co') {
    return <Navigate to="/dashboard" replace />;
  }

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast({ title: 'Copiado!', description: hex });
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const downloadImage = (src: string, name: string) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero */}
      <section className="px-8 pt-12 pb-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-medium">Design System</p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
          Rhitmo Brand Kit
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Identidade visual, paleta de cores, tipografia e templates para manter a consistência da marca.
        </p>
      </section>

      {/* Colors */}
      <section className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="h-5 w-5 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Paleta de Cores</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colors.map((color) => (
            <button
              key={color.hex}
              onClick={() => copyHex(color.hex)}
              className="group bg-card rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-200 text-left"
            >
              <div
                className="w-full h-20 rounded-xl mb-3 border border-border/30"
                style={{ backgroundColor: color.hex }}
              />
              <p className="font-semibold text-sm text-foreground">{color.name}</p>
              <p className="text-xs text-muted-foreground mb-1">{color.role}</p>
              <div className="flex items-center gap-1">
                <code className="text-xs font-mono text-foreground/70">{color.hex}</code>
                {copiedHex === color.hex ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                )}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{color.hsl}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Type className="h-5 w-5 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Tipografia</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Headlines</p>
            <p className="font-serif text-3xl font-bold text-foreground mb-2">Lora</p>
            <p className="font-serif text-xl text-foreground/70 mb-1">Bom dia, Matheus</p>
            <p className="font-serif text-base text-foreground/50 italic">Feedback semanal</p>
            <p className="text-xs text-muted-foreground mt-4 font-mono">400 · 500 · 600 · 700</p>
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Body</p>
            <p className="text-3xl font-bold text-foreground mb-2">Inter / Work Sans</p>
            <p className="text-base text-foreground/70 mb-1">Texto padrão para parágrafos</p>
            <p className="text-sm text-foreground/50">Labels e textos auxiliares</p>
            <p className="text-xs text-muted-foreground mt-4 font-mono">400 · 500 · 600 · 700</p>
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">Data / Mono</p>
            <p className="text-3xl font-bold text-foreground mb-2 font-mono">Geist Mono</p>
            <p className="text-base text-foreground/70 font-mono mb-1">12 feedbacks · 4 metas</p>
            <p className="text-sm text-foreground/50 font-mono">#7C3AED · hsl(263, 84%)</p>
            <p className="text-xs text-muted-foreground mt-4 font-mono">400 · 700</p>
          </div>
        </div>

        {/* Type Scale */}
        <div className="mt-6 bg-card rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6">Escala Tipográfica</p>
          <div className="space-y-3">
            {[
              { size: '48px', label: 'H1', example: 'Bom dia, Matheus' },
              { size: '36px', label: 'H2', example: 'Seu time está evoluindo' },
              { size: '28px', label: 'H3', example: 'Feedback da semana' },
              { size: '22px', label: 'H4', example: 'Detalhes do membro' },
              { size: '14px', label: 'Body', example: 'Texto padrão para parágrafos e descrições longas' },
              { size: '11px', label: 'Caption', example: 'Metadata e timestamps · 2025-01-15' },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline gap-4">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{item.size}</span>
                <span className="text-xs font-mono text-primary w-10 shrink-0">{item.label}</span>
                <span className="font-serif font-bold text-foreground truncate" style={{ fontSize: item.size }}>
                  {item.example}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Logo Variations</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className={`rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] flex flex-col items-center ${
                logo.dark ? 'bg-[hsl(var(--secondary))]' : 'bg-card'
              }`}
            >
              <img
                src={logo.src}
                alt={`Rhitmo logo ${logo.name}`}
                className="h-24 w-auto object-contain mb-4"
                loading="lazy"
              />
              <p className={`font-semibold text-sm ${logo.dark ? 'text-white' : 'text-foreground'}`}>{logo.name}</p>
              <p className={`text-xs mb-3 ${logo.dark ? 'text-white/60' : 'text-muted-foreground'}`}>{logo.desc}</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => downloadImage(logo.src, `rhitmo-logo-${logo.name.toLowerCase()}.png`)}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Social Media Templates */}
      <section className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Image className="h-5 w-5 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Social Media Templates</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {socials.map((social) => (
            <div key={social.name} className="bg-card rounded-2xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <img
                src={social.src}
                alt={social.name}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{social.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{social.size}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => downloadImage(social.src, `rhitmo-${social.name.toLowerCase().replace(/[\s/]/g, '-')}.png`)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  PNG
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Design Tokens */}
      <section className="px-8 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <Layout className="h-5 w-5 text-primary" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Design Tokens</p>
        </div>
        <div className="bg-card rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { token: 'Border Radius', value: 'rounded-2xl (16px) / rounded-3xl (24px)' },
              { token: 'Shadow', value: '0 2px 20px rgba(0,0,0,0.04)' },
              { token: 'Card Padding', value: 'p-8 (32px) / p-10 (40px)' },
              { token: 'Section Gap', value: 'mb-12 (48px)' },
              { token: 'Overline', value: 'uppercase · tracking-[0.2em] · 11px' },
              { token: 'Hover Lift', value: '-translate-y-1 · transition 200ms' },
            ].map((item) => (
              <div key={item.token} className="border-b border-border/30 pb-3">
                <p className="font-semibold text-sm text-foreground">{item.token}</p>
                <code className="text-xs font-mono text-muted-foreground">{item.value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
