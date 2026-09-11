import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { ShieldCheck, Lock, Eye, Database, KeySquare, FileClock } from "lucide-react";

const PILLARS = [
  {
    icon: Lock,
    title: "Conversa de 1:1 é do líder",
    body: "Anotações e transcrições são privadas por padrão. Só viram algo compartilhado quando o líder escolhe compartilhar, de forma explícita.",
  },
  {
    icon: Eye,
    title: "RH enxerga ritmo, não conteúdo",
    body: "A visão de RH mostra cobertura, cadência e riscos. Ela nunca abre o que foi dito em uma 1:1 nem o texto de uma anotação.",
  },
  {
    icon: Database,
    title: "Mapa de colaboração sem espionagem",
    body: "O mapa de rede usa apenas a intensidade das interações. Nenhuma mensagem, assunto ou trecho de conversa é exibido, em nenhum lugar.",
  },
  {
    icon: KeySquare,
    title: "Acesso por papel, verificado no banco",
    body: "Cada pessoa só alcança os dados do próprio time e da própria empresa. As regras vivem no banco de dados, não apenas na tela.",
  },
  {
    icon: FileClock,
    title: "Registro de acessos sensíveis",
    body: "Quem abriu ou exportou dados de pessoas fica registrado, com data e hora, e o responsável pela conta pode consultar esse histórico.",
  },
  {
    icon: ShieldCheck,
    title: "Entrada protegida",
    body: "Senhas conhecidamente vazadas são bloqueadas, trocar a senha exige a senha atual e cada pessoa pode ativar verificação em duas etapas.",
  },
];

export default function TrustCenter() {
  return (
    <LegalPageLayout>
      <Helmet>
        <title>Confiança e Segurança — Rhitmo</title>
        <meta
          name="description"
          content="Como a Rhitmo protege conversas de 1:1, dados de pessoas e acessos: privacidade por padrão, registro de acessos e conformidade com a LGPD."
        />
        <link rel="canonical" href="https://rhitmo.co/confianca" />
        <meta property="og:title" content="Confiança e Segurança — Rhitmo" />
        <meta property="og:description" content="Privacidade por padrão, registro de acessos e conformidade com a LGPD." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rhitmo.co/confianca" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Confiança e segurança
      </p>
      <h1 className="font-serif text-4xl font-bold tracking-tight mb-3">
        A conversa mais delicada da empresa merece o cuidado mais rígido
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-10">
        A Rhitmo trabalha com o que uma liderança fala em particular sobre pessoas. Por isso a regra
        aqui não é "quem tem acesso vê tudo": é quem precisa, do que precisa, com registro.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-12">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl bg-card border border-border/60 p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold tracking-tight mb-1">{p.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6 text-base leading-relaxed">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Onde os dados ficam</h2>
        <p className="text-muted-foreground">
          Os dados ficam em infraestrutura gerenciada, com criptografia em trânsito e em repouso e
          backups automáticos. Arquivos de áudio e anexos ficam em armazenamento privado, acessível
          apenas por links temporários gerados para quem já tem permissão.
        </p>

        <h2 className="font-serif text-2xl font-semibold tracking-tight">Por quanto tempo</h2>
        <p className="text-muted-foreground">
          Cada empresa define por quantos dias as transcrições de reunião ficam guardadas. O padrão
          é 365 dias, e o responsável pela conta pode reduzir esse prazo a qualquer momento na área
          de governança da empresa.
        </p>

        <h2 className="font-serif text-2xl font-semibold tracking-tight">Seus direitos</h2>
        <p className="text-muted-foreground">
          Qualquer pessoa pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, como
          prevê a LGPD. Os detalhes, prazos e o contato do encarregado estão na{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>
          .
        </p>

        <h2 className="font-serif text-2xl font-semibold tracking-tight">Falar com a gente</h2>
        <p className="text-muted-foreground">
          Precisa de um questionário de segurança preenchido, contrato de tratamento de dados ou uma
          conversa com o time técnico? Escreva para{" "}
          <a href="mailto:seguranca@rhitmo.co" className="underline hover:text-foreground">
            seguranca@rhitmo.co
          </a>
          .
        </p>
      </div>
    </LegalPageLayout>
  );
}
