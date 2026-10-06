# Atualizar a Política de Privacidade

Objetivo: deixar a política fiel ao que a Rhitmo faz hoje e pronta para a verificação do app no Google.

## O que muda
- Data de atualização: 6 de outubro de 2026.
- Seção Google reescrita: Google Agenda (somente leitura), Google Meet (somente leitura das transcrições geradas pelo próprio Meet: nomes dos participantes, falas e horários), login com Google. Explica para que cada dado é usado, que nada é lido do Drive, como revogar o acesso e o compromisso com a Google API Services User Data Policy, incluindo Limited Use (os dados do Google não são usados para treinar IA, não são vendidos e não servem para publicidade).
- Novos provedores listados: Recall.ai (bot de gravação e transcrição), provedores de IA usados hoje (Lovable AI / Google Gemini e OpenAI), Slack, note takers conectados pelo próprio líder (Granola, Fireflies, tl;dv, Fathom) e envio de e-mails.
- Retenção: gravações do bot guardadas por 90 dias; transcrições importadas seguem a regra da conta; o RH pode definir retenção por empresa.
- Transcrições brutas visíveis só para o líder; liderados veem apenas o que for compartilhado.
- Transferência internacional atualizada com a lista completa de provedores.
- Remoção de afirmações que não se sustentam: "treinar modelos de IA" passa a dizer que não usamos seus dados para treinar modelos; certificações citadas só quando são do provedor.

## Onde
As duas versões da página precisam dizer o mesmo: a página do app e a versão simples lida pelo Google.

## Detalhes técnicos
- Editar `src/pages/PrivacyPolicy.tsx` e `public/privacy-policy/index.html` com o mesmo conteúdo.
- Sem mudanças de banco ou funções.
