# Contexto da Empresa na Avaliação Formal (Pilares 1, 2 e 3)

Objetivo: o RH alimenta a Rhitmo com documentos da empresa, a Rhitmo extrai **Valores, Comportamentos e Régua**, o RH edita, e o líder escolhe entre dois caminhos de avaliação, ambos com espelho de coerência e viés. Calibração (Pilar 4) fica fora.

Princípio: nada do que existe hoje muda de comportamento se a empresa não configurar o contexto. O rascunho atual (7 blocos, rubrica do cargo, citações, decisões de calibração) continua sendo o caminho padrão.

---

## Pilar 1 — Contexto da Empresa (RH Admin / Owner)

Nova página **/hr/contexto-empresa** ("Cultura e régua"), no menu do RH, também acessível pelo Setup da Empresa.

**1. Envio de materiais**
- Upload de PDF, Word (.docx), PowerPoint (.pptx), TXT/MD e imagem.
- Google Docs / Slides: nesta fase, via "exportar como PDF/PPTX" (instrução na tela) ou colar texto. Importação direta do Drive fica para depois (exige escopo Drive e revisão do Google, em andamento para o Meet).
- Arquivos guardados em armazenamento privado, só RH/Owner do workspace leem.
- Lista de materiais com status (processando, pronto, erro) e opção de remover.

**2. Extração pela IA — três saídas padrão**
- **Valores**: nome, descrição, "o que significa na prática".
- **Comportamentos**: frases observáveis, cada um ligado a um valor (ou solto), com exemplos de "acima / esperado / abaixo".
- **Régua**: a escala da empresa (ex.: "Precisa subir / Dentro do esperado / Subindo a barra / Acima"), com definição de cada nível e, se houver, regras de promoção e mérito.
- Cada item guarda de qual documento/trecho veio (rastreável).
- A extração gera um **rascunho**; nada vale até o RH publicar.

**3. Edição pelo RH**
- Editar, reordenar, excluir e adicionar valor, comportamento e nível da régua.
- Adicionar **categorias extras** livres (ex.: "Princípios de liderança", "Competências técnicas") com itens próprios.
- Reprocessar com novos documentos: a IA propõe diferenças (novo/alterado) sem apagar edições manuais.
- **Publicar versão** (v1, v2...). Avaliações guardam qual versão usaram, então mudar a régua não altera avaliações antigas.
- Líderes veem a versão publicada em modo leitura.

---

## Pilar 2 — Dois caminhos para o líder

No diálogo "Nova avaliação formal" (CreateFormalReviewDialog), depois de escolher liderado e período, um passo novo "Como quer escrever?":

```text
( ) Rascunho completo  — como hoje: a Rhitmo escreve os 7 blocos.
( ) Guiado pela cultura — para cada valor/comportamento da empresa,
                          a Rhitmo sugere texto + evidências e você decide.
```

- Se a empresa não publicou contexto, só aparece o "Rascunho completo" (com dica para o RH configurar). Comportamento atual intacto.
- Quando há contexto publicado, o "Rascunho completo" também passa a considerar valores e régua da empresa como referência adicional (sem mudar a estrutura de 7 blocos).

**Caminho "Guiado pela cultura"** (nova visão dentro do FormalReviewSheet):
- Lista de cartões, um por valor (com os comportamentos dentro) e, se existir, por competência da rubrica do cargo.
- Em cada cartão: texto sugerido pela IA, evidências citadas (chips existentes de `[doc:UUID]`), nível sugerido na régua da empresa com justificativa de uma linha.
- Ações por cartão: aceitar, editar, regenerar, marcar "sem evidência suficiente", ou deixar em branco.
- Barra de progresso ("4 de 6 valores revisados").
- Ao final, "Montar documento": junta os cartões num documento editável no mesmo editor atual, mais visão geral, desenvolvimento e próximos passos. A partir daí o fluxo existente (rascunho → compartilhar → ciência) é o mesmo.
- O líder pode trocar de caminho antes de compartilhar (com aviso de que o texto atual será mantido como versão anterior).

---

## Pilar 3 — Espelho de coerência e viés (nos dois caminhos)

Painel lateral "Espelho" no editor da avaliação, rodado sob demanda ("Revisar antes de compartilhar") e automaticamente ao tentar compartilhar (aviso, não bloqueio).

Verificações:
1. **Viés de linguagem**: reaproveita a detecção atual no editor (rótulos de personalidade, generalizações) e soma a análise da IA.
2. **Afirmação sem evidência**: frases sem citação ou com citação que não sustenta o que é dito.
3. **Coerência com a régua**: nível escolhido vs. texto (ex.: "Acima do esperado" com texto só de pontos de atenção).
4. **Coerência com o histórico**: avaliação contradiz anotações/1:1s do período (ex.: elogia algo que as notas mostram como problema recorrente).
5. **Recência**: evidências concentradas só nas últimas semanas do período.
6. **Cobertura**: valores da empresa sem nenhuma menção (caminho guiado) ou blocos vazios.

Cada alerta mostra trecho, motivo, evidência e sugestão ("Reescrever", "Ver evidência", "Ignorar"). O líder decide sempre. Alertas ignorados ficam registrados na avaliação (útil para o RH depois, sem expor conteúdo).

---

## O que não muda
- Rascunho atual, citações, rubrica do cargo, decisões de calibração e fluxo de compartilhamento.
- Privacidade: liderado nunca vê o Espelho, sugestões ou documentos da empresa usados como base; só o texto final compartilhado.
- Página de Calibração (Pilar 4 fica para depois).
- Cobrança e limites de IA atuais.

## Ordem de entrega
1. Base de dados + armazenamento + página do RH com edição manual (já útil sem IA).
2. Extração por IA dos documentos.
3. Contexto da empresa no rascunho completo atual.
4. Caminho "Guiado pela cultura".
5. Espelho de coerência e viés.
6. Testes e teste real com a conta da Faster (framework v1.1).

---

## Detalhes técnicos

**Banco (migrations, RLS estrita, GRANTs, sem FK para auth.users)**
- `org_context_documents` (workspace_id, file_path, mime, title, status, extracted_text, error, uploaded_by, created_at).
- `org_context_versions` (workspace_id, version, status draft|published, published_at, published_by).
- `org_context_items` (version_id, workspace_id, kind value|behavior|scale_level|custom, category_label, parent_id, title, description, examples jsonb, position, source_document_id, source_excerpt, edited_manually bool).
- RLS: leitura/escrita para Owner e HR Admin do workspace (funções SECURITY DEFINER plpgsql já usadas, ex. checagem de `hr_admin_ids`/`owner_id`); leitura da versão publicada para líderes do workspace; liderado sem acesso.
- `performance_reviews`: novas colunas nulas `authoring_mode` ('full_draft' default | 'culture_guided'), `org_context_version_id`, `mirror_findings jsonb`.
- Nova tabela `review_culture_items` (review_id, org_item_id, suggested_text, final_text, suggested_level, final_level, citations jsonb, status) com RLS por `manager_id` igual a `performance_reviews`.
- Bucket privado `org-context` com políticas por workspace em `storage.objects`.

**Funções**
- `extract-org-context`: texto já vem do cliente (`fileParser.ts` para PDF/DOCX/imagem; adicionar parser PPTX via JSZip). Chama Lovable AI Gateway com tool-calling para JSON estruturado (valores, comportamentos, régua). Merge sem sobrescrever `edited_manually`.
- `generate-formal-review`: se houver versão publicada, injeta bloco "🏢 CULTURA E RÉGUA DA EMPRESA"; aceita `mode: 'culture_item'` para gerar sugestão por item (reaproveitando o mesmo carregador de evidências RAG).
- `review-mirror`: recebe review_id, carrega texto + evidências + régua, retorna achados estruturados.
- Prompts novos em `_shared/soul/modes/` (`org-context-extraction.md`, `culture-guided-item.md`, `review-mirror.md`) + `regen-docs`; nada inline.
- Todas usam `getUser()`, checagem de posse antes de service_role e `safeSupabase`.

**Frontend**
- `src/pages/HRContextoEmpresa.tsx` (atrás de `HRAdminGuard`), rota em `App.tsx`, item no menu do RH, atalho em `CompanySetup.tsx`.
- `CreateFormalReviewDialog`: passo de escolha de modo.
- `FormalReviewSheet`: visão de cartões quando `authoring_mode='culture_guided'`; painel Espelho em ambos.
- Hooks com `safeQuery/safeFunctionInvoke`; i18n PT/EN/ES.

**Testes**
- Régua: avaliação guarda a versão publicada usada; mudar a régua não altera avaliações existentes.
- Sem contexto publicado, só o modo "Rascunho completo" é oferecido.
- Liderado não lê `org_context_*` nem `mirror_findings`.
- Merge da reextração preserva itens editados manualmente.
