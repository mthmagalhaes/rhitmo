# Rhitmo 2.0 — o que falta

## Já está no ar (verificado agora no projeto)

- Bloco 1 Calibrações e Bloco 2 Rede passiva (ONA).
- Bloco 3 Auto Draft: avaliação formal com rede + calibração, rascunho de pauta de 1:1 sob demanda, prompts na "alma".
- Otter encerrado como conector (caminho oficial é colar a transcrição).
- Note taker como primeiro passo do checklist do líder.
- Painel de adoção de note taker na área de administração.
- Pacote de confiança: página pública, Governança do RH, verificação em duas etapas, rede mais restrita.
- Tour guiado de líder e de RH.
- Limpeza do v1: rotas antigas viraram redirecionamentos.

## O que falta

### 1. Prazo de guarda que realmente apaga (alta)
Hoje o RH escolhe por quantos dias guardar as transcrições, mas a limpeza automática ignora essa escolha e usa 90 dias fixos só para gravações. Fazer a rotina respeitar o prazo de cada empresa e também apagar o texto das transcrições vencidas. Sem isso, a promessa da tela de Governança não se cumpre.

### 2. Valor visível logo na primeira importação (alta)
Depois de conectar o note taker e sincronizar, a pessoa recebe só um aviso. Passar a mostrar: quantas notas entraram, ligadas a quem, o que ficou sem dono, e um atalho para perguntar à Rhitmo sobre uma dessas pessoas.

### 3. Reunião entra no mapa de rede (média)
A rede hoje se alimenta de sinais do Slack. Somar quem participa das mesmas reuniões, usando só a lista de participantes, nunca conteúdo. É o item que mais fortalece a camada "Pessoas", hoje a mais fraca das quatro.

### 4. Texto da página pública nas quatro camadas (média)
Reescrever o posicionamento em torno de pessoas, evidências, padrões e percepções, para um CHRO entender em dez segundos por que não é mais um app de notas. Só texto, pt e en.

### 5. Rubrica em toda avaliação (média)
A camada "Padrões" está parcial: o framework de competências existe mas boa parte das avaliações não se ancora nele. Fazer o ciclo escolher um framework e o rascunho citar a rubrica.

## Fora desta rodada

- SSO corporativo: espera um cliente que forneça os dados do provedor de identidade.
- Depoimentos reais na landing: coleta com você, não é trabalho de engenharia.
- Corte definitivo do v1: só quando o uso justificar.

## Notas técnicas

- Item 1: `purge-recall-recordings` passa a ler `workspaces.transcript_retention_days` por workspace em vez do corte fixo de 90 dias; nova etapa apagando `meeting_transcripts` vencidas (texto e resumo estruturado), com log em `access_audit_log`. Sem tabela nova.
- Item 2: retorno de `action: 'sync'` em `note-taker-connect` já traz contagens; expor num resumo pós-sincronização com link para Anotações & Evidências filtrado pela origem e atalho para o Mentor.
- Item 3: `detect-network-signals` ganha fonte `meeting`, derivada dos participantes de `meetings`/`recall` já armazenados; peso menor que menção direta; `rebuild_team_network` agrega igual.
- Item 5: campo de framework no ciclo de avaliação e injeção da rubrica no modo `formal-review-draft` da alma.
- Nenhuma mudança de preço nem de RLS.

## Ordem sugerida

1 e 2 juntos, depois 3, depois 5, e 4 quando sobrar fôlego.
