

## Plano de teste: Funcionalidades de poder do Admin

Vou rodar uma bateria sequencial de testes via browser no painel `/admin`, validando cada ação destrutiva e de gestão **com usuários descartáveis** (que crio e deleto durante o teste). Nenhum dado real seu será afetado — só uso usuários "fantoche" que eu mesmo crio.

### O que vou testar

**Bloco 1 — Aba Usuários (`AdminUsers.tsx`)**
1. **Sort/Filtro**: clicar nos headers Nome/Status, alternar filtro de papel e status. Confirmar que reordena e filtra corretamente.
2. **Reset de senha**: enviar reset para um usuário e confirmar toast "Reset enviado".
3. **Suspender/Ativar workspace**: clicar PowerOff num workspace, confirmar status muda para Suspenso; reativar.
4. **Impersonate**: clicar no olho num usuário não-admin, confirmar redirect para `/dashboard` com banner amarelo, depois "Encerrar".
5. **Deletar usuário**: criar via Importar em Massa um usuário fake (ex.: `qa-delete@rhitmo.dev`), depois deletá-lo via botão Trash. Confirmar que sumiu da listagem e do `auth.users`.

**Bloco 2 — Aba Estrutura (`AdminStructure.tsx`)**
6. **Criar workspace** (com owner e plano selecionados) → confirmar criação.
7. **Criar time** dentro do workspace → confirmar.
8. **Criar membro** dentro do time → confirmar.
9. **Editar** workspace/time/membro (rename) → confirmar.
10. **Mover membro** entre times via dropdown → confirmar.
11. **Deletar em cascata**: deletar membro → time → workspace de teste. Confirmar que cascata limpa filhos sem orphan.

**Bloco 3 — Aba Acesso (`AdminAccess.tsx`)**
12. **Atribuir HR Admin** a um workspace via botão → validar badge HR aparece em Usuários.
13. **Trocar Owner** de um workspace de teste → validar.

**Bloco 4 — Aba Inteligência**
14. Carregar a aba e confirmar que Health Scores aparecem (era bug recente, validar regressão).

### Como reporto

Para cada bloco, te trago:
- ✅/❌ por ação
- Screenshot quando há mudança visual relevante (3-4 no total, não a cada clique)
- Lista de bugs encontrados (se houver) com fix sugerido — paro e te aviso antes de corrigir, conforme regra do projeto

### Salvaguardas
- **Não toco em workspaces existentes** (`Rhitmo Inc.`, `Faster Ops`, etc.) — só nos que eu criar com prefixo `[QA]`
- **Não deleto usuários reais** — só os fake que eu criar (ex.: `qa-*@rhitmo.dev`)
- **No final, faço cleanup**: deleto tudo que criei

### Tempo estimado
~10-15 minutos de execução no browser. Te trago um relatório consolidado ao final.

