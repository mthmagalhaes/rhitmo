# Trazer notas do Granola (e outros) para Anotações & Evidências sem sair da tela

## Hoje, o que o líder faz
- Com o Granola conectado, as notas chegam sozinhas a cada 30 min. A nota entra direto para a pessoa certa só quando o e-mail de um liderado está nos convidados ou o primeiro nome dele aparece no título.
- Uma conversa que não estava na agenda (sem convidados) não casa com ninguém e fica "pendente". Para dar um dono a ela, é preciso ir em Configurações > Conectores, abrir o card do Granola e escolher o liderado. Esse caminho fica escondido e nada avisa que a nota chegou.
- A outra saída é copiar e colar (Magic Paste), com mais passos.

**Atalho que já funciona hoje:** colocar o nome do liderado no título da nota no Granola (ex.: "Conversa difícil - Rafael") e clicar em "Sincronizar agora". A nota vai direto para ele.

## O que vamos construir

### 1. Botão "Importar do Granola" dentro de Anotações & Evidências
- Ao lado de "Nova anotação", um botão **Importar** abre um painel com as notas recentes do note taker conectado (últimos 14 dias): título, data e quanto tempo durou, com um selo de "já importada" quando for o caso.
- O líder escolhe a nota, escolhe o liderado (já vem sugerido quando dá para adivinhar) e confirma. A nota entra no diário com o chip de origem, o resumo da IA e fica privada, como qualquer anotação.
- Se o liderado estiver selecionado na lista da esquerda, ele já vem marcado.
- Sem conector ligado, o mesmo botão mostra "Conectar Granola / Fireflies" (conexão em 3 passos, sem sair da página) e "Colar transcrição" como alternativa.

### 2. Notas sem dono aparecem onde o líder está
- Faixa no topo de Anotações & Evidências: "2 notas do Granola esperando um dono", com atribuição ali mesmo (escolher o liderado ou descartar).
- Mesmo aviso, compacto, no card de Início e na sincronização da madrugada (sem novos e-mails).

### 3. Sincronização na hora
- Ao abrir o painel Importar, busca as notas novas na hora, sem esperar os 30 minutos. A conversa que acabou de terminar já aparece.

### 4. Conectores mais fáceis de achar
- Item "Conectores" próprio no menu lateral do líder (hoje está dentro de Configurações), com o status de cada note taker.
- Quem ainda não conectou vê um convite único e dispensável em Anotações & Evidências.

### 5. Colar ficou mais curto (para quem não usa conector)
- O "Colar transcrição" aceita o texto copiado do Granola, Otter, Tactiq etc. e sugere o liderado pelo nome citado, sem exigir que o líder preencha tipo ou data.

## Fora desta rodada
- Extensão de navegador ou atalho dentro do próprio Granola (o Granola não permite botão de terceiros).
- Novos note takers além de Granola e Fireflies.

## Detalhes técnicos
- `note-taker-connect`: nova ação `list_recent` (lista as notas do provedor em N dias, sincroniza e marca as já importadas pela tabela de notas importadas) e `import_note` (noteId + memberId → reaproveita `ingestNoteForMember`, com dedupe pelo id externo). Mesma checagem de dono já usada em `assign`.
- Novo componente `ImportFromNoteTakerSheet` em `src/components/leader/diario/`, usado em `src/pages/lider/Diario.tsx`; `PendingNotesBanner` usando `pending` de `useNoteTaker` (já existe `list_pending`/`assign`/`dismiss`).
- `matchMembers` em `noteTakerSync.ts` ganha sugestão por nome no conteúdo (não só no título), usada apenas como sugestão no painel, nunca para atribuir sozinho.
- Menu: entrada "Conectores" no `AppSidebar` apontando para a tela de conectores já existente; prefetch em `routeDataPrefetch.ts`.
- Sem mudança de RLS: notas continuam `private_leader`, transcrição bruta só do líder.
- Respeita a trava do teste encerrado (`useBillingGate`), igual criar anotação.
