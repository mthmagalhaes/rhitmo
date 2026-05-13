// IMPORTANTE: Esta página é renderizada apenas para usuários com a SPA carregada.
// Crawlers (ex.: validador OAuth do Google) recebem o HTML estático em
// `public/privacy-policy/index.html`. Ao alterar o conteúdo aqui, atualize
// também o arquivo estático para manter consistência.
import { LegalPageLayout } from "@/components/LegalPageLayout";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: 18 de março de 2026</p>

      <div className="space-y-6 text-base leading-relaxed text-foreground">
        <p>
          A RHITMO, com sede em São Paulo, Brasil, operadora da plataforma Rhitmo ("Rhitmo", "nós" ou "nosso"), está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários.
        </p>
        <p>
          Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - "LGPD").
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Dados Pessoais Coletados</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">1.1 Dados Fornecidos por Você</h3>

        <p><strong>Dados de cadastro:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Nome completo</li>
          <li>Endereço de e-mail</li>
          <li>Senha (armazenada de forma criptografada)</li>
          <li>Foto de perfil (opcional)</li>
          <li>Nome da empresa/workspace</li>
          <li>Cargo ou função</li>
        </ul>

        <p className="mt-4"><strong>Dados de uso da plataforma:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Feedbacks e anotações sobre liderados</li>
          <li>Notas de reuniões e transcrições de áudio</li>
          <li>Conversas com a Rhitmo (assistente de IA)</li>
          <li>Planos de desenvolvimento individual (PDI)</li>
          <li>Avaliações formais de desempenho</li>
          <li>Metas e objetivos</li>
        </ul>

        <p className="mt-4"><strong>Dados de pagamento:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Informações de cartão de crédito (processadas e armazenadas exclusivamente pelo Stripe, nosso provedor de pagamentos)</li>
          <li>Histórico de transações</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">1.2 Dados Coletados Automaticamente</h3>
        <ul className="list-disc ml-6 space-y-2">
          <li>Endereço IP</li>
          <li>Tipo de navegador e dispositivo</li>
          <li>Sistema operacional</li>
          <li>Páginas visitadas e tempo de navegação</li>
          <li>Data e horário de acesso</li>
          <li>Logs de atividade na plataforma</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">1.3 Dados Sensíveis</h3>
        <p>Não coletamos intencionalmente dados sensíveis (origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dados genéticos ou biométricos, dados de saúde ou vida sexual). Caso você inclua tais informações em feedbacks ou notas, será sua responsabilidade e você nos concede consentimento explícito para processá-las conforme necessário para fornecer o Serviço.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Base Legal e Finalidades do Tratamento</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">2.1 Base Legal (LGPD)</h3>
        <p>Tratamos seus dados pessoais com base nas seguintes hipóteses legais:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Execução de contrato:</strong> Para fornecer o Serviço contratado (Art. 7º, V da LGPD)</li>
          <li><strong>Consentimento:</strong> Para funcionalidades específicas que requerem sua autorização expressa (Art. 7º, I da LGPD)</li>
          <li><strong>Legítimo interesse:</strong> Para melhorar o Serviço, prevenir fraudes e garantir segurança (Art. 7º, IX da LGPD)</li>
          <li><strong>Cumprimento de obrigação legal:</strong> Para atender requisitos fiscais, contábeis e regulatórios (Art. 7º, II da LGPD)</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">2.2 Finalidades do Tratamento</h3>
        <p>Utilizamos seus dados pessoais para:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Criar e gerenciar sua conta</li>
          <li>Fornecer as funcionalidades da plataforma (feedbacks, transcrições, analytics)</li>
          <li>Processar pagamentos e emitir faturas</li>
          <li>Enviar comunicações sobre o Serviço (atualizações, manutenção)</li>
          <li>Melhorar e personalizar sua experiência</li>
          <li>Prevenir fraudes e garantir segurança</li>
          <li>Cumprir obrigações legais e regulatórias</li>
          <li>Treinar e aprimorar modelos de inteligência artificial (de forma agregada e anonimizada)</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Compartilhamento de Dados</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">3.1 Provedores de Serviços Terceirizados</h3>
        <p>Compartilhamos seus dados com os seguintes prestadores de serviços, que atuam como operadores de dados sob nossas instruções:</p>

        <p className="mt-4"><strong>Supabase (armazenamento de dados):</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Finalidade: Hospedagem de banco de dados e autenticação</li>
          <li>Localização: Estados Unidos</li>
          <li>Garantias: Cláusulas contratuais padrão (SCC) e certificação SOC 2 Type II</li>
        </ul>

        <p className="mt-4"><strong>OpenAI (processamento de IA):</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Finalidade: Transcrição de reuniões (Whisper API) e assistente de IA (GPT)</li>
          <li>Localização: Estados Unidos</li>
          <li>Dados compartilhados: Áudio de reuniões, mensagens da Rhitmo</li>
          <li>Garantias: Cláusulas de proteção de dados e política de não-treinamento em dados de clientes</li>
        </ul>

        <p className="mt-4"><strong>Stripe (processamento de pagamentos):</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Finalidade: Processamento de pagamentos e gerenciamento de assinaturas</li>
          <li>Localização: Estados Unidos e global</li>
          <li>Dados compartilhados: Informações de pagamento, e-mail, nome</li>
          <li>Garantias: Certificação PCI-DSS Level 1</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">3.2 Compartilhamento Dentro do Workspace</h3>
        <p>Dados inseridos na plataforma (feedbacks, notas, PDIs) são compartilhados dentro do seu workspace conforme as permissões configuradas:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Líderes têm acesso aos dados de seus liderados</li>
          <li>HR Admins (plano Business) têm acesso a métricas agregadas do workspace</li>
          <li>Liderados têm acesso aos seus próprios dados através do portal "Meu Rhitmo"</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">3.3 Exigências Legais</h3>
        <p>Podemos divulgar seus dados se exigido por lei, ordem judicial, autoridade governamental ou para proteger nossos direitos legais.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">3.4 Não Vendemos Seus Dados</h3>
        <p>Não vendemos, alugamos ou comercializamos seus dados pessoais para terceiros.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Transferência Internacional de Dados</h2>
        <p>Alguns de nossos provedores de serviços estão localizados nos Estados Unidos (Supabase, OpenAI, Stripe). A transferência de dados para esses países é realizada com base em:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Cláusulas Contratuais Padrão (SCC) aprovadas pela Comissão Europeia</li>
          <li>Certificações de segurança (SOC 2, ISO 27001, PCI-DSS)</li>
          <li>Compromissos contratuais de proteção de dados</li>
        </ul>
        <p>Você tem o direito de obter informações sobre as garantias adotadas para a transferência internacional de seus dados.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Retenção de Dados</h2>

        <h3 className="text-xl font-medium mt-6 mb-3">5.1 Dados de Conta Ativa</h3>
        <p>Mantemos seus dados enquanto sua conta estiver ativa e por quanto tempo for necessário para fornecer o Serviço.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">5.2 Dados Após Cancelamento</h3>
        <p>Após o cancelamento da assinatura:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Plano Pulse:</strong> Dados mantidos indefinidamente (plano gratuito)</li>
          <li><strong>Planos pagos:</strong> Dados mantidos por 90 dias após cancelamento, permitindo reativação. Após esse período, dados são excluídos ou anonimizados, exceto quando exigido por lei.</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3">5.3 Dados Fiscais e Contábeis</h3>
        <p>Dados relacionados a pagamentos e transações são mantidos por 5 anos, conforme exigido pela legislação tributária brasileira.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">5.4 Logs de Segurança</h3>
        <p>Logs de acesso e segurança são mantidos por até 12 meses.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Segurança dos Dados</h2>
        <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>

        <p className="mt-4"><strong>Medidas técnicas:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Criptografia em trânsito (TLS 1.3) e em repouso (AES-256)</li>
          <li>Autenticação segura com hashing de senhas (bcrypt)</li>
          <li>Row Level Security (RLS) no banco de dados</li>
          <li>Firewalls e monitoramento de intrusões</li>
          <li>Backups automáticos diários</li>
        </ul>

        <p className="mt-4"><strong>Medidas organizacionais:</strong></p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Acesso restrito aos dados em base "need-to-know"</li>
          <li>Treinamento de equipe sobre proteção de dados</li>
          <li>Políticas internas de segurança da informação</li>
          <li>Testes de segurança periódicos</li>
        </ul>

        <p>Apesar de nossos esforços, nenhum sistema é 100% seguro. Em caso de incidente de segurança que afete seus dados, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela LGPD.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Seus Direitos (LGPD)</h2>
        <p>Como titular de dados pessoais, você tem os seguintes direitos:</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.1 Confirmação e Acesso</h3>
        <p>Direito de confirmar se tratamos seus dados e solicitar acesso a eles.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.2 Correção</h3>
        <p>Direito de corrigir dados incompletos, inexatos ou desatualizados.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.3 Anonimização, Bloqueio ou Eliminação</h3>
        <p>Direito de solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.4 Portabilidade</h3>
        <p>Direito de solicitar a portabilidade de seus dados a outro fornecedor de serviço, mediante requisição expressa.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.5 Eliminação de Dados Tratados com Consentimento</h3>
        <p>Direito de eliminar dados cujo tratamento foi baseado em consentimento.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.6 Informação sobre Compartilhamento</h3>
        <p>Direito de saber com quais entidades públicas e privadas compartilhamos seus dados.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.7 Informação sobre Não Consentimento</h3>
        <p>Direito de ser informado sobre as consequências de não fornecer consentimento.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.8 Revogação de Consentimento</h3>
        <p>Direito de revogar o consentimento a qualquer momento.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.9 Oposição ao Tratamento</h3>
        <p>Direito de se opor ao tratamento realizado com base em legítimo interesse.</p>

        <h3 className="text-xl font-medium mt-6 mb-3">7.10 Revisão de Decisões Automatizadas</h3>
        <p>Direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado.</p>

        <p>Para exercer seus direitos, entre em contato conosco através do e-mail{" "}
          <a href="mailto:support@rhitmo.co" className="text-primary hover:underline">support@rhitmo.co</a>
          {" "}ou da seção de configurações da plataforma.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cookies e Tecnologias Similares</h2>
        <p>Atualmente, a Rhitmo <strong>não utiliza cookies</strong> para rastreamento ou analytics. Utilizamos apenas cookies estritamente necessários para:</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>Manter você autenticado na plataforma</li>
          <li>Lembrar suas preferências de tema (claro/escuro)</li>
        </ul>
        <p>Esses cookies são essenciais para o funcionamento do Serviço e não coletam informações para fins de marketing ou publicidade.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Crianças e Adolescentes</h2>
        <p>O Serviço não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes. Se tomarmos conhecimento de que coletamos dados de um menor sem o consentimento adequado, tomaremos medidas para excluir tais informações.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Alterações nesta Política</h2>
        <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações materiais por e-mail ou através de aviso na plataforma. A data da "Última atualização" no topo desta página indica quando a Política foi revisada pela última vez.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Encarregado de Proteção de Dados (DPO)</h2>
        <p>Nosso Encarregado de Proteção de Dados (Data Protection Officer) é responsável por garantir a conformidade com a LGPD e atender suas solicitações relacionadas a dados pessoais.</p>
        <p>
          <strong>Contato do DPO:</strong><br />
          <strong>E-mail:</strong>{" "}
          <a href="mailto:support@rhitmo.co" className="text-primary hover:underline">support@rhitmo.co</a><br />
          <strong>Endereço:</strong> São Paulo, Brasil
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Autoridade de Proteção de Dados</h2>
        <p>Você tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD) se acreditar que o tratamento de seus dados pessoais viola a LGPD.</p>
        <p>
          <strong>ANPD:</strong><br />
          Website:{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.gov.br/anpd</a><br />
          E-mail:{" "}
          <a href="mailto:comunicacao@anpd.gov.br" className="text-primary hover:underline">comunicacao@anpd.gov.br</a>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contato</h2>
        <p>Para dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados pessoais:</p>
        <p>
          <strong>E-mail:</strong>{" "}
          <a href="mailto:support@rhitmo.co" className="text-primary hover:underline">support@rhitmo.co</a><br />
          <strong>Endereço:</strong> São Paulo, Brasil
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
