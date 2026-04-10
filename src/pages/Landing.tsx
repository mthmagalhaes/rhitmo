import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { RhythmWave } from "@/components/RhythmWave";
import { WaveDivider } from "@/components/WaveDivider";

import { useAuth } from "@/hooks/useAuth";
import { Zap, Heart, BarChart, Sparkles, Send, Loader2, ImageIcon, Menu, X, Check, Lock, Moon, Sun, Globe, Building, Clock, AlertCircle, DollarSign, Shield, Mic, XCircle, CheckCircle2, Target, Users, FileText, ArrowRight } from "lucide-react";
import analyticsScreenshot from "@/assets/analytics-screenshot.png";
import heroLeaderFlow from "@/assets/hero-leader-flow.png";
import heroDuoFeedback from "@/assets/hero-duo-feedback.png";
import { cn } from "@/lib/utils";
import { AINativeBadge } from "@/components/ui/AINativeBadge";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============== TRANSLATIONS ==============

const translations = {
  pt: {
    // Header
    signIn: "Entrar",
    getStarted: "Começar grátis",
    toggleTheme: "Alternar tema",
    // Hero
    heroTitle: "Nunca mais escreva uma avaliação de desempenho do zero.",
    heroSubtitle: "O que levava 4 horas agora leva 2 minutos. Rhitmo é o único parceiro AI-nativo de liderança que transforma suas conversas em reviews prontas.",
    seePlans: "Ver planos",
    aiNativeBadge: "AI-Native desde o dia 1",
    // Before vs After
    beforeAfterOverline: "O dia a dia sem IA",
    beforeAfterTitle: "Antes era burocracia. Agora é estratégia.",
    withoutRhitmo: "Sem Rhitmo",
    withRhitmo: "Com Rhitmo",
    beforeItems: [
      "4h por review, reescrevendo do zero toda vez",
      "Viés invisível passando despercebido em cada avaliação",
      "70% das conversas do trimestre esquecidas",
      "Feedback genérico: \"precisa melhorar comunicação\"",
      "Dados espalhados entre planilhas, docs e e-mails",
    ],
    afterItems: [
      "Draft completo em 30 segundos. Você só revisa.",
      "Viés detectado e corrigido antes de salvar",
      "Cada 1:1 registrada automaticamente com contexto",
      "Feedback baseado em evidências reais, não memória",
      "Tudo centralizado, organizado por IA",
    ],
    // Video
    videoTitle: "Veja Rhitmo em ação",
    videoSubtitle: "Veja como uma review de 4 horas vira 2 minutos.",
    // Comparison
    comparisonOverline: "Comparativo real",
    comparisonTitle: "A diferença não está no que prometem. Está no que entregam.",
    compFeature: "Recurso",
    compSpreadsheets: "Planilhas",
    compQulture: "Qulture.Rocks",
    compLattice: "Lattice",
    compRhitmo: "Rhitmo",
    compRows: [
      { feature: "Escreve review completa de ponta a ponta", spreadsheets: "no", qulture: "partial", lattice: "yes", rhitmo: "yes" },
      { feature: "Detecta viés de gênero e personalidade em tempo real", spreadsheets: "no", qulture: "no", lattice: "partial", rhitmo: "yes" },
      { feature: "Mentor IA conversacional no fluxo de trabalho", spreadsheets: "no", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Transcreve e analisa 1:1s automaticamente", spreadsheets: "no", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Funciona em 5 min, sem demo call, sem implantação", spreadsheets: "yes", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Plano gratuito real, não trial de 14 dias", spreadsheets: "yes", qulture: "no", lattice: "no", rhitmo: "yes" },
    ],
    compLegend: "✅ Completo · ~ Parcial · ❌ Não possui",
    // Numbers
    numbersOverline: "Impacto mensurável",
    numbersTitle: "Não é promessa. São números.",
    numbersStat1: "4h → 2min",
    numbersLabel1: (<>Gestores dedicam <span className="highlight-marker">210 horas por ano</span> a avaliações de desempenho. São <span className="highlight-marker">cinco semanas inteiras</span>. Só a redação consome 65 horas. <span className="highlight-marker">Com Rhitmo, o draft sai pronto em segundos.</span></>),
    numbersStat2: "38x",
    numbersLabel2: (<>Mulheres <span className="highlight-marker">recebem 38x mais feedback sobre personalidade do que homens</span>. Rhitmo detecta e corrige antes que você publique.</>),
    numbersStat3: "60%",
    numbersLabel3: "Em grandes empresas, avaliações tradicionais custam até US$ 35 milhões por ano. E 95% dos gestores estão insatisfeitos com o resultado. Rhitmo corta o custo e entrega precisão.",
    // USPs
    uspsTitle: "O que só Rhitmo faz",
    uspTitle1: "IA que escreve (não sugere)",
    uspText1: "Outros dão \"sugestões\". Rhitmo escreve a review completa baseada em todas as suas 1:1s. Você só revisa.",
    uspTitle2: "Detecção de viés em tempo real",
    uspText2: "Enquanto você escreve, Rhitmo alerta sobre linguagem tendenciosa. Não é análise pós-review, é prevenção.",
    uspTitle3: "Transcrição automática",
    uspText3: "Grave suas 1:1s. Rhitmo transcreve, analisa e registra automaticamente. Você nunca mais esquece o que foi dito.",
    uspCTA: "Ver Rhitmo em Ação",
    // Leaders
    forLeaders: "Para Líderes",
    leadersTitle: "Automatize o operacional. Lidere com confiança.",
    leadersP1: "Rhitmo transforma anotações soltas em avaliações de desempenho completas. Sem gastar 4 horas copiando e colando de planilhas. 30 segundos e você tem um draft pronto.",
    leadersP2: "Insights automáticos decodificam o estilo de trabalho de cada liderado. Esqueceu a 1:1 de janeiro? A IA lembra. Tudo vira evidência na hora da review.",
    // Reports
    forReports: "Para Pessoas Lideradas",
    reportsTitle: "Avaliações justas. Carreira sem surpresas.",
    reportsP1: "Mulheres recebem 38x mais feedback negativo que homens. Rhitmo detecta viés e garante que todas as suas entregas sejam lembradas. Baseado em fatos, não na memória recente do gestor.",
    reportsP2: "Receba planos de desenvolvimento personalizados com o caminho exato para o próximo nível. A avaliação vira alavanca, não burocracia.",
    // HR
    forHR: "Para RH",
    hrTitle: "Escale a cultura. Elimine o gargalo operacional.",
    hrP1: "Seus gestores gastam 4h por review. Com Rhitmo, são 2 minutos. Isso são centenas de horas devolvidas por ciclo de avaliação, sem perder qualidade.",
    hrP2: "Coaching personalizado no fluxo de trabalho, visibilidade total de métricas de saúde dos times. ROI mensurável, não promessa de consultoria.",
    // Pricing
    pricingTitle: "Simples. Transparente.",
    pricingSubtitle: "Comece grátis. Evolua quando seu time crescer.",
    // Pulse
    pulseSubtitle: "Para o líder que quer começar a registrar e desenvolver seu time.",
    pulseFree: "Grátis",
    pulseForever: "· para sempre",
    pulseCTA: "Começar grátis",
    pulseFeatures: [
      "Até 3 liderados",
      "20 mensagens de Mentor Chat por mês",
      "Notas e anotações ilimitadas",
      "1 avaliação formal por mês",
      "1 time",
    ],
    pulseLocked: [
      "Meu Rhitmo para liderados",
      "Gravação de reuniões",
      "Analytics completo",
    ],
    // Pro
    proSubtitle: "Para líderes que gerenciam até 5 pessoas e querem desenvolver cada uma com intenção.",
    proPerMonth: "/líder/mês",
    proNote: "14 dias grátis · cancele quando quiser",
    proCTA: "Começar com 14 dias grátis",
    proBadge: "Mais popular",
    proFeatures: [
      "Até 5 liderados",
      "Mentor Chat ilimitado",
      "Notas e anotações ilimitadas",
      "Avaliações formais ilimitadas",
      "Meu Rhitmo para seus liderados",
      "Gravação de reuniões (até 12h/mês)",
      "Analytics completo",
      "Até 3 times",
    ],
    // Business
    businessSubtitle: "Para empresas que querem uma cultura de feedback consistente em todos os times.",
    businessPerMonth: "/líder/mês",
    businessNote: "Mínimo 3 líderes · R$207/mês",
    businessCTA: "Falar com a equipe",
    businessFeatures: [
      "Até 8 liderados por líder",
      "Tudo do plano Pro",
      "Times ilimitados",
      "Gravação de reuniões (até 30h/mês)",
      "HR Dashboard com métricas agregadas",
      "Onboarding assistido",
      "Suporte prioritário",
    ],
    // Chat mockup
    mentorChatLabel: "Liderada: Maria Santos",
    chatQuestion: "Como dar feedback sobre atrasos sem desmotivar?",
    chatAnswer: "Baseado no perfil da Maria, sugiro uma abordagem empática. Comece reconhecendo as entregas positivas...",
    chatPlaceholder: "Como posso ajudar você hoje?",
    // Hero image alt
    heroAlt: "Líder trabalhando com calma e controle em ambiente minimalista",
    duoAlt: "Líder e liderado em conversa de feedback construtivo olhando para tablet",
    analyticsAlt: "Analytics Dashboard - Rhitmo",
    // Footer
    footerRights: "© 2026 Rhitmo. Todos os direitos reservados.",
    footerLogin: "Já tem conta? Entrar",
    footerTerms: "Termos de Serviço",
    footerPrivacy: "Política de Privacidade",
    launchBadge: "Preço de Lançamento",
    launchDisclaimer: "Preço de lançamento garantido enquanto sua assinatura estiver ativa.",
    // Enterprise
    enterpriseNav: "Enterprise",
    enterpriseSubtitle: "Para empresas estruturadas com 100+ colaboradores que querem IA nativa de verdade.",
    enterprisePrice: "A partir de R$15",
    enterprisePer: "/colaborador/mês",
    enterpriseNote: "Mínimo 100 colaboradores · contrato anual",
    enterpriseCTA: "Falar com Vendas",
    enterpriseFeatures: [
      "Tudo do Business",
      "SSO e API personalizada",
      "CSM dedicado",
      "SLA garantido",
      "Onboarding white-glove",
      "Integrações enterprise (SAP, TOTVS)",
    ],
    // Footer comparisons
    footerCompare: "Compare",
    footerVsQulture: "Rhitmo vs. Qulture.Rocks",
    footerVsFeedz: "Rhitmo vs. Feedz",
    footerVsLattice: "Rhitmo vs. Lattice",
    // Phase 3 — Value Proposition
    forWhoOverline: "Feito para você",
    forWhoTitle: "Quem usa Rhitmo e por quê.",
    forWhoLeaderTitle: "Líderes individuais",
    forWhoLeaderText: "Você lidera 3 a 10 pessoas. Não tem tempo de escrever reviews do zero. Precisa de um copiloto que registra tudo e entrega o draft pronto.",
    forWhoLeaderBadge: "Caso de uso #1",
    forWhoPmeTitle: "Startups e PMEs",
    forWhoPmeText: "20-100 colaboradores, sem RH estruturado. Você quer profissionalizar gestão de performance sem contratar consultoria de R$50k.",
    forWhoPmeBadge: "Crescimento rápido",
    forWhoEntTitle: "Empresas estruturadas",
    forWhoEntText: "100+ colaboradores. RH como comprador. Precisa de IA nativa de verdade, não um checkbox de marketing.",
    forWhoEntBadge: "Plano Enterprise",
    forWhoEntLink: "Saiba mais →",
    howItWorksTitle: "Como funciona",
    howStep1Title: "Registre suas 1:1s",
    howStep1Text: "Grave reuniões ou cole transcrições. Rhitmo captura tudo automaticamente.",
    howStep2Title: "IA analisa e organiza",
    howStep2Text: "Cada conversa vira nota estruturada com temas, compromissos e alertas de viés.",
    howStep3Title: "Review pronta em 30 segundos",
    howStep3Text: "Selecione o período, clique 'Gerar'. Rhitmo escreve a avaliação completa. Você só revisa.",
    whatWeAreNotTitle: "Comunicação honesta: o que Rhitmo não faz (ainda)",
    whatWeAreNotIntro: "Rhitmo não é uma plataforma genérica de RH. Somos especialistas em IA para reviews e 1:1s. Aqui está o que NÃO temos hoje:",
    whatWeAreNotItems: [
      "Avaliação 360° (planejado para Q3/2026)",
      "OKRs completos (temos metas básicas, OKRs vêm em Q4/2026)",
      "Pesquisa de clima organizacional (roadmap 2027)",
    ],
    whatWeAreNotOutro: "Se você precisa dessas features HOJE, recomendamos usar Qulture.Rocks ou Feedz para isso, e Rhitmo para o que fazemos melhor: IA que escreve reviews, detecta viés e registra tudo automaticamente. Muitos clientes usam Rhitmo + outra ferramenta. Estamos OK com isso.",
    whatWeAreNotCTA: "Ver nosso roadmap público →",
    positioningLine1: "Rhitmo não é mais uma plataforma de RH.",
    positioningLine2: "É o AI Chief of Staff que escreve reviews, detecta vieses e registra tudo automaticamente.",
    positioningLine3: "Não fazemos de tudo. Fazemos uma coisa excepcionalmente bem: transformar conversas em performance reviews prontas.",
    positioningCTA: "Essa é a nossa missão. Junte-se a nós →",
    faqTitle: "Perguntas frequentes",
    faqItems: [
      { q: "Rhitmo substitui ferramentas como Qulture.Rocks?", a: "Não completamente. Se você precisa de 360° ou pesquisa de clima hoje, use Qulture + Rhitmo. Se precisa só de reviews e 1:1s melhores, use só Rhitmo." },
      { q: "A IA realmente escreve tudo ou só dá sugestões?", a: "Escreve tudo. Você recebe um draft completo de 2-3 páginas. Não são bullet points, é texto corrido pronto para revisão." },
      { q: "Como Rhitmo detecta viés?", a: "IA analisa linguagem em tempo real e alerta sobre: viés de gênero (ex: \"agressiva\" vs. \"assertivo\"), viés de personalidade (foco em \"como é\" vs. \"o que fez\"), generalizações (\"sempre\", \"nunca\")." },
      { q: "Preciso treinar meu time para usar?", a: "Não. Interface é autoexplicativa. A maioria dos usuários começa a usar em menos de 5 minutos." },
      { q: "Meus dados estão seguros?", a: "Sim. Notas de líderes são privadas por padrão. Compartilhamento é uma ação explícita. Seguimos as melhores práticas de segurança e LGPD." },
    ],
  },
  en: {
    signIn: "Sign in",
    getStarted: "Get started free",
    toggleTheme: "Toggle theme",
    heroTitle: "Never write a performance review from scratch again.",
    heroSubtitle: "What took 4 hours now takes 2 minutes. Rhitmo is the only AI-native leadership partner that turns your conversations into ready-made reviews.",
    seePlans: "See plans",
    aiNativeBadge: "AI-Native since day 1. Not an add-on",
    // Before vs After
    beforeAfterOverline: "Day-to-day without AI",
    beforeAfterTitle: "It used to be bureaucracy. Now it's strategy.",
    withoutRhitmo: "Without Rhitmo",
    withRhitmo: "With Rhitmo",
    beforeItems: [
      "4 hours per review, rewriting from scratch every time",
      "Invisible bias slipping through every evaluation",
      "70% of quarterly conversations forgotten",
      "Generic feedback: \"needs to improve communication\"",
      "Data scattered across spreadsheets, docs and emails",
    ],
    afterItems: [
      "Full draft in 30 seconds. You just review.",
      "Bias detected and corrected before saving",
      "Every 1:1 recorded automatically with context",
      "Feedback based on real evidence, not memory",
      "Everything centralized, organized by AI",
    ],
    videoTitle: "See Rhitmo in action",
    videoSubtitle: "See how a 4-hour review becomes 2 minutes.",
    // Comparison
    comparisonOverline: "Real comparison",
    comparisonTitle: "The difference isn't in what they promise. It's in what they deliver.",
    compFeature: "Feature",
    compSpreadsheets: "Spreadsheets",
    compQulture: "Qulture.Rocks",
    compLattice: "Lattice",
    compRhitmo: "Rhitmo",
    compRows: [
      { feature: "Writes full review end-to-end", spreadsheets: "no", qulture: "partial", lattice: "yes", rhitmo: "yes" },
      { feature: "Detects gender and personality bias in real time", spreadsheets: "no", qulture: "no", lattice: "partial", rhitmo: "yes" },
      { feature: "Conversational AI Mentor in the workflow", spreadsheets: "no", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Transcribes and analyzes 1:1s automatically", spreadsheets: "no", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Works in 5 min, no demo call, no deployment", spreadsheets: "yes", qulture: "no", lattice: "no", rhitmo: "yes" },
      { feature: "Real free plan, not a 14-day trial", spreadsheets: "yes", qulture: "no", lattice: "no", rhitmo: "yes" },
    ],
    compLegend: "✅ Complete · ~ Partial · ❌ Not available",
    // Numbers
    numbersOverline: "Measurable impact",
    numbersTitle: "Not a promise. These are numbers.",
    numbersStat1: "4h → 2min",
    numbersLabel1: (<>Managers spend <span className="highlight-marker">210 hours per year</span> on performance reviews. That's <span className="highlight-marker">five full weeks</span>. Writing alone takes 65 hours. <span className="highlight-marker">With Rhitmo, the draft is ready in seconds.</span></>),
    numbersStat2: "38x",
    numbersLabel2: (<>Women <span className="highlight-marker">receive 38x more personality feedback than men</span>. Rhitmo detects and corrects before you publish.</>),
    numbersStat3: "60%",
    numbersLabel3: "In large companies, traditional reviews cost up to $35 million per year. And 95% of managers are dissatisfied with the results. Rhitmo cuts costs and delivers precision.",
    // USPs
    uspsTitle: "What only Rhitmo does",
    uspTitle1: "AI that writes (doesn't just suggest)",
    uspText1: "Others give \"suggestions.\" Rhitmo writes the full review based on all your 1:1s. You just review it.",
    uspTitle2: "Real-time bias detection",
    uspText2: "As you write, Rhitmo flags biased language. It's not post-review analysis. It's prevention.",
    uspTitle3: "Automatic transcription",
    uspText3: "Record your 1:1s. Rhitmo transcribes, analyzes, and logs everything automatically. You never forget what was said.",
    uspCTA: "See Rhitmo in Action",
    forLeaders: "For Leaders",
    leadersTitle: "Automate the busywork. Lead with confidence.",
    leadersP1: "Rhitmo turns scattered notes into complete performance reviews. No more spending 4 hours copy-pasting from spreadsheets. 30 seconds and you have a ready draft.",
    leadersP2: "Automatic insights decode each report's work style. Forgot the January 1:1? The AI remembers. Everything becomes evidence at review time.",
    forReports: "For Direct Reports",
    reportsTitle: "Fair reviews. No career surprises.",
    reportsP1: "Women receive 38x more negative feedback than men. Rhitmo detects bias and ensures all your contributions are remembered. Based on facts, not your manager's recent memory.",
    reportsP2: "Get personalized development plans with the exact path to the next level. Reviews become a lever, not bureaucracy.",
    forHR: "For HR",
    hrTitle: "Scale the culture. Eliminate the operational bottleneck.",
    hrP1: "Your managers spend 4h per review. With Rhitmo, it's 2 minutes. That's hundreds of hours returned per review cycle, without losing quality.",
    hrP2: "Personalized coaching in the flow of work, full visibility into team health metrics. Measurable ROI, not consulting promises.",
    pricingTitle: "Simple. Transparent.",
    pricingSubtitle: "Start free. Scale when your team grows.",
    pulseSubtitle: "For the leader who wants to start tracking and developing their team.",
    pulseFree: "Free",
    pulseForever: "· forever",
    pulseCTA: "Get started free",
    pulseFeatures: [
      "Up to 3 direct reports",
      "20 Mentor Chat messages per month",
      "Unlimited notes and annotations",
      "1 formal review per month",
      "1 team",
    ],
    pulseLocked: [
      "My Rhitmo for direct reports",
      "Meeting recording",
      "Full analytics",
    ],
    proSubtitle: "For leaders managing up to 5 people who want to develop each one with intention.",
    proPerMonth: "/leader/mo",
    proNote: "14-day free trial · cancel anytime",
    proCTA: "Start your 14-day free trial",
    proBadge: "Most popular",
    proFeatures: [
      "Up to 5 direct reports",
      "Unlimited Mentor Chat",
      "Unlimited notes and annotations",
      "Unlimited formal reviews",
      "My Rhitmo for your direct reports",
      "Meeting recording (up to 4h/month)",
      "Full analytics",
      "Up to 3 teams",
    ],
    businessSubtitle: "For companies that want a consistent feedback culture across all teams.",
    businessPerMonth: "/leader/mo",
    businessNote: "Minimum 3 leaders · R$207/mo",
    businessCTA: "Talk to our team",
    businessFeatures: [
      "Up to 8 direct reports per leader",
      "Everything in Pro",
      "Unlimited teams",
      "Meeting recording (up to 8h/month)",
      "HR Dashboard with aggregated metrics",
      "Assisted onboarding",
      "Priority support",
    ],
    mentorChatLabel: "Direct report: Maria Santos",
    chatQuestion: "How to give feedback about tardiness without demotivating?",
    chatAnswer: "Based on Maria's profile, I suggest an empathetic approach. Start by acknowledging her positive contributions...",
    chatPlaceholder: "How can I help you today?",
    heroAlt: "Leader working calmly and in control in a minimalist environment",
    duoAlt: "Leader and direct report in a constructive feedback conversation looking at a tablet",
    analyticsAlt: "Analytics Dashboard - Rhitmo",
    footerRights: "© 2026 Rhitmo. All rights reserved.",
    footerLogin: "Already have an account? Sign in",
    footerTerms: "Terms of Service",
    footerPrivacy: "Privacy Policy",
    launchBadge: "Launch Price",
    launchDisclaimer: "Launch price guaranteed while your subscription is active.",
    enterpriseNav: "Enterprise",
    enterpriseSubtitle: "For structured companies with 100+ employees who want truly native AI.",
    enterprisePrice: "Starting at R$15",
    enterprisePer: "/employee/mo",
    enterpriseNote: "Minimum 100 employees · annual contract",
    enterpriseCTA: "Talk to Sales",
    enterpriseFeatures: [
      "Everything in Business",
      "SSO and custom API",
      "Dedicated CSM",
      "Guaranteed SLA",
      "White-glove onboarding",
      "Enterprise integrations (SAP, TOTVS)",
    ],
    footerCompare: "Compare",
    footerVsQulture: "Rhitmo vs. Qulture.Rocks",
    footerVsFeedz: "Rhitmo vs. Feedz",
    footerVsLattice: "Rhitmo vs. Lattice",
    // Phase 3
    forWhoOverline: "Built for you",
    forWhoTitle: "Who uses Rhitmo and why.",
    forWhoLeaderTitle: "Individual Leaders",
    forWhoLeaderText: "You lead 3 to 10 people. No time to write reviews from scratch. You need a copilot that records everything and delivers the draft ready.",
    forWhoLeaderBadge: "Use case #1",
    forWhoPmeTitle: "Startups & SMBs",
    forWhoPmeText: "20-100 employees, no structured HR. You want to professionalize performance management without hiring $50k consultants.",
    forWhoPmeBadge: "Fast growth",
    forWhoEntTitle: "Structured companies",
    forWhoEntText: "100+ employees. HR as the buyer. Needs truly native AI, not a marketing checkbox.",
    forWhoEntBadge: "Enterprise Plan",
    forWhoEntLink: "Learn more →",
    howItWorksTitle: "How it works",
    howStep1Title: "Record your 1:1s",
    howStep1Text: "Record meetings or paste transcriptions. Rhitmo captures everything automatically.",
    howStep2Title: "AI analyzes and organizes",
    howStep2Text: "Each conversation becomes a structured note with themes, commitments, and bias alerts.",
    howStep3Title: "Review ready in 30 seconds",
    howStep3Text: "Select the period, click 'Generate'. Rhitmo writes the full review. You just review it.",
    whatWeAreNotTitle: "Honest communication: what Rhitmo doesn't do (yet)",
    whatWeAreNotIntro: "Rhitmo is not a generic HR platform. We specialize in AI for reviews and 1:1s. Here's what we DON'T have today:",
    whatWeAreNotItems: [
      "360° review (planned for Q3/2026)",
      "Full OKRs (we have basic goals, OKRs coming Q4/2026)",
      "Employee engagement surveys (roadmap 2027)",
    ],
    whatWeAreNotOutro: "If you need these features TODAY, we recommend using Qulture.Rocks or Lattice for that, and Rhitmo for what we do best: AI that writes reviews, detects bias, and records everything automatically. Many clients use Rhitmo + another tool. We're OK with that.",
    whatWeAreNotCTA: "See our public roadmap →",
    positioningLine1: "Rhitmo is not just another HR platform.",
    positioningLine2: "It's the AI Chief of Staff that writes reviews, detects bias, and records everything automatically.",
    positioningLine3: "We don't do everything. We do one thing exceptionally well: turn conversations into ready-made performance reviews.",
    positioningCTA: "That's our mission. Join us →",
    faqTitle: "Frequently asked questions",
    faqItems: [
      { q: "Does Rhitmo replace tools like Qulture.Rocks?", a: "Not completely. If you need 360° or engagement surveys today, use Qulture + Rhitmo. If you only need better reviews and 1:1s, just use Rhitmo." },
      { q: "Does the AI really write everything or just suggest?", a: "It writes everything. You get a full 2-3 page draft. Not bullet points, ready-to-review prose." },
      { q: "How does Rhitmo detect bias?", a: "AI analyzes language in real time and flags: gender bias (e.g., \"aggressive\" vs. \"assertive\"), personality bias (focus on \"who they are\" vs. \"what they did\"), generalizations (\"always\", \"never\")." },
      { q: "Do I need to train my team to use it?", a: "No. The interface is self-explanatory. Most users start using it in under 5 minutes." },
      { q: "Is my data secure?", a: "Yes. Leader notes are private by default. Sharing is an explicit action. We follow security best practices and LGPD compliance." },
    ],
  },
};

type Translations = typeof translations.pt;

// ============== COMPONENTES DE VISUAL ==============

const ComparisonIcon = ({ status }: { status: string }) => {
  if (status === "yes") return <span className="text-primary font-bold">✅</span>;
  if (status === "partial") return <span className="text-yellow-500">~</span>;
  return <span className="text-muted-foreground">❌</span>;
};

// Browser Frame - Janela estilo macOS
const BrowserFrame = ({
  children,
  wide = false
}: {
  children: React.ReactNode;
  wide?: boolean;
}) => <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
    
    <div className={cn("relative bg-card rounded-xl border shadow-xl overflow-hidden", wide ? "aspect-[16/9] lg:aspect-[2/1]" : "aspect-video")}>
      {/* Header macOS */}
      <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      {/* Content */}
      <div className="h-[calc(100%-36px)]">
        {children}
      </div>
    </div>
  </div>;

// Image Placeholder - Área para upload de imagem
const ImagePlaceholder = ({
  label
}: {
  label: string;
}) => <div className="w-full h-full bg-muted/50 flex items-center justify-center">
    <div className="text-center space-y-2 px-4">
      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>;

// Human Image Container - Foto humana com glow
const HumanImageContainer = ({
  children
}: {
  children: React.ReactNode;
}) => <div className="relative">
    {/* Glow suave */}
    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/15 to-primary/15 rounded-3xl blur-2xl opacity-60" />
    
    <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] max-w-sm mx-auto">
      {children}
    </div>
  </div>;

// ============== MOCKUP SIMPLIFICADO ==============

const SimpleChatMockup = ({ t }: { t: Translations }) => <div className="bg-card h-full overflow-hidden">
    {/* Header */}
    <div className="px-5 py-4 border-b flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="font-medium text-sm">Mentor Chat</div>
        <div className="text-xs text-muted-foreground">{t.mentorChatLabel}</div>
      </div>
    </div>
    
    {/* Messages */}
    <div className="p-5 space-y-4 min-h-[180px]">
      {/* User */}
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[75%]">
          {t.chatQuestion}
        </div>
      </div>
      
      {/* AI */}
      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[80%]">
          <span className="text-primary">✨</span> {t.chatAnswer}
        </div>
      </div>
    </div>
    
    {/* Input */}
    <div className="px-5 py-4 border-t">
      <div className="bg-muted rounded-full flex items-center px-4 py-2.5">
        <span className="text-sm text-muted-foreground flex-1">
          {t.chatPlaceholder}
        </span>
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Send className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>
    </div>
  </div>;

// ============== MAIN COMPONENT ==============

const Landing = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();

  const [landingTheme, setLandingTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [lang, setLang] = useState<'pt' | 'en'>(() => {
    const saved = localStorage.getItem('rhitmo-lang');
    if (saved === 'pt' || saved === 'en') return saved;
    const browserLang = navigator.language || navigator.languages?.[0] || 'pt';
    return browserLang.startsWith('pt') ? 'pt' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('rhitmo-lang', lang);
  }, [lang]);

  const t = translations[lang];

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', landingTheme === 'dark');
    localStorage.setItem('theme', landingTheme);
    return () => {
      // Let ThemeProvider take over on unmount
    };
  }, [landingTheme]);

  const toggleTheme = () => setLandingTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", {
        replace: true
      });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>;
  }
  if (user) return null;

  return <div className="transition-colors duration-300">
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>

          {/* Desktop: Botões normais */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleTheme}>
              {landingTheme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
              <span className="sr-only">{t.toggleTheme}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Globe className="h-[18px] w-[18px]" />
                  <span className="sr-only">Language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')} className="gap-2">
                  🇧🇷 Português
                  {lang === 'pt' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')} className="gap-2">
                  🇺🇸 English
                  {lang === 'en' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/enterprise">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.enterpriseNav}
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.signIn}
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="min-h-[44px]">
                {t.getStarted}
              </Button>
            </Link>
          </div>

          {/* Mobile: Hamburger menu */}
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" className="rounded-full h-11 w-11" onClick={toggleTheme}>
              {landingTheme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
              <span className="sr-only">{t.toggleTheme}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-11 w-11">
                  <Globe className="h-[18px] w-[18px]" />
                  <span className="sr-only">Language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')} className="gap-2">
                  🇧🇷 Português
                  {lang === 'pt' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')} className="gap-2">
                  🇺🇸 English
                  {lang === 'en' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
            <SheetContent side="right" className="w-[280px] pt-12">
              <nav className="flex flex-col gap-4">
                <SheetClose asChild>
                  <Link to="/enterprise">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.enterpriseNav}
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.signIn}
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/auth?mode=signup">
                    <Button className="w-full min-h-[44px]">
                      {t.getStarted}
                    </Button>
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-background to-muted/30 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <RhythmWave variant="hero" height={140} className="opacity-80" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Coluna Esquerda - Texto */}
            <div className="space-y-6 text-left">
              {/* AI-Native Badge */}
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  {t.aiNativeBadge}
                </span>
              </div>

              <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground">
                {t.heroTitle}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>
              
              <div className="pt-4 flex flex-wrap gap-3">
                <Button size="lg" className="text-base px-8 rounded-xl" onClick={() => navigate('/auth?mode=signup')}>
                  {t.getStarted}
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 rounded-xl" asChild>
                  <a href="#pricing">{t.seePlans}</a>
                </Button>
              </div>
            </div>
            
            {/* Coluna Direita - Imagem Premium */}
            <div className="relative">
              {/* Glow effect sutil */}
              <div className="absolute -inset-6 bg-gradient-to-r from-primary/15 to-primary/10 rounded-3xl blur-3xl opacity-30" />
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/30 hover:shadow-xl transition-all duration-500">
                <img src={heroLeaderFlow} alt={t.heroAlt} className="w-full h-full object-cover aspect-[4/3]" />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <WaveDivider className="bg-background" />

      {/* Seção: Antes vs. Depois — Split Timeline */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary text-center mb-3">{t.beforeAfterOverline}</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-center mb-4 text-foreground">
            {t.beforeAfterTitle}
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
            {lang === 'pt' ? 'Veja o que muda quando IA assume o trabalho operacional.' : 'See what changes when AI takes over the busywork.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-5xl mx-auto">
            {/* Sem Rhitmo — Lado escuro */}
            <div className="bg-muted rounded-2xl md:rounded-r-none p-8 lg:p-10 border border-destructive/10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t.withoutRhitmo}</h3>
              </div>
              <ul className="space-y-4">
                {t.beforeItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-destructive/60 mt-1 shrink-0" />
                    <span className="text-muted-foreground leading-relaxed text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Com Rhitmo — Lado claro + primary */}
            <div className="bg-gradient-to-br from-primary/5 to-emerald-500/5 rounded-2xl md:rounded-l-none p-8 lg:p-10 border border-primary/20 space-y-6 relative">
              {/* Arrow indicator between cards - desktop only */}
              <div className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg z-10">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{t.withRhitmo}</h3>
              </div>
              <ul className="space-y-4">
                {t.afterItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span className="text-foreground leading-relaxed text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Vídeo Demo */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            
            {/* Título */}
            <div className="space-y-3">
              <p className="uppercase text-xs font-semibold tracking-widest text-primary">{lang === 'pt' ? 'Demonstração' : 'Demo'}</p>
              <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{t.videoTitle}</h2>
              <p className="text-lg text-muted-foreground">
                {t.videoSubtitle}
              </p>
            </div>
            
            {/* Vídeo YouTube Embed */}
            <div className="relative">
              {/* Glow effect sutil */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-3xl blur-2xl opacity-50" />
              
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <iframe className="w-full aspect-video" src="https://www.youtube.com/embed/bRQiwrBGlsc" title="Rhitmo - Tour Completo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Seção: Rhitmo vs. Outros — Feature Showdown */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary text-center mb-3">{t.comparisonOverline}</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-center mb-4 text-foreground">
            {t.comparisonTitle}
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
            {lang === 'pt' ? 'Funcionalidades reais, não promessas de roadmap.' : 'Real features, not roadmap promises.'}
          </p>

          {/* Desktop: Premium Table */}
          <div className="hidden md:block max-w-5xl mx-auto">
            <div className="rounded-2xl border overflow-hidden shadow-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b-2">
                    <TableHead className="font-bold text-foreground py-5 pl-6">{t.compFeature}</TableHead>
                    <TableHead className="text-center text-muted-foreground py-5">{t.compSpreadsheets}</TableHead>
                    <TableHead className="text-center text-muted-foreground py-5">{t.compQulture}</TableHead>
                    <TableHead className="text-center text-muted-foreground py-5">{t.compLattice}</TableHead>
                    <TableHead className="text-center font-bold py-5 bg-primary text-primary-foreground rounded-t-none">{t.compRhitmo}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.compRows.map((row, i) => (
                    <TableRow key={row.feature} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell className="font-medium text-foreground py-4 pl-6">{row.feature}</TableCell>
                      <TableCell className="text-center py-4"><ComparisonIcon status={row.spreadsheets} /></TableCell>
                      <TableCell className="text-center py-4"><ComparisonIcon status={row.qulture} /></TableCell>
                      <TableCell className="text-center py-4"><ComparisonIcon status={row.lattice} /></TableCell>
                      <TableCell className="text-center py-4 bg-primary/5 border-x border-primary/10"><ComparisonIcon status={row.rhitmo} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-6">{t.compLegend}</p>
          </div>

          {/* Mobile: Accordion cards */}
          <div className="md:hidden max-w-lg mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {t.compRows.map((row, i) => (
                <AccordionItem key={i} value={`comp-${i}`} className="border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    {row.feature}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-3 text-sm py-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.compSpreadsheets}</span> <ComparisonIcon status={row.spreadsheets} /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.compQulture}</span> <ComparisonIcon status={row.qulture} /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.compLattice}</span> <ComparisonIcon status={row.lattice} /></div>
                      <div className="flex justify-between rounded-lg bg-primary/5 px-2 py-1"><span className="font-medium text-primary">{t.compRhitmo}</span> <ComparisonIcon status={row.rhitmo} /></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="text-sm text-muted-foreground text-center mt-4">{t.compLegend}</p>
          </div>
        </div>
      </section>

      {/* Seção: Números Concretos */}
      <section className="py-28 bg-gradient-to-br from-muted/30 to-primary/5">
        <div className="container mx-auto px-4">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary text-center mb-3">{t.numbersOverline}</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-center mb-4 text-foreground">
            {t.numbersTitle}
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
            {lang === 'pt' ? 'Resultados reais de quem já usa Rhitmo no dia a dia.' : 'Real results from leaders who already use Rhitmo daily.'}
          </p>

          {/* Bento Grid — Hero card + 2 secondary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Hero Card — spans 2 cols */}
            <div className="md:col-span-2 bg-card rounded-2xl p-10 lg:p-12 border-l-4 border-l-primary border shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <span className="uppercase text-xs font-semibold tracking-widest text-primary">{lang === 'pt' ? 'Produtividade' : 'Productivity'}</span>
              </div>
              <div className="font-serif text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-4">{t.numbersStat1}</div>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">{t.numbersLabel1}</p>
            </div>

            {/* Secondary Cards — stacked */}
            <div className="flex flex-col gap-6">
              <div className="bg-card rounded-2xl p-8 border-l-4 border-l-destructive border shadow-md hover:shadow-lg transition-all duration-300 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <span className="uppercase text-xs font-semibold tracking-widest text-destructive">{lang === 'pt' ? 'Equidade' : 'Equity'}</span>
                </div>
                <div className="font-serif text-4xl font-bold tracking-tight text-foreground mb-2">{t.numbersStat2}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.numbersLabel2}</p>
              </div>
              <div className="bg-card rounded-2xl p-8 border-l-4 border-l-primary border shadow-md hover:shadow-lg transition-all duration-300 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <span className="uppercase text-xs font-semibold tracking-widest text-primary">{lang === 'pt' ? 'Economia' : 'Savings'}</span>
                </div>
                <div className="font-serif text-4xl font-bold tracking-tight text-foreground mb-2">{t.numbersStat3}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.numbersLabel3}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 1: Para Líderes - Fundo Branco */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                {t.forLeaders}
              </div>
              <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t.leadersTitle}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>{t.leadersP1}</p>
                <p>{t.leadersP2}</p>
              </div>
            </div>
            
            {/* Visual - Browser Frame com Mentor Chat */}
            <div>
              <BrowserFrame>
                <SimpleChatMockup t={t} />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Para Pessoas Lideradas - Fundo Cinza Suave */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Visual - Foto Humana (emoção) */}
            <div className="md:order-1 order-2">
              <HumanImageContainer>
                <div className="relative w-full h-full">
                  <img src={heroDuoFeedback} alt={t.duoAlt} className="w-full h-full object-cover rounded-2xl" />
                </div>
              </HumanImageContainer>
            </div>
            
            {/* Texto - Direita em desktop */}
            <div className="space-y-6 md:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium">
                <Heart className="h-4 w-4" />
                {t.forReports}
              </div>
              <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t.reportsTitle}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>{t.reportsP1}</p>
                <p>{t.reportsP2}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Para RH - Fundo Branco */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 text-sm font-medium">
                <BarChart className="h-4 w-4" />
                {t.forHR}
              </div>
              <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t.hrTitle}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>{t.hrP1}</p>
                <p>{t.hrP2}</p>
              </div>
            </div>
            
            {/* Visual - Browser Frame Wide com Analytics */}
            <div>
              <BrowserFrame wide>
                <img src={analyticsScreenshot} alt={t.analyticsAlt} className="w-full h-full object-cover object-top" />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Para quem é Rhitmo — Persona Cards */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary text-center mb-3">{t.forWhoOverline}</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-center mb-4 text-foreground">
            {t.forWhoTitle}
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
            {lang === 'pt' ? 'Três perfis, uma plataforma. Encontre o seu.' : 'Three profiles, one platform. Find yours.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Líder — Card em destaque */}
            <div className="bg-card rounded-2xl border-2 border-primary p-8 lg:p-10 shadow-lg relative flex flex-col">
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full">{t.forWhoLeaderBadge}</span>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t.forWhoLeaderTitle}</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.forWhoLeaderText}</p>
              <Button className="w-full rounded-xl mt-6" onClick={() => navigate('/auth?mode=signup')}>
                {lang === 'pt' ? 'Começar grátis' : 'Get started free'}
              </Button>
            </div>

            {/* PME */}
            <div className="bg-card rounded-2xl border p-8 shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative flex flex-col">
              <span className="absolute -top-3 left-6 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">{t.forWhoPmeBadge}</span>
              <div className="w-14 h-14 rounded-full bg-accent/50 flex items-center justify-center mb-5">
                <Users className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t.forWhoPmeTitle}</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.forWhoPmeText}</p>
              <Button variant="outline" className="w-full rounded-xl mt-6" onClick={() => navigate('/auth?mode=signup')}>
                {lang === 'pt' ? 'Começar grátis' : 'Get started free'}
              </Button>
            </div>

            {/* Enterprise */}
            <div className="bg-card rounded-2xl border p-8 shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative flex flex-col">
              <span className="absolute -top-3 left-6 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full border">{t.forWhoEntBadge}</span>
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                <Building className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{t.forWhoEntTitle}</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">{t.forWhoEntText}</p>
              <Button variant="outline" className="w-full rounded-xl mt-6" asChild>
                <Link to="/enterprise">
                  {t.forWhoEntLink} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>




      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary text-center mb-3">FAQ</p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-center mb-12 text-foreground">
            {t.faqTitle}
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {t.faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-6 bg-card">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Pricing Section */}
      <WaveDivider className="bg-background" />
      <section id="pricing" className="py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center space-y-3 mb-16">
            <p className="uppercase text-xs font-semibold tracking-widest text-primary">{lang === 'pt' ? 'Planos' : 'Plans'}</p>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {t.pricingTitle}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.pricingSubtitle}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* ── Pulse ── */}
            <div className="bg-card rounded-2xl shadow-md p-8 border flex flex-col hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Pulse</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.pulseSubtitle}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{t.pulseFree}</span>
                <span className="text-sm text-muted-foreground ml-1">{t.pulseForever}</span>
              </div>

              <Button className="w-full min-h-[44px] mb-6" onClick={() => navigate('/auth?mode=signup')}>
                {t.pulseCTA}
              </Button>

              <ul className="space-y-3 flex-1">
                {t.pulseFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {t.pulseLocked.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground opacity-50">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Pro (destacado) ── */}
            <div className="relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                  {t.proBadge}
                </span>
              </div>
              <div className="bg-card rounded-2xl shadow-lg p-8 border-2 border-primary flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">Pro</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t.proSubtitle}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full px-3 py-1 text-xs font-medium inline-block mb-2">{t.launchBadge}</span>
                  <div>
                    <span className="text-4xl font-bold text-foreground">R$49</span>
                    <span className="text-sm text-muted-foreground ml-1">{t.proPerMonth}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.proNote}</p>
                </div>

                <Button className="w-full min-h-[44px] mb-6" onClick={() => navigate('/auth?mode=signup&plan=pro')}>
                  {t.proCTA}
                </Button>

                <ul className="space-y-3 flex-1">
                  {t.proFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Business ── */}
            <div className="bg-card rounded-2xl shadow-md p-8 border flex flex-col hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Business</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.businessSubtitle}
                </p>
              </div>

              <div className="mb-6">
                <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full px-3 py-1 text-xs font-medium inline-block mb-2">{t.launchBadge}</span>
                <div>
                  <span className="text-4xl font-bold text-foreground">R$69</span>
                  <span className="text-sm text-muted-foreground ml-1">{t.businessPerMonth}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.businessNote}</p>
              </div>

              <Button variant="outline" className="w-full min-h-[44px] mb-6" asChild>
                <a href="mailto:matheus@rhitmo.co">{t.businessCTA}</a>
              </Button>

              <ul className="space-y-3 flex-1">
                {t.businessFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Enterprise ── */}
            <div className="bg-card rounded-2xl shadow-md p-8 border flex flex-col hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 bg-primary/10 text-primary">
                  <Building className="h-3 w-3" />
                  Enterprise
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Enterprise</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.enterpriseSubtitle}
                </p>
              </div>

              <div className="mb-6">
                <div>
                  <span className="text-3xl font-bold text-foreground">{t.enterprisePrice}</span>
                  <span className="text-sm text-muted-foreground ml-1">{t.enterprisePer}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.enterpriseNote}</p>
              </div>

              <Button variant="outline" className="w-full min-h-[44px] mb-6" asChild>
                <Link to="/enterprise">{t.enterpriseCTA}</Link>
              </Button>

              <ul className="space-y-3 flex-1">
                {t.enterpriseFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">{t.launchDisclaimer}</p>
        </div>
      </section>

      {/* Footer */}
      <WaveDivider className="bg-muted/30" />
      <footer className="bg-muted/30 py-12 pb-20">
        <div className="container mx-auto px-4 text-center space-y-6">
          <RhitmoLogo size="sm" className="mx-auto text-primary" />
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
              {t.footerTerms}
            </Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
              {t.footerPrivacy}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.footerRights}
          </p>
          <Link to="/auth" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors inline-block">
            {t.footerLogin}
          </Link>
        </div>
      </footer>

      
    </div>
  </div>;
};
export default Landing;
