import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield, Cpu, Users, HeadphonesIcon, FileCheck, Lock,
  Phone, Building, ArrowRight, Check, Loader2, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BLOCKED_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'live.com', 'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
  'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br',
];

const ENTERPRISE_FEATURES = [
  { icon: Shield, title: "SSO (Single Sign-On)", desc: "Autenticação centralizada via SAML/OIDC" },
  { icon: Cpu, title: "API personalizada", desc: "Integrações customizadas para seu stack" },
  { icon: Users, title: "CSM dedicado", desc: "Customer Success Manager exclusivo" },
  { icon: FileCheck, title: "SLA garantido", desc: "99.9% uptime com suporte prioritário" },
  { icon: HeadphonesIcon, title: "Onboarding white-glove", desc: "Treinamento presencial ou remoto" },
  { icon: Lock, title: "LGPD avançado", desc: "DPO dedicado e compliance total" },
  { icon: Phone, title: "Suporte 24/7", desc: "Canal direto com time técnico" },
  { icon: Building, title: "Integrações enterprise", desc: "SAP, TOTVS, Oracle HCM e mais" },
];

const Enterprise = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    job_title: "",
    company_size: "",
    phone: "",
    message: "",
    consent: false,
  });

  const validateForm = () => {
    const errors: string[] = [];
    if (form.full_name.trim().split(/\s+/).length < 2) errors.push("Nome completo (nome e sobrenome)");
    const emailDomain = form.email.split("@")[1]?.toLowerCase();
    if (!form.email || !emailDomain || BLOCKED_DOMAINS.includes(emailDomain)) errors.push("Use um email corporativo");
    if (form.company.trim().length < 3) errors.push("Nome da empresa");
    if (form.job_title.trim().length < 2) errors.push("Cargo");
    if (!form.company_size) errors.push("Número de colaboradores");
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11) errors.push("Telefone no formato (XX) XXXXX-XXXX");
    }
    return errors;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(`Corrija: ${errors.join(", ")}`);
      return;
    }
    if (!form.consent) {
      toast.error("Aceite ser contatado pela equipe comercial");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("enterprise-contact", {
        body: form,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Obrigado! Nossa equipe entrará em contato em até 24h.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 50%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b" style={{ backgroundColor: "rgba(248,250,252,0.95)", backdropFilter: "blur(8px)" }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="min-h-[44px]">← Voltar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="min-h-[44px]">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left: Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6"
                  style={{ backgroundColor: "#1e3a8a15", color: "#1e3a8a" }}>
                  <Building className="h-4 w-4" />
                  Enterprise
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: "#0f172a" }}>
                  Rhitmo Enterprise
                </h1>
                <p className="mt-4 text-lg leading-relaxed" style={{ color: "#475569" }}>
                  IA nativa de gestão de desempenho para empresas que levam desenvolvimento de lideranças a sério.
                </p>
              </div>

              {/* Pricing Card */}
              <div className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: "#0f172a" }}>R$15</span>
                  <span className="text-sm" style={{ color: "#64748b" }}>por colaborador/mês</span>
                </div>
                <div className="space-y-1 text-sm" style={{ color: "#64748b" }}>
                  <p>Mínimo 100 colaboradores</p>
                  <p>Contrato anual com desconto progressivo</p>
                  <p>Faturamento corporativo (boleto, nota fiscal)</p>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ENTERPRISE_FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 items-start">
                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1e3a8a12" }}>
                      <Icon className="h-4 w-4" style={{ color: "#1e3a8a" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{title}</p>
                      <p className="text-xs" style={{ color: "#64748b" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* What's included */}
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Tudo do Business, mais:</p>
                <ul className="space-y-2">
                  {["SSO e API personalizada", "CSM dedicado", "SLA garantido", "Onboarding white-glove", "Integrações enterprise (SAP, TOTVS)", "LGPD avançado com DPO", "Custom workflows por departamento"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#334155" }}>
                      <Check className="h-4 w-4 shrink-0" style={{ color: "#10b981" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl p-8 space-y-6 shadow-lg" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                {submitted ? (
                  <div className="text-center space-y-4 py-8">
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: "#10b98120" }}>
                      <Check className="h-8 w-8" style={{ color: "#10b981" }} />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: "#0f172a" }}>Proposta solicitada!</h3>
                    <p className="text-sm" style={{ color: "#64748b" }}>
                      Nossa equipe entrará em contato em até 24 horas úteis para agendar uma demonstração personalizada.
                    </p>
                    <Link to="/">
                      <Button variant="outline" className="mt-4">Voltar ao site</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Solicitar Proposta Comercial</h2>
                      <p className="text-sm mt-1" style={{ color: "#64748b" }}>Preencha os dados e nossa equipe entra em contato.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome completo *</Label>
                        <Input id="full_name" placeholder="Maria Silva" value={form.full_name}
                          onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email corporativo *</Label>
                        <Input id="email" type="email" placeholder="voce@empresa.com.br" value={form.email}
                          onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company">Empresa *</Label>
                          <Input id="company" placeholder="TechCorp" value={form.company}
                            onChange={e => setForm(p => ({ ...p, company: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="job_title">Cargo *</Label>
                          <Input id="job_title" placeholder="Head de RH" value={form.job_title}
                            onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company_size">Número de colaboradores *</Label>
                        <Select value={form.company_size} onValueChange={v => setForm(p => ({ ...p, company_size: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100-250">100 – 250</SelectItem>
                            <SelectItem value="251-500">251 – 500</SelectItem>
                            <SelectItem value="501-1000">501 – 1.000</SelectItem>
                            <SelectItem value="1000+">1.000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" placeholder="(11) 99999-9999" value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Mensagem (opcional)</Label>
                        <Textarea id="message" placeholder="Conte-nos sobre sua necessidade..." value={form.message}
                          onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} />
                      </div>

                      <div className="flex items-start gap-2">
                        <Checkbox id="consent" checked={form.consent}
                          onCheckedChange={(v) => setForm(p => ({ ...p, consent: v === true }))} className="mt-1" />
                        <Label htmlFor="consent" className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                          Aceito ser contatado pela equipe comercial da Rhitmo para receber uma proposta personalizada.
                        </Label>
                      </div>

                      <Button type="submit" className="w-full min-h-[48px] text-base font-semibold"
                        style={{ backgroundColor: "#10b981" }} disabled={submitting}>
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                        ) : (
                          <>Solicitar Proposta Comercial <ArrowRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm" style={{ color: "#94a3b8" }}>© 2026 Rhitmo. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-4 text-xs" style={{ color: "#94a3b8" }}>
            <Link to="/terms-of-service" className="hover:underline">Termos de Serviço</Link>
            <Link to="/privacy-policy" className="hover:underline">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Enterprise;
