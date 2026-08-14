import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RhitmoLogo } from "@/components/RhitmoLogo";
import { RhythmWave } from "@/components/RhythmWave";
import { WaveDivider } from "@/components/WaveDivider";

import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Zap, Heart, BarChart, Sparkles, Send, Loader2, ImageIcon, Menu, X, Check, Moon, Sun, Globe, Building, Clock, AlertCircle, DollarSign, Shield, Mic, XCircle, CheckCircle2, Target, Users, FileText, ArrowRight, BookOpen, Lock, Calendar, Music2, ChevronDown } from "lucide-react";

import heroLeaderFlow from "@/assets/hero-leader-flow.png";
import heroDuoFeedback from "@/assets/hero-duo-feedback.png";
import cinematicOffice from "@/assets/landing-cinematic-office.jpg";
import { SarahJourneySection } from "@/components/landing/SarahJourneySection";
import { cn } from "@/lib/utils";

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
    heroSubtitle: "O que levava 2 horas agora leva poucos minutos. Rhitmo é a plataforma AI-first feita para líderes que transforma anotações, conversas e sinais em avaliações de performance justas e prontas.",
    seePlans: "Preços",
    
    // Journey (Meet Ana — Windmill style)
    journeyOverline: "Como funciona",
    journeyTitle: "Conheça a Ana,\ne a jornada dela com a Rhitmo.",
    journeySubtitle: "Do primeiro dia até a primeira avaliação formal, a Rhitmo trabalha em background pra você liderar melhor.",
    journeyActs: [
      { tag: "SEMANA 1", label: "Onboarding", title: "Ana entra no time", body: "Antes do líder lembrar, a Rhitmo manda um check-in. O líder vê o gap antes da próxima 1:1, e quem vem depois ganha o walkthrough no dia um.", mock: "slackDM" as const },
      { tag: "TODA SEMANA", label: "1:1s", title: "1:1s que se preparam sozinhas", body: "Sem 'então… do que a gente fala?'. A Rhitmo monta a pauta a partir do trabalho real da semana, das anotações e evidências enviadas...e a Ana adiciona o que importa pra ela.", mock: "oneOnOne" as const },
      { tag: "MEMÓRIA", label: "Diário", title: "A memória que líder bom não tem tempo de manter", body: "Toda conversa de corredor, feedback difícil, destaque ou padrão preocupante vira uma nota privada em Anotações & Evidências da Ana. Quando chega a 1:1, a avaliação ou o recap trimestral, nada se perde. A Rhitmo lembra por você.", mock: "journal" as const },
      { tag: "FIM DO TRI", label: "Review", title: "Avaliações que nascem prontas", body: "A Rhitmo escreve o draft da review a partir de evidência real. O líder revisa em vez de reconstruir o trimestre de memória, e a Ana vê o quarter inteiro sem surpresa.", mock: "review" as const },
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
    hrP1: "Seus gestores gastavam muitas horas para elaborar review mal feitas. Com Rhitmo, eles levam 2 minutos para avaliações mais justas. Isso são centenas de horas devolvidas por ciclo de avaliação, sem perder qualidade.",
    hrP2: "Além disso, todo líder tem um coaching de liderança personalizado. RH possui visibilidade total de métricas de saúde dos times.",
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
      "Anotações & Evidências ilimitado",
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
          { label: "Anotações & Evidências + resumo mensal automático", isNew: true },
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
      { q: "Rhitmo substitui plataformas de RH tradicionais?", a: "Não completamente. Se você precisa de pesquisa de clima ou um portal completo de benefícios hoje, mantenha sua plataforma atual e use Rhitmo em paralelo. Se o que dói é review, 1:1 e contexto perdido, Rhitmo resolve sozinha — e muitos clientes operam exatamente assim, com Rhitmo + uma ferramenta tradicional só onde faz sentido." },
      { q: "A IA realmente escreve a review ou só dá sugestões?", a: "Escreve por completo. Você recebe um draft de 2 a 3 páginas com texto corrido, baseado em feedbacks, evidências e anotações registrados no período. Cada afirmação vem com uma citação clicável da evidência original, então você revisa em vez de reconstruir o período avaliado de memória." },
      { q: "Como funciona o brief antes de cada 1:1?", a: "Um pouco antes de reuniões 1:1s, a Rhitmo te manda uma DM no Slack com o que importa discutir: pendências do último 1:1, insights de anotações e evidências que você registrou sobre a pessoa liderada. Você chega preparado sem abrir o app, e a pauta da própria 1:1 já vem sugerida a partir do histórico real." },
      { q: "Como Rhitmo detecta viés nas evidências e avaliação formal de desempenho?", a: "Quando você digita uma review ou um feedback, a Rhitmo destaca em tempo real linguagem tendenciosa: viés de gênero (\"agressiva\" vs. \"assertiva\"), viés de personalidade (foco em \"como é\" em vez de \"o que fez\"), generalizações como \"sempre\" e \"nunca\", e ataques à pessoa em vez do comportamento." },
      
      { q: "O que dá pra fazer só pelo Slack?", a: "Praticamente tudo o que importa no dia a dia: receber briefs de 1:1, gerar pauta, conversar com a Rhitmo em DM como se fosse o seu assistente de liderança, registrar uma observação rápida sobre alguém. Para quem vive no Slack, dá pra usar a Rhitmo quase sempre sem precisar abrir a plataforma." },
      { q: "Como funciona a transcrição automática das reuniões?", a: "Um bot entra na sua Meet, Zoom ou Teams, transcreve e devolve as anotações estruturadas sem você precisar digitar nada durante a conversa. A transcrição bruta fica visível apenas para você, líder; o liderado vê só o que for explicitamente compartilhado. O plano Pro inclui 30 horas de transcrição por mês." },
      { q: "Quanto tempo até eu ver valor?", a: "O onboarding leva poucos minutos e você já pode ir registrando anotações, fazer uploads de transcrições antigas ou configurar para Rhitmo transcrever suas futuras reuniões e já ter evidências suficientes para gerar as primeiras avaliações, que podem ser semanais, mensais, trimestrais ou anuais, você escolhe. Você percebe que precisava disso antes quando a review sai pronta em 2 minutos em vez das horas que custavam antes." },
      { q: "Privacidade, LGPD e segurança dos dados?", a: "Suas notas como líder são privadas por padrão; compartilhar é uma ação explícita e visível. Aplicamos Row-Level Security por cadeia de liderança, então dados de um time nunca vazam para outro. Seguimos LGPD, você pode exportar e excluir o histórico a qualquer momento, e a assinatura pode ser cancelada quando quiser sem reter seus dados." },
    ],
  },
  en: {
    signIn: "Sign in",
    getStarted: "Get started free",
    toggleTheme: "Toggle theme",
    heroTitle: "Never write a performance review from scratch again.",
    heroSubtitle: "What took 4 hours now takes 2 minutes. Rhitmo is the only AI-native leadership partner that turns your conversations into ready-made reviews.",
    seePlans: "Pricing",
    
    // Journey (Meet Ana — Windmill style)
    journeyOverline: "How it works",
    journeyTitle: "Meet Ana.\nHer journey with Rhitmo.",
    journeySubtitle: "From day one to her first performance review, Rhitmo works behind the scenes so you can lead better.",
    journeyActs: [
      { tag: "WEEK 1", label: "Onboarding", title: "Ana joins the team", body: "Before her manager even thinks about it, Rhitmo sends a Slack check-in. The manager sees the gap before the next 1:1, and future new hires get the walkthrough on day one.", mock: "slackDM" as const },
      { tag: "WEEKLY", label: "1:1s", title: "1:1s that prep themselves", body: "No more 'so… what should we talk about?'. Rhitmo pulls the agenda from the week's actual work, and Ana adds what's on her mind.", mock: "oneOnOne" as const },
      { tag: "MEMORY", label: "Journal", title: "The memory great leaders don't have time to keep", body: "Every hallway chat, hard feedback, highlight or worrying pattern becomes a private note in Ana's journal. When the 1:1, review or quarterly recap comes around, nothing is lost. Rhitmo remembers for you.", mock: "journal" as const },
      { tag: "QUARTER END", label: "Review", title: "Performance reviews, already written", body: "Rhitmo drafts Ana's review from real evidence. Her manager reviews the work instead of reconstructing the quarter from memory.", mock: "review" as const },
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
      { q: "Does Rhitmo replace traditional HR platforms?", a: "Not completely. If you need engagement surveys or a full benefits portal today, keep your current platform and run Rhitmo alongside it. If the real pain is reviews, 1:1s and lost context, Rhitmo handles that on its own — and many customers operate exactly like this: Rhitmo plus a traditional tool only where it actually adds value." },
      { q: "Does the AI really write the review or just suggest things?", a: "It writes the whole thing. You get a 2-3 page draft in flowing prose, grounded in the feedback, 1:1s, pulses and peer reviews logged during the period. Every claim comes with a clickable citation back to the source evidence, so you review instead of reconstructing the quarter from memory." },
      { q: "How does the brief before each 1:1 work?", a: "About 18 hours before the meeting, Rhitmo sends you a Slack DM with what matters: open items from the last 1:1, recent pulse signals, fresh peer feedback and hot topics across the person's network. You walk in prepared without opening the app, and the agenda for the 1:1 is already drafted from the real history." },
      { q: "How does Rhitmo detect bias while I write?", a: "As you type a review or feedback, Rhitmo highlights biased language in real time: gender bias (\"aggressive\" vs. \"assertive\"), personality bias (focusing on \"who they are\" instead of \"what they did\"), generalizations like \"always\" and \"never\", and attacks on the person rather than the behavior. It's not a post-hoc audit, it's prevention at the moment of writing." },
      
      { q: "What can I actually do from Slack alone?", a: "Almost everything that matters day to day: receive 1:1 briefs, generate an agenda, chat with Rhitmo in DM like your leadership assistant, log a quick note about someone. If you live in Slack, you can use Rhitmo most of the time without opening the platform." },
      { q: "How does automatic meeting transcription work?", a: "A bot joins your Meet, Zoom or Teams call, transcribes it and gives back structured notes — you don't type during the conversation. The raw transcript stays visible only to you, the leader; the report only sees what you explicitly share. The Pro plan includes 30 hours of transcription per month." },
      { q: "How long until I see value?", a: "Onboarding takes under 5 minutes. The first 1:1 briefs land within the first week, as Rhitmo learns your routine. The big payoff happens at the end of the quarter, when a review comes out in 2 minutes instead of the 4 hours it used to take." },
      { q: "Privacy, GDPR/LGPD and data security?", a: "Your notes as a leader are private by default; sharing is an explicit, visible action. We enforce Row-Level Security along the leadership chain, so one team's data never leaks to another. We're LGPD compliant, you can export and delete your history at any time, and you can cancel the subscription whenever without us holding your data." },
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
      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
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

// ============== LEADER BRIEF (Slack DM) MOCKUP ==============
const LeaderBriefMockup = () => (
  <div className="bg-card h-full overflow-hidden font-sans">
    {/* Slack-style header */}
    <div className="px-5 py-3 border-b flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">R</div>
      <div className="flex-1">
        <div className="font-semibold text-sm flex items-center gap-1.5">
          Rhitmo
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">App</span>
        </div>
        <div className="text-xs text-muted-foreground">Mensagem direta · hoje, 08:12</div>
      </div>
    </div>

    {/* Brief card */}
    <div className="p-5 space-y-3">
      <div className="text-sm leading-relaxed">
        Bom dia 👋 Sua <span className="font-semibold">1:1 com Maria Santos</span> é hoje às 16h. Aqui vai a prep:
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">Brief de 1:1 · Maria Santos</span>
        </div>
        <div className="px-4 py-3 space-y-2.5 text-sm">
          <div className="flex gap-2.5">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
            <div className="text-slate-700">
              <span className="font-medium">Pendência da última 1:1:</span> alinhar escopo do projeto Atlas até sexta.
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <div className="text-slate-700">
              <span className="font-medium">Tema recorrente:</span> carga de trabalho apareceu nas últimas 2 conversas, vale revisitar.
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="text-slate-700">
              <span className="font-medium">Reconhecimento:</span> Maria liderou a entrega do incidente do dia 04, espaço para celebrar.
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Abrir pauta completa</button>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">+ Adicionar item</button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">Quer aprofundar algum desses tópicos? É só responder aqui.</div>
    </div>
  </div>
);

// ============== HR RISK ALERTS MOCKUP ==============
const HRRiskMockup = () => (
  <div className="bg-card h-full overflow-hidden">
    {/* Header */}
    <div className="px-5 py-4 border-b flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-semibold text-sm">Radar de Risco</div>
          <div className="text-xs text-muted-foreground">7 dias · todos os times</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
        3 ativos
      </div>
    </div>

    {/* Alerts list */}
    <div className="p-4 space-y-2.5">
      {/* Alert 1 — High */}
      <div className="rounded-xl border border-rose-200/70 bg-gradient-to-r from-rose-50/60 to-white p-3.5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-700 font-semibold text-xs">JF</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-slate-900 truncate">João Ferreira · Engenharia</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white uppercase tracking-wide shrink-0">Alto</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Sinais de desengajamento em 3 das últimas 1:1s e sem registro de reconhecimento há 45 dias. Risco de turnover.</div>
        </div>
      </div>

      {/* Alert 2 — Medium */}
      <div className="rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50/60 to-white p-3.5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-semibold text-xs">CS</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-slate-900 truncate">Camila Souza · Produto</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white uppercase tracking-wide shrink-0">Médio</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Menções recorrentes a sobrecarga em 1:1s e queda de evidências positivas no último ciclo de avaliação.</div>
        </div>
      </div>

      {/* Alert 3 — Low */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-700 font-semibold text-xs">RM</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-slate-900 truncate">Rafael Moura · Dados</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-400 text-white uppercase tracking-wide shrink-0">Atenção</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">Sem registros de feedback na última 1:1 — cobertura abaixo do time.</div>
        </div>
      </div>
    </div>

    {/* Footer KPIs */}
    <div className="px-5 py-3 border-t bg-slate-50/60 grid grid-cols-3 gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Saúde geral</div>
        <div className="text-base font-bold text-slate-900">82<span className="text-xs text-slate-500">/100</span></div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Cobertura</div>
        <div className="text-base font-bold text-slate-900">94%</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Mitigados</div>
        <div className="text-base font-bold text-emerald-600">+12</div>
      </div>
    </div>
  </div>
);

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
          { title: '1:1s', desc: 'Brief automático antes, pauta gerada a partir do contexto histórico com a pessoa liderada.' },
          { title: 'Transcrição de reunião ilimitada', desc: 'Transcrição que vira anotação automaticamente e você pode focar em conversas profundas ao invés de anotar.' },
          { title: 'Slack', desc: 'Tenha Rhitmo conectado com seu Slack para lembretes, briefs e chat onde você já passa maior parte do tempo.' },
          { title: 'Detecção de viés nas evidências e avaliações de desempenho', desc: 'Identifique e aprenda a corrigir eventuais vieses e injustiças que você pode estar comentendo' },
          
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
    <section id="pricing" className="py-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <p className="inline-flex items-center gap-3 text-[11px] uppercase font-mono tracking-[0.25em] text-slate-500 font-semibold">
            <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
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

  // Landing v3 é light-only — sem state de tema.

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

  // Landing v3 (Editorial Light Mode — Windmill-inspired) é light-only por design.
  // Tema dark fica disponível apenas no app autenticado.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  // Quotes de prova social (post-its). Estáticas para evitar acoplar i18n agora.
  const testimonials = lang === 'pt' ? [
    { quote: 'Reescrever a review do zero virou coisa do passado. Em 2 minutos tenho um draft melhor do que eu faria em 4 horas.', author: 'Head of Engineering', color: 'bg-yellow-50 border-yellow-100', rot: '-rotate-2' },
    { quote: 'Detector de viés me salvou de mandar uma review enviesada sem perceber. Isso vale o ano todo.', author: 'Tech Lead', color: 'bg-blue-50 border-blue-100', rot: 'rotate-1' },
    { quote: 'Pela primeira vez todas as 1:1s do trimestre estão registradas. Avaliação virou consequência, não tarefa.', author: 'Engineering Manager', color: 'bg-pink-50 border-pink-100', rot: '-rotate-1' },
    { quote: 'Era a única coisa que adiava sem dó. Agora finalizo o ciclo de avaliação em uma tarde.', author: 'Diretor de Operações', color: 'bg-emerald-50 border-emerald-100', rot: 'rotate-3' },
  ] : [
    { quote: 'Writing reviews from scratch is a thing of the past. Two minutes for a draft better than what I would write in four hours.', author: 'Head of Engineering', color: 'bg-yellow-50 border-yellow-100', rot: '-rotate-2' },
    { quote: 'The bias detector saved me from sending a biased review without realizing. Worth it for the year alone.', author: 'Tech Lead', color: 'bg-blue-50 border-blue-100', rot: 'rotate-1' },
    { quote: 'For the first time every 1:1 of the quarter is logged. The review became a consequence, not a task.', author: 'Engineering Manager', color: 'bg-pink-50 border-pink-100', rot: '-rotate-1' },
    { quote: 'It was the one thing I always postponed. Now I close the review cycle in an afternoon.', author: 'Director of Operations', color: 'bg-emerald-50 border-emerald-100', rot: 'rotate-3' },
  ];

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
    return <div className="min-h-dvh flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>;
  }
  if (user) return null;

  return (
    <div className="bg-white text-slate-900 antialiased">
      <Helmet>
        <link rel="canonical" href="https://rhitmo.co/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: t.faqItems.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          })}
        </script>
      </Helmet>

      {/* Scoped CSS — iridescent surface + post-its */}
      <style>{`
        .iridescent-surface {
          background:
            radial-gradient(120% 80% at 0% 0%, rgba(199,210,254,0.55) 0%, rgba(199,210,254,0) 55%),
            radial-gradient(120% 80% at 100% 0%, rgba(252,202,233,0.45) 0%, rgba(252,202,233,0) 55%),
            radial-gradient(120% 80% at 50% 100%, rgba(186,230,253,0.55) 0%, rgba(186,230,253,0) 60%),
            linear-gradient(135deg, #eef2ff 0%, #fdf2f8 50%, #eff6ff 100%);
        }
        .post-it { box-shadow: 2px 6px 18px rgba(15,23,42,0.06); transition: transform .25s ease; }
        .post-it:hover { transform: rotate(0deg) translateY(-2px); }
      `}</style>

      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <RhitmoLogo size="sm" className="text-slate-900" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#impacto" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">{t.featuresNav}</a>
            <a href="#pricing" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">{t.pricingNav}</a>
            <a href="#faq" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">{t.faqNav}</a>
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Language">
                  <Globe className="h-[18px] w-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')} className="gap-2">
                  🇧🇷 Português {lang === 'pt' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')} className="gap-2">
                  🇺🇸 English {lang === 'en' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/auth" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              {t.signIn}
            </Link>
            <Link
              to="/auth/start"
              className="ml-2 inline-flex items-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              {t.getStarted}
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-1 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full text-slate-500" aria-label="Language">
                  <Globe className="h-[18px] w-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('pt')} className="gap-2">🇧🇷 Português {lang === 'pt' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')} className="gap-2">🇺🇸 English {lang === 'en' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 text-slate-700" aria-label="Menu">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] pt-12 bg-white">
                <nav className="flex flex-col gap-2">
                  <SheetClose asChild><a href="#impacto" className="px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">{t.featuresNav}</a></SheetClose>
                  <SheetClose asChild><a href="#pricing" className="px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">{t.pricingNav}</a></SheetClose>
                  <SheetClose asChild><a href="#faq" className="px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">{t.faqNav}</a></SheetClose>
                  <div className="h-px bg-slate-100 my-2" />
                  <SheetClose asChild><Link to="/auth" className="px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">{t.signIn}</Link></SheetClose>
                  <SheetClose asChild>
                    <Link to="/auth/start" className="mt-2 inline-flex items-center justify-center bg-slate-900 text-white px-4 py-3 rounded-full text-sm font-semibold">
                      {t.getStarted}
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="pt-20 lg:pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-slate-900">
              {t.heroTitle}
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-xl">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/auth/start')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-7 py-3.5 rounded-full font-semibold text-base shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
              >
                {t.getStarted}
              </button>
              <a
                href="#pricing"
                className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-7 py-3.5 rounded-full font-semibold text-base text-slate-700 transition-colors"
              >
                {t.seePlans}
              </a>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              {lang === 'pt' ? 'Sem cartão de crédito para começar. Cancele quando quiser.' : 'No credit card to start. Cancel anytime.'}
            </p>
          </div>

          {/* Product mockup — Rhitmo Mensal sheet */}
          <div className="relative" aria-hidden="true">
            <div className="iridescent-surface rounded-[2rem] p-5 lg:p-7 shadow-2xl shadow-amber-100/40 border border-white/60">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Browser top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="ml-3 text-[11px] text-slate-500 font-medium">rhitmo.co · Pessoas · Joana Silva</div>
                </div>

                {/* Sheet header — creme */}
                <div className="bg-[#f5f0e8] px-6 pt-6 pb-5 border-b border-slate-200/60">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-rose-300 flex items-center justify-center">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-700/70" />
                        <span className="w-1 h-1 rounded-full bg-slate-700/70" />
                      </div>
                    </div>
                    <div>
                      <div className="font-serif text-lg font-bold tracking-tight text-slate-900 leading-tight">Joana Silva</div>
                      <div className="text-xs text-slate-500">Analista de Finance Ops</div>
                    </div>
                  </div>
                </div>

                {/* Sheet body */}
                <div className="bg-[#faf7f1] px-6 py-5 space-y-4">
                  {/* Rhitmo desta pessoa banner */}
                  <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Music2 className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900">Rhitmo desta pessoa</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-2.5 w-2.5" /> 6 confirmados
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">6 mensais no histórico</div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="inline-flex bg-slate-100/70 p-1 rounded-full text-[11px] font-medium">
                    <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                      <Music2 className="h-3 w-3" /> Acompanhamento Mensal
                    </span>
                    <span className="text-slate-500 px-3 py-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Histórico Formal
                    </span>
                  </div>

                  {/* Current month placeholder */}
                  <div className="border border-dashed border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[13px] font-semibold text-slate-700">Junho de 2026</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">Mês em curso</span>
                  </div>

                  {/* Confirmed month — focus card */}
                  <div className="bg-white rounded-2xl ring-1 ring-indigo-300/60 border border-white shadow-[0_4px_24px_-12px_rgba(79,70,229,0.18)] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-serif text-[15px] font-bold tracking-tight text-slate-900">Rhitmo Mensal — Maio de 2026</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Confirmado 10/06
                      </span>
                    </div>

                    <div className="px-4 py-4 space-y-3.5 relative">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1">1. Mandou bem</p>
                        <p className="text-[13px] text-slate-700 leading-snug">Liderou a refatoração do fechamento contábil sem travar o time.</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1">2. Atenção</p>
                        <p className="text-[13px] text-slate-700 leading-snug">Solicitou auxílio para destravar sprints de conciliação bancária e contas a pagar.</p>
                        <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                          <FileText className="h-2.5 w-2.5" /> Anotação · 27/05
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1">3. Padrão do mês</p>
                        <p className="text-[13px] text-slate-700 leading-snug">Foco em execução financeira e busca proativa por desbloqueio.</p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Diário de Bordo mini-card */}
            <div className="hidden md:block absolute -bottom-8 -left-4 bg-white p-4 rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-100 w-64">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-serif text-[13px] font-bold tracking-tight text-slate-900 leading-none">Diário de Bordo</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">5 registros · Joana Silva</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <Lock className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                  <span className="text-slate-500">08/06</span>
                  <span className="text-slate-700 truncate">Alinhamento Operações</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <Lock className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                  <span className="text-slate-500">27/05</span>
                  <span className="text-slate-700 truncate">sync · automações financeiro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ============== CINEMATIC QUOTE ============== */}
      <section className="w-full px-4 md:px-8 pb-12 md:pb-20">
        <div className="relative w-full overflow-hidden rounded-3xl aspect-[4/5] md:aspect-[21/9] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]">
          <img
            src={cinematicOffice}
            alt={lang === 'pt' ? 'Escritório ao entardecer com líderes conversando' : 'Office at dusk with leaders in conversation'}
            loading="lazy"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" />
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <h2 className="font-serif text-white text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
              {lang === 'pt' ? 'Toda história merece ser lembrada.' : 'Every story deserves to be remembered.'}
            </h2>
            <a
              href="#impacto"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/25 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              {lang === 'pt' ? 'Veja como funciona' : 'See how it works'}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ============== MEET ANA — JOURNEY ============== */}
      <SarahJourneySection
        lang={lang}
        copy={{
          overline: t.journeyOverline,
          title: t.journeyTitle,
          subtitle: t.journeySubtitle,
          acts: t.journeyActs,
        }}
      />



      {/* ============== NUMBERS — EDITORIAL ============== */}
      <section id="impacto" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Header — alinhado à esquerda, editorial */}
          <div className="max-w-3xl mb-20">
            <p className="inline-flex items-center gap-3 text-[11px] uppercase font-mono tracking-[0.25em] text-slate-500 font-semibold mb-6">
              <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
              {t.numbersOverline}
            </p>
            <h2 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-slate-900">
              <span className="block">{lang === 'pt' ? 'Não é promessa.' : 'Not a promise.'}</span>
              <span className="block italic text-slate-500 font-normal">{lang === 'pt' ? 'São números.' : 'These are numbers.'}</span>
            </h2>
            <p className="text-base text-slate-500 mt-6 max-w-xl">
              {lang === 'pt' ? "\n" : 'Every number here has a source. No hype, no roadmap.'}
            </p>
          </div>

          {/* Stat-hero — Produtividade */}
          <div className="border-t border-slate-200 pt-12 pb-20">
            <div className="flex items-center gap-4 mb-10">
              <span className="font-mono text-[11px] tracking-[0.25em] text-slate-500">01 / {lang === 'pt' ? 'AGILIDADE' : 'PRODUCTIVITY'}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-3 font-serif font-bold tracking-tight text-slate-900 leading-[0.9] flex items-baseline gap-4 md:gap-8">
                <span className="text-[80px] md:text-[140px]">6h</span>
                <span className="text-4xl md:text-6xl text-indigo-400 font-light">→</span>
                <span className="text-[80px] md:text-[140px]">2min</span>
              </div>
              <div className="lg:col-span-2 space-y-5">
                <p className="text-lg text-slate-600 leading-relaxed">
                  {lang === 'pt'
                    ? <>Redigir uma avaliação de desempenho consome em média <span className="text-slate-900 font-medium">4 horas por liderado</span>. Com Rhitmo, o draft sai pronto em <span className="text-slate-900 font-medium">2 minutos</span> a partir do contexto já capturado.</>
                    : <>Writing a performance review takes on average <span className="text-slate-900 font-medium">4 hours per report</span>. With Rhitmo, the draft is ready in <span className="text-slate-900 font-medium">2 minutes</span> from context already captured.</>}
                </p>
                <p className="text-xs text-slate-500 font-mono tracking-wide">{lang === 'pt' ? "\n" : 'Source: Gallup, 2024 · Rhitmo benchmark'}</p>
              </div>
            </div>
          </div>

          {/* Stats 2 + 3 — supporting evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border-t border-slate-200">
            <div className="bg-white pt-12 pb-4 md:pr-10">
              <span className="font-mono text-[11px] tracking-[0.25em] text-slate-500 block mb-8">02 / {lang === 'pt' ? 'EQUIDADE' : 'EQUITY'}</span>
              <div className="font-serif text-7xl md:text-8xl font-bold tracking-tight text-slate-900 mb-6">38×</div>
              <p className="text-base text-slate-600 leading-relaxed mb-4 max-w-sm">
                {lang === 'pt'
                  ? <>Mulheres recebem <span className="text-slate-900 font-medium">38× mais feedback sobre personalidade</span> do que homens. Rhitmo detecta e sinaliza antes da publicação.</>
                  : <>Women receive <span className="text-slate-900 font-medium">38× more personality feedback</span> than men. Rhitmo detects and flags before you publish.</>}
              </p>
              <p className="text-xs text-slate-500 font-mono tracking-wide">{lang === 'pt' ? "Fonte: Language Bias in performance feedback, 2024\n\n" : 'Source: Stanford VMware Women\'s Leadership Lab'}</p>
            </div>
            <div className="bg-white pt-12 pb-4 md:pl-10">
              <span className="font-mono text-[11px] tracking-[0.25em] text-slate-500 block mb-8">03 / {lang === 'pt' ? 'RETENÇÃO' : 'SAVINGS'}</span>
              <div className="font-serif text-7xl md:text-8xl font-bold tracking-tight text-slate-900 mb-6">3x</div>
              <p className="text-base text-slate-600 leading-relaxed mb-4 max-w-sm">
                {lang === 'pt'
                  ? <>Times que entendem o que é esperado têm <span className="text-slate-900 font-medium">3× mais chance de permanecer na empresa</span>. Feedback vago não é só injusto, mas muito caro. Rhitmo transforma o dia a dia em clareza acionável.</>
                  : <>Traditional reviews cost up to <span className="text-slate-900 font-medium">$35M/year</span> in large companies. Rhitmo cuts that by 60% while keeping precision.</>}
              </p>
              <p className="text-xs text-slate-500 font-mono tracking-wide">{lang === 'pt' ? 'Fonte: Deloitte, Reinventing Performance Management' : 'Source: Deloitte, Reinventing Performance Management'}</p>
            </div>
          </div>
        </div>
      </section>




      {/* ============== FOR LEADERS / REPORTS / HR ============== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-20">

          {/* Leaders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase font-mono tracking-[0.25em] text-indigo-700">
                <span className="h-px w-8 bg-indigo-300" aria-hidden="true" />
                <Zap className="h-3 w-3" /> {t.forLeaders}
              </span>
              <h3 className="font-serif text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] text-slate-900">{t.leadersTitle}</h3>
              <div className="space-y-4 text-lg text-slate-500 leading-relaxed">
                <p>{t.leadersP1}</p>
                <p>{t.leadersP2}</p>
              </div>
            </div>
            <div className="iridescent-surface rounded-3xl p-1.5 shadow-xl shadow-indigo-100/40">
              <div className="bg-white rounded-[1.4rem] p-6">
                <LeaderBriefMockup />
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="md:order-2 space-y-6">
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase font-mono tracking-[0.25em] text-emerald-700">
                <span className="h-px w-8 bg-emerald-300" aria-hidden="true" />
                <Heart className="h-3 w-3" /> {t.forReports}
              </span>
              <h3 className="font-serif text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] text-slate-900">{t.reportsTitle}</h3>
              <div className="space-y-4 text-lg text-slate-500 leading-relaxed">
                <p>{t.reportsP1}</p>
                <p>{t.reportsP2}</p>
              </div>
            </div>
            <div className="md:order-1 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src={heroDuoFeedback} alt={t.duoAlt} className="w-full aspect-[4/3] object-cover" />
            </div>
          </div>

          {/* HR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase font-mono tracking-[0.25em] text-slate-700">
                <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
                <BarChart className="h-3 w-3" /> {t.forHR}
              </span>
              <h3 className="font-serif text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] text-slate-900">{t.hrTitle}</h3>
              <div className="space-y-4 text-lg text-slate-500 leading-relaxed">
                <p>{t.hrP1}</p>
                <p>{t.hrP2}</p>
              </div>
            </div>
            <div className="iridescent-surface rounded-3xl p-1.5 shadow-xl shadow-slate-200/50">
              <div className="bg-white rounded-[1.4rem] overflow-hidden">
                <HRRiskMockup />
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ============== FAQ ============== */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="inline-flex items-center gap-3 text-[11px] uppercase font-mono tracking-[0.25em] text-slate-500 font-semibold mb-4">
              <span className="h-px w-8 bg-slate-300" aria-hidden="true" />
              FAQ
            </p>
            <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
              {t.faqTitle}
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {t.faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-slate-100 rounded-2xl px-6 bg-white">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-500 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============== PRICING ============== */}
      <PricingSection t={t} lang={lang} navigate={navigate} />

      {/* ============== FOOTER ============== */}
      <footer className="py-20 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <RhitmoLogo size="sm" className="text-slate-900" />
            <p className="mt-4 text-sm text-slate-500 max-w-xs leading-relaxed">
              {lang === 'pt'
                ? 'O parceiro AI-nativo de liderança que transforma conversas em avaliações de desempenho prontas.'
                : 'The AI-native leadership partner that turns conversations into ready-made performance reviews.'}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-5">{lang === 'pt' ? 'Produto' : 'Product'}</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#impacto" className="hover:text-slate-900 transition-colors">{t.featuresNav}</a></li>
              <li><a href="#pricing" className="hover:text-slate-900 transition-colors">{t.pricingNav}</a></li>
              <li><a href="#faq" className="hover:text-slate-900 transition-colors">{t.faqNav}</a></li>
              <li><Link to="/enterprise" className="hover:text-slate-900 transition-colors">{t.enterpriseNav}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-5">{lang === 'pt' ? 'Legal' : 'Legal'}</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/terms-of-service" className="hover:text-slate-900 transition-colors">{t.footerTerms}</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-slate-900 transition-colors">{t.footerPrivacy}</Link></li>
              <li><Link to="/auth" className="hover:text-slate-900 transition-colors">{t.footerLogin}</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium text-slate-500">
          <span>{t.footerRights}</span>
          <div className="flex gap-6 uppercase tracking-[0.2em] font-bold">
            <span>SOC 2 Type II</span>
            <span>LGPD</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
