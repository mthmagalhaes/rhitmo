// IMPORTANTE: Esta página é renderizada apenas para usuários com a SPA carregada.
// Crawlers (ex.: validador OAuth do Google) recebem o HTML estático em
// `public/terms-of-service/index.html`. Ao alterar o conteúdo aqui, atualize
// também o arquivo estático para manter consistência.
import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/LegalPageLayout";

const TermsOfService = () => {
  return (
    <LegalPageLayout>
      <Helmet>
        <title>Termos de Serviço — Rhitmo</title>
        <meta name="description" content="Termos de Serviço da Rhitmo: planos, pagamentos, uso aceitável, propriedade intelectual e responsabilidades." />
        <link rel="canonical" href="https://rhitmo.co/terms-of-service" />
        <meta property="og:title" content="Termos de Serviço — Rhitmo" />
        <meta property="og:description" content="Termos de Serviço da Rhitmo: planos, pagamentos, uso aceitável e responsabilidades." />
        <meta property="og:url" content="https://rhitmo.co/terms-of-service" />
      </Helmet>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Termos de Serviço</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: 18 de março de 2026</p>

      <div className="space-y-6 text-base leading-relaxed text-foreground">
        <p>
          Bem-vindo à Rhitmo. Estes Termos de Serviço ("Termos") regem o uso da plataforma Rhitmo ("Serviço"), operada por MATHEUS PINTO MAGALHAES SERVICOS ADMINISTRATIVOS LTDA, CNPJ 49.301.470/0001-84, com sede em São Paulo, Brasil ("Rhitmo", "nós" ou "nosso").
        </p>
        <p>
          Ao acessar ou usar o Serviço, você concorda em ficar vinculado a estes Termos. Se você não concorda com qualquer parte destes Termos, não deve usar o Serviço.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Definições</h2>
        <p><strong>Usuário:</strong> Pessoa física que cria uma conta na Rhitmo.</p>
        <p><strong>Líder:</strong> Usuário que gerencia um ou mais liderados através da plataforma.</p>
        <p><strong>Liderado:</strong> Membro da equipe gerenciado por um líder.</p>
        <p><strong>Workspace:</strong> Ambiente organizacional que agrupa líderes e liderados de uma mesma empresa.</p>
        <p><strong>Plano:</strong> Nível de serviço contratado (Pulse, Pro ou Business).</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Descrição do Serviço</h2>
        <p>A Rhitmo é uma plataforma de gestão de performance e desenvolvimento de pessoas, com funcionalidades de inteligência artificial para:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Gestão de feedbacks e anotações</li>
          <li>Transcrição e análise de reuniões 1:1</li>
          <li>Assistente de IA (Rhitmo) para apoio a líderes</li>
          <li>Planos de desenvolvimento individual (PDI)</li>
          <li>Avaliações formais de desempenho</li>
          <li>Analytics e métricas de gestão</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Planos e Pagamentos</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">3.1 Planos Disponíveis</h3>

        <p><strong>Pulse (Gratuito):</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Acesso ao Meu Rhitmo (portal do liderado)</li>
          <li>1 avaliação com IA por mês</li>
          <li>Rhitmo limitada (20 mensagens/mês)</li>
          <li>Notas e anotações ilimitadas</li>
        </ul>

        <p className="mt-4"><strong>Pro:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Trimestral: R$ 267 (equivalente a R$ 89/mês)</li>
          <li>Semestral: R$ 504 (equivalente a R$ 84/mês)</li>
          <li>Anual: R$ 948 (equivalente a R$ 79/mês)</li>
          <li>Liderados ilimitados</li>
          <li>30 horas/mês de transcrição automatizada (Recall.ai + upload manual)</li>
          <li>Avaliações com IA ilimitadas</li>
          <li>Pre-meeting Briefs com contexto histórico</li>
          <li>Detecção de viés em tempo real</li>
          <li>Rhitmo ilimitada</li>
          <li>Acesso ao Meu Rhitmo para todo o time</li>
          <li>Analytics completo</li>
          <li>Times ilimitados</li>
        </ul>

        <p className="mt-4"><strong>Enterprise / Corporate (sob consulta):</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Tudo do Pro, para a organização inteira</li>
          <li>HR Dashboard (Radar de Risco / Heatmap)</li>
          <li>Dossiê de Blindagem Jurídica</li>
          <li>Integração com HRIS</li>
          <li>SSO (Single Sign-On)</li>
          <li>CSM dedicado e SLA garantido</li>
          <li>Cobrança exclusivamente anual</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">3.2 Período de Teste</h3>
        <p>O plano Pro oferece 14 dias de teste gratuito apenas no ciclo trimestral para novos usuários. Após o período de teste, o cartão de crédito cadastrado será cobrado automaticamente, a menos que a assinatura seja cancelada antes do término do trial.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">3.3 Cobrança e Renovação</h3>
        <p>Não oferecemos plano mensal. As assinaturas Pro são cobradas em ciclos de 3, 6 ou 12 meses, de forma recorrente. O valor é debitado automaticamente no início de cada ciclo. A escolha de ciclos mais longos reflete o tempo necessário para que mudanças de comportamento de liderança se consolidem (mínimo de 90 dias). Você é responsável por manter seus dados de pagamento atualizados.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">3.4 Impostos</h3>
        <p>Os preços exibidos não incluem impostos aplicáveis. Você é responsável pelo pagamento de quaisquer tributos relacionados ao uso do Serviço.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Cancelamento e Reembolsos</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">4.1 Cancelamento</h3>
        <p>Você pode cancelar sua assinatura a qualquer momento através da página de Assinatura dentro da plataforma. O cancelamento terá efeito ao final do ciclo de cobrança atual, e você manterá acesso aos recursos do plano contratado até essa data.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">4.2 Política de Reembolso</h3>
        <p>Não oferecemos reembolsos por períodos parciais de serviço. Se você cancelar durante um ciclo de cobrança, continuará tendo acesso até o final do período já pago.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">4.3 Mudança de Ciclo</h3>
        <p>Você pode alternar entre os ciclos Trimestral, Semestral e Anual a qualquer momento. As mudanças aplicam proratação automática conforme o tempo restante do ciclo atual.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Uso Aceitável</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">5.1 Você concorda em NÃO:</h3>
        <ul className="list-disc ml-6 space-y-2">
          <li>Usar o Serviço para qualquer finalidade ilegal ou não autorizada</li>
          <li>Violar leis aplicáveis em sua jurisdição</li>
          <li>Transmitir qualquer material que contenha vírus ou código malicioso</li>
          <li>Interferir ou interromper o Serviço ou servidores conectados</li>
          <li>Coletar ou armazenar dados pessoais de outros usuários sem consentimento</li>
          <li>Fazer engenharia reversa, descompilar ou desmontar qualquer parte do Serviço</li>
          <li>Usar o Serviço para assediar, abusar ou prejudicar outras pessoas</li>
          <li>Compartilhar suas credenciais de acesso com terceiros</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">5.2 Conteúdo do Usuário</h3>
        <p>Você mantém todos os direitos sobre o conteúdo que envia para a Rhitmo (feedbacks, notas, transcrições, etc.). Ao usar o Serviço, você nos concede uma licença mundial, não exclusiva e isenta de royalties para processar, armazenar e exibir esse conteúdo conforme necessário para fornecer o Serviço.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Propriedade Intelectual</h2>
        <p>O Serviço e todo o conteúdo nele contido, incluindo mas não se limitando a texto, gráficos, logotipos, ícones, imagens, clipes de áudio e software, são propriedade da Rhitmo ou de seus licenciadores e são protegidos por leis de direitos autorais e propriedade intelectual.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Privacidade e Proteção de Dados</h2>
        <p>O uso do Serviço está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos e protegemos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitação de Responsabilidade</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">8.1 Isenção de Garantias</h3>
        <p>O Serviço é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas. Não garantimos que o Serviço será ininterrupto, livre de erros ou seguro.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">8.2 Limitação de Danos</h3>
        <p>Na extensão máxima permitida pela lei aplicável, a Rhitmo não será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou uso, decorrentes do uso ou incapacidade de usar o Serviço.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">8.3 Responsabilidade Máxima</h3>
        <p>Nossa responsabilidade total por quaisquer reivindicações relacionadas ao Serviço não excederá o valor pago por você nos 12 meses anteriores ao evento que deu origem à reivindicação.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Modificações dos Termos</h2>
        <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre alterações materiais por e-mail ou através de aviso na plataforma. O uso continuado do Serviço após tais modificações constitui sua aceitação dos novos Termos.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Rescisão</h2>
        <p>Podemos suspender ou encerrar sua conta e acesso ao Serviço, sem aviso prévio, em caso de violação destes Termos ou por qualquer outro motivo, a nosso exclusivo critério.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Lei Aplicável e Foro</h2>
        <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a estes Termos será submetida ao foro da comarca de São Paulo, Estado de São Paulo, com exclusão de qualquer outro, por mais privilegiado que seja.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Disposições Gerais</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">12.1 Integralidade do Acordo</h3>
        <p>Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo integral entre você e a Rhitmo.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">12.2 Renúncia</h3>
        <p>A falha da Rhitmo em exercer ou fazer cumprir qualquer direito ou disposição destes Termos não constituirá renúncia a tal direito ou disposição.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">12.3 Divisibilidade</h3>
        <p>Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contato</h2>
        <p>Para questões sobre estes Termos, entre em contato:</p>
        <p>
          <strong>E-mail:</strong>{" "}
          <a href="mailto:support@rhitmo.co" className="text-primary hover:underline">support@rhitmo.co</a>
        </p>
        <p><strong>Endereço:</strong> São Paulo, Brasil</p>
      </div>
    </LegalPageLayout>
  );
};

export default TermsOfService;
