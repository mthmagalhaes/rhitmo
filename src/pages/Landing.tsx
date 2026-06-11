import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { RhythmWave } from "@/components/RhythmWave";
import { WaveDivider } from "@/components/WaveDivider";

import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Zap, Heart, BarChart, Sparkles, Send, Loader2, ImageIcon, Menu, X, Check, Moon, Sun, Globe, Building, Clock, AlertCircle, DollarSign, Shield, Mic, XCircle, CheckCircle2, Target, Users, FileText, ArrowRight } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
    comparisonTitle: "Você já sabe que precisa mudar.",
    compFeature: "Recurso",
    compSpreadsheets: "Planilhas",
     compQulture: "Plataformas nacionais",
     compLattice: "Plataformas globais",
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
    numbersLabel2: (<>Mulheres <span className="highlight-marker--destructive">recebem 38x mais feedback sobre personalidade do que homens</span>. Rhitmo detecta e corrige antes que você publique.</>),
    numbersStat3: "60%",
    numbersLabel3: (<>Em grandes empresas, avaliações tradicionais <span className="highlight-marker">custam até US$ 35 milhões</span> por ano. <span className="highlight-marker">E 95% dos gestores</span> estão insatisfeitos com o resultado. Rhitmo corta o custo e entrega precisão.</>),
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
    pricingSubtitle: "Sem plano mensal. A mudança de cultura na liderança exige no mínimo 90 dias de consistência.",
    pricingTooltip: "Por que não temos plano mensal? Porque a ciência comportamental mostra que cultura de feedback só se firma após 90 dias de prática consistente. Cobramos pelo ciclo de valor — não pelo mês.",
    cycleQuarterly: "Trimestral",
    cycleSemiannual: "Semestral",
    cycleAnnual: "Anual",
    cycleAnnualBadge: "Melhor valor",
    perCyclePeriodQuarterly: "/trimestre",
    perCyclePeriodSemiannual: "/semestre",
    perCyclePeriodAnnual: "/ano",
    equivPerMonthLabel: "Equivale a",
    perMonthShort: "/mês",
    // Pulse
    pulseSubtitle: "Para o líder que quer começar a registrar e desenvolver seu time.",
    pulseFree: "Grátis",
    pulseForever: "· para sempre",
    pulseCTA: "Começar grátis",
    pulseFeatures: [
      "Diário de bordo ilimitado",
      "Mentor AI — até 20 conversas por mês",
      "1 avaliação com IA por mês",
      "Notas e registros ilimitados",
      "Até 2 liderados diretos",
    ],
    // Pro
    proSubtitle: "Para líderes que querem operar no rítmo certo: liderados ilimitados, com IA em todas as etapas.",
    proNote: "Cobrança única por ciclo · cancele a qualquer momento",
    proCTA: "Começar agora",
    proBadge: "Mais popular",
    proFeatures: [
      {
        groupLabel: "Ciclo de Performance",
        items: [
          { label: "Diário de bordo + resumo mensal automático", isNew: true },
          { label: "Acompanhamento trimestral guiado por IA", isNew: true },
          { label: "Avaliações formais com evidências citadas" },
        ],
      },
      {
        groupLabel: "Ferramentas de Apoio",
        items: [
          { label: "Transcrição automática de reuniões — 30h/mês" },
          { label: "Pre-meeting briefs com contexto histórico" },
          { label: "Detecção de viés em tempo real" },
          { label: "Mentor AI ilimitado" },
          { label: "Time acessa feedbacks e metas em tempo real" },
          { label: "Analytics completo · Times ilimitados" },
          { label: "Liderados ilimitados" },
        ],
      },
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
    pricingAnchor: "Comece grátis. Escale quando fizer sentido.",
    pricingTrustLine: "Sem cartão de crédito para começar · Cancele quando quiser · Preço de lançamento garantido enquanto sua assinatura estiver ativa",
    proSocialProof: "Usado por líderes de times de tecnologia, saúde e serviços no Brasil",
    enterpriseFloor: "A partir de 50 colaboradores · mínimo R$ 750/mês",
    newBadge: "Novo",
    // Enterprise / Corporate
    enterpriseNav: "Enterprise",
    featuresNav: "Recursos",
    pricingNav: "Preços",
    faqNav: "FAQ",
    enterpriseSubtitle: "Para a organização inteira: HR Dashboard, blindagem jurídica, integrações HRIS e SSO.",
    enterpriseImpact: "Ciclo completo de performance para toda a organização — calibração entre gestores, blindagem jurídica e visibilidade do RH em tempo real.",
    enterprisePrice: "Sob consulta",
    enterprisePer: "· faturamento anual",
    enterpriseNote: "Cobrança exclusivamente anual · proposta personalizada",
    enterpriseCTA: "Fale com Vendas",
    enterpriseFeatures: [
      "Tudo do Pro, para toda a organização",
      "HR Dashboard com radar de risco e heatmap",
      "Calibração entre gestores automatizada",
      "Dossiê de blindagem jurídica (trilha de auditoria)",
      "Integração com sistemas de RH (HRIS)",
      "SSO (Single Sign-On)",
      "Gerente de sucesso dedicado e SLA garantido",
    ],
    // Footer comparisons
    footerCompare: "Compare",
     footerVsQulture: "Rhitmo vs. Plataformas nacionais",
     footerVsFeedz: "Rhitmo vs. Ferramentas tradicionais",
     footerVsLattice: "Rhitmo vs. Plataformas globais",
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
    whatWeAreNotOutro: "Se você precisa dessas features HOJE, recomendamos usar uma plataforma de RH tradicional para isso, e Rhitmo para o que fazemos melhor: IA que escreve reviews, detecta viés e registra tudo automaticamente. Muitos clientes usam Rhitmo + outra ferramenta. Estamos OK com isso.",
    whatWeAreNotCTA: "Ver nosso roadmap público →",
    positioningLine1: "Rhitmo não é mais uma plataforma de RH.",
    positioningLine2: "É o AI Chief of Staff que escreve reviews, detecta vieses e registra tudo automaticamente.",
    positioningLine3: "Não fazemos de tudo. Fazemos uma coisa excepcionalmente bem: transformar conversas em performance reviews prontas.",
    positioningCTA: "Essa é a nossa missão. Junte-se a nós →",
    faqTitle: "Perguntas frequentes",
    faqItems: [
      { q: "Rhitmo substitui plataformas de RH tradicionais?", a: "Não completamente. Se você precisa de 360° ou pesquisa de clima hoje, use sua plataforma atual + Rhitmo. Se precisa só de reviews e 1:1s melhores, use só Rhitmo." },
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
    comparisonTitle: "You already know you need to change.",
    compFeature: "Feature",
    compSpreadsheets: "Spreadsheets",
     compQulture: "National platforms",
     compLattice: "Global platforms",
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
    numbersLabel2: (<>Women <span className="highlight-marker--destructive">receive 38x more personality feedback than men</span>. Rhitmo detects and corrects before you publish.</>),
    numbersStat3: "60%",
    numbersLabel3: (<>In large companies, traditional reviews <span className="highlight-marker">cost up to $35 million</span> per year. <span className="highlight-marker">And 95% of managers</span> are dissatisfied with the results. Rhitmo cuts costs and delivers precision.</>),
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
    pricingSubtitle: "No monthly plan. Building a real feedback culture requires at least 90 days of consistency.",
    pricingTooltip: "Why no monthly plan? Behavioral science shows leadership culture only takes hold after 90 days of consistent practice. We bill by value cycle — not by month.",
    cycleQuarterly: "Quarterly",
    cycleSemiannual: "Semiannual",
    cycleAnnual: "Annual",
    cycleAnnualBadge: "Best value",
    perCyclePeriodQuarterly: "/quarter",
    perCyclePeriodSemiannual: "/semester",
    perCyclePeriodAnnual: "/year",
    equivPerMonthLabel: "Equivalent to",
    perMonthShort: "/mo",
    pulseSubtitle: "For the leader who wants to start tracking and developing their team.",
    pulseFree: "Free",
    pulseForever: "· forever",
    pulseCTA: "Get started free",
    pulseFeatures: [
      "Unlimited journal",
      "Mentor AI — up to 20 conversations per month",
      "1 AI review per month",
      "Unlimited notes and records",
      "Up to 2 direct reports",
    ],
    proSubtitle: "For leaders who want to operate at the right rhythm: unlimited direct reports, AI at every step.",
    proNote: "One charge per cycle · cancel anytime",
    proCTA: "Get started",
    proBadge: "Most popular",
    proFeatures: [
      {
        groupLabel: "Performance Cycle",
        items: [
          { label: "Journal + automatic monthly recap", isNew: true },
          { label: "Quarterly AI-guided performance reviews", isNew: true },
          { label: "Formal reviews with cited evidence" },
        ],
      },
      {
        groupLabel: "Support Tools",
        items: [
          { label: "Automatic meeting transcription — 30h/month" },
          { label: "Pre-meeting briefs with historical context" },
          { label: "Real-time bias detection" },
          { label: "Unlimited Mentor AI" },
          { label: "Your team accesses feedback and goals in real time" },
          { label: "Full analytics · Unlimited teams" },
          { label: "Unlimited direct reports" },
        ],
      },
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
    pricingAnchor: "Start free. Scale when it makes sense.",
    pricingTrustLine: "No credit card to start · Cancel anytime · Launch price guaranteed while your subscription is active",
    proSocialProof: "Used by leaders in tech, healthcare, and services teams in Brazil",
    enterpriseFloor: "Starting at 50 employees · minimum R$ 750/month",
    newBadge: "New",
    enterpriseNav: "Enterprise",
    featuresNav: "Features",
    pricingNav: "Pricing",
    faqNav: "FAQ",
    enterpriseSubtitle: "For the entire organization: HR Dashboard, legal protection dossier, HRIS integration and SSO.",
    enterpriseImpact: "Complete performance cycle for the entire organization — cross-manager calibration, legal protection, and real-time HR visibility.",
    enterprisePrice: "Custom",
    enterprisePer: "· annual billing",
    enterpriseNote: "Annual billing only · tailored proposal",
    enterpriseCTA: "Talk to Sales",
    enterpriseFeatures: [
      "Everything in Pro, for the whole organization",
      "HR Dashboard with risk radar and heatmap",
      "Automated cross-manager calibration",
      "Legal protection dossier (audit trail)",
      "HRIS integration",
      "SSO (Single Sign-On)",
      "Dedicated success manager and guaranteed SLA",
    ],
     footerCompare: "Compare",
     footerVsQulture: "Rhitmo vs. National platforms",
     footerVsFeedz: "Rhitmo vs. Traditional tools",
     footerVsLattice: "Rhitmo vs. Global platforms",
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
    whatWeAreNotOutro: "If you need these features TODAY, we recommend using a traditional HR platform for that, and Rhitmo for what we do best: AI that writes reviews, detects bias, and records everything automatically. Many clients use Rhitmo + another tool. We're OK with that.",
    whatWeAreNotCTA: "See our public roadmap →",
    positioningLine1: "Rhitmo is not just another HR platform.",
    positioningLine2: "It's the AI Chief of Staff that writes reviews, detects bias, and records everything automatically.",
    positioningLine3: "We don't do everything. We do one thing exceptionally well: turn conversations into ready-made performance reviews.",
    positioningCTA: "That's our mission. Join us →",
    faqTitle: "Frequently asked questions",
    faqItems: [
      { q: "Does Rhitmo replace traditional HR platforms?", a: "Not completely. If you need 360° or engagement surveys today, use your current platform + Rhitmo. If you only need better reviews and 1:1s, just use Rhitmo." },
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
        <div className="font-medium text-sm">Rhitmo</div>
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

// ============== PRICING SECTION (Windmill v3 — single card per-seat) ==============
// Pricing v3 — 08/05/2026: 1 plano único.
// Líder + 3 liderados grátis. R$ 49,90/liderado a partir do 4º.
// Anual: R$ 39,90/liderado/mês (cobrado anualmente, 16% off).

type SeatCycle = 'monthly' | 'annual';

const PricingSection = ({
  t,
  lang,
  navigate,
}: {
  t: any;
  lang: 'pt' | 'en';
  navigate: (to: string) => void;
}) => {
  const [cycle, setCycle] = useState<SeatCycle>('annual');

  const headlinePrice = cycle === 'annual' ? 'R$ 39,90' : 'R$ 49,90';
  const headlineSuffix = lang === 'pt' ? '/liderado / mês' : '/seat / month';
  const headlineSub =
    cycle === 'annual'
      ? lang === 'pt'
        ? 'Cobrado anualmente (R$ 478,80/liderado/ano). 16% off.'
        : 'Billed annually (R$ 478.80/seat/year). 16% off.'
      : lang === 'pt'
      ? 'Cobrado mensalmente. Cancele quando quiser.'
      : 'Billed monthly. Cancel anytime.';

  const features =
    lang === 'pt'
      ? [
          { title: 'Mentor AI ilimitado', desc: 'Seu Chief of Staff conversacional, 24/7, com memória do time.' },
          { title: '1:1s, Pulse, PDI e 360°', desc: 'O ciclo completo de gestão de pessoas em um lugar.' },
          { title: 'Transcrição de reunião ilimitada', desc: 'Bot entra nas reuniões, transcreve e vira evidência automaticamente.' },
          { title: 'Slack bidirecional', desc: 'Rhitmo puxa contexto e devolve briefs por DM, sem trocar de aba.' },
          { title: 'Detecção de viés em tempo real', desc: 'Avaliações 38× menos enviesadas, direto no editor.' },
          
        ]
      : [
          { title: 'Unlimited Mentor AI', desc: 'Your conversational Chief of Staff, 24/7, with team memory.' },
          { title: '1:1s, Pulse, IDP and 360°', desc: 'The full people management cycle in one place.' },
          { title: 'Unlimited meeting transcription', desc: 'Bot joins meetings, transcribes and turns it into evidence automatically.' },
          { title: 'Bidirectional Slack', desc: 'Rhitmo pulls context and delivers briefs by DM, no tab switching.' },
          { title: 'Real-time bias detection', desc: 'Reviews 38× less biased, right inside the editor.' },
          
        ];

  const enterpriseBullets =
    lang === 'pt'
      ? [
          'SSO (SAML, Google Workspace)',
          'DPA + processamento na UE/Brasil',
          'Admin dashboard com auditoria',
          'Onboarding assistido',
        ]
      : [
          'SSO (SAML, Google Workspace)',
          'DPA + EU/Brazil data processing',
          'Admin dashboard with audit logs',
          'Assisted onboarding',
        ];

  return (
    <section id="pricing" className="py-28 bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <p className="uppercase text-xs font-semibold tracking-widest text-primary">
            {lang === 'pt' ? 'Plano' : 'Plan'}
          </p>
          <h2 className="font-serif text-3xl lg:text-5xl font-bold tracking-tight text-foreground">
            {lang === 'pt'
              ? 'Preços justos e sem surpresas'
              : 'Fair pricing, no surprises'}
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            {lang === 'pt'
              ? 'Tudo o que você precisa para colocar seu time no ritmo certo.'
              : 'Everything you need to get your team in the right rhythm.'}
          </p>
        </div>

        {/* Cycle selector */}
        <div className="flex justify-center mb-10">
          <Tabs value={cycle} onValueChange={(v) => setCycle(v as SeatCycle)}>
            <TabsList className="h-11 rounded-full p-1 bg-muted/60">
              <TabsTrigger value="monthly" className="rounded-full px-5 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {lang === 'pt' ? 'Mensal' : 'Monthly'}
              </TabsTrigger>
              <TabsTrigger value="annual" className="rounded-full px-5 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                {lang === 'pt' ? 'Anual' : 'Annual'}
                <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-2 py-0.5">
                  −16%
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Single card */}
        <div className="bg-card rounded-[40px] border border-border/40 shadow-sm p-8 md:p-12">
          <div className="flex flex-col items-start gap-2 mb-8">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-6 py-2.5 text-xl md:text-2xl font-semibold text-primary">
              {lang === 'pt' ? 'Primeiros 3 usuários grátis' : 'First 3 users free'}
            </div>
            <p className="text-sm text-muted-foreground pl-1">
              {lang === 'pt' ? 'Teste a Rhitmo sem compromisso' : 'Try Rhitmo with no commitment'}
            </p>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-none">
              {headlinePrice}
            </span>
            <span className="text-base text-muted-foreground">{headlineSuffix}</span>
          </div>
          <p className="text-sm font-medium text-foreground mt-3">
            {lang === 'pt'
              ? 'Para cada usuário adicional após o 3º.'
              : 'For each additional user after the 3rd.'}
          </p>

          <Button
            className="w-full min-h-[52px] mt-8 rounded-full text-base bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate('/auth/start')}
          >
            {lang === 'pt' ? 'Começar grátis' : 'Start free'}
          </Button>
          {/* Features list */}
          <div className="border-t border-border/50 mt-10 pt-8">

            <dl className="space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <dt className="font-medium text-foreground">{f.title}</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{f.desc}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Enterprise rail — high-contrast dark block */}
        <div className="mt-6 bg-foreground text-background rounded-[32px] p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 mb-6">
            <Building className="h-3.5 w-3.5 text-background/80" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-background/80">
              {lang === 'pt' ? 'Para organizações · +50 pessoas' : 'For organizations · 50+ people'}
            </span>
          </div>

          {/* Headline + CTA row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div className="md:max-w-md">
              <h3 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-background leading-tight mb-3">
                Rhitmo Enterprise
              </h3>
              <p className="text-sm md:text-base text-background/70 leading-relaxed">
                {lang === 'pt'
                  ? 'Ciclo completo de performance para toda a organização: calibração entre gestores, blindagem jurídica e visibilidade do RH em tempo real.'
                  : 'Complete performance cycle for the entire organization: cross-manager calibration, legal protection, and real-time HR visibility.'}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <Button
                asChild
                className="min-h-[52px] rounded-full px-7 text-base bg-background text-foreground hover:bg-background/90 shadow-sm"
              >
                <Link to="/enterprise" className="inline-flex items-center gap-2">
                  {lang === 'pt' ? 'Falar com Vendas' : 'Talk to Sales'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <a
                href="mailto:matheus@rhitmo.co"
                className="text-xs text-background/60 hover:text-background/90 transition-colors"
              >
                {lang === 'pt' ? 'ou escreva para matheus@rhitmo.co' : 'or email matheus@rhitmo.co'}
              </a>
            </div>
          </div>

          {/* Bullets grid 2×2 */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-8">
            {enterpriseBullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-background/90">
                <Check className="mt-0.5 h-4 w-4 text-background shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Trust line */}
          <div className="border-t border-background/10 pt-5">
            <p className="text-xs text-background/55">
              {lang === 'pt'
                ? 'A partir de R$ 750/mês · faturamento anual · resposta em até 24h'
                : 'Starting at R$ 750/month · annual billing · response within 24h'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============== MAIN COMPONENT ==============

const Landing = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [hash]);

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

  const { isAdmin, isRealAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!loading && user) {
      if (adminLoading) return;
      // While impersonating, send admin into the regular app instead of /admin.
      const target = isAdmin ? "/admin" : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [user, loading, adminLoading, isAdmin, isRealAdmin, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>;
  }
  if (user) return null;

  return <div className="transition-colors duration-300">
      <Helmet>
        <link rel="canonical" href="https://rhitmo.co/" />
      </Helmet>
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-primary" />
          </Link>

          {/* Desktop: Botões normais */}
          <div className="hidden md:flex items-center gap-3">
            <a href="#impacto">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.featuresNav}
              </Button>
            </a>
            <a href="#pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.pricingNav}
              </Button>
            </a>
            <a href="#faq">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.faqNav}
              </Button>
            </a>
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
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                {t.signIn}
              </Button>
            </Link>
            <Link to="/auth/start">
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
                  <a href="#impacto">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.featuresNav}
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#pricing">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.pricingNav}
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#faq">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.faqNav}
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full justify-start min-h-[44px]">
                      {t.signIn}
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/auth/start">
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

              <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground">
                {t.heroTitle}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>
              
              <div className="pt-4 flex flex-wrap gap-3">
                <Button size="lg" className="text-base px-8 rounded-xl" onClick={() => navigate('/auth/start')}>
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

          <div className="relative max-w-5xl mx-auto">
            {/* Arrow indicator between cards - desktop only */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg z-10">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto">
              {/* Row 1: Headers */}
              <div className="bg-muted rounded-t-2xl md:rounded-tr-none md:rounded-tl-2xl p-8 lg:p-10 pb-0 lg:pb-0 border border-b-0 border-destructive/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{t.withoutRhitmo}</h3>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-emerald-500/5 rounded-t-2xl md:rounded-tl-none md:rounded-tr-2xl p-8 lg:p-10 pb-0 lg:pb-0 border border-b-0 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{t.withRhitmo}</h3>
                </div>
              </div>

              {/* Rows 2+: Interleaved items */}
              {t.beforeItems.map((beforeItem, i) => {
                const afterItem = t.afterItems[i];
                const isLast = i === t.beforeItems.length - 1;
                return (
                  <React.Fragment key={i}>
                    <div className={`bg-muted px-8 lg:px-10 py-2.5 border-x border-destructive/10 ${isLast ? 'pb-8 lg:pb-10 border-b rounded-b-2xl md:rounded-br-none md:rounded-bl-2xl' : ''} ${i === 0 ? 'pt-6' : ''}`}>
                      <div className="flex items-start gap-3">
                        <XCircle className="h-4 w-4 text-destructive/60 mt-1 shrink-0" />
                        <span className="text-muted-foreground leading-relaxed text-base">{beforeItem}</span>
                      </div>
                    </div>
                    <div className={`bg-gradient-to-br from-primary/5 to-emerald-500/5 px-8 lg:px-10 py-2.5 border-x border-primary/20 ${isLast ? 'pb-8 lg:pb-10 border-b rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl' : ''} ${i === 0 ? 'pt-6' : ''}`}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                        <span className="text-foreground leading-relaxed text-base font-medium">{afterItem}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
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
            {lang === 'pt' ? 'A pergunta é com qual ferramenta. Funcionalidades reais, não promessas de roadmap.' : 'The question is with which tool. Real features, not roadmap promises.'}
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
      <section id="impacto" className="py-28 bg-gradient-to-br from-muted/30 to-primary/5">
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
              <Button className="w-full rounded-xl mt-6" onClick={() => navigate('/auth/start')}>
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
              <Button variant="outline" className="w-full rounded-xl mt-6" onClick={() => navigate('/auth/start')}>
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
      <section id="faq" className="py-24 bg-muted/30">
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

      {/* Pricing Section — Sem mensal. Trimestral / Semestral / Anual. */}
      <WaveDivider className="bg-background" />
      <PricingSection t={t} lang={lang} navigate={navigate} />

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
