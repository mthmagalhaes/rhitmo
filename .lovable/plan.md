<final-text>Do I know what the issue is? Sim.

O problema real hoje não parece mais ser o RPC do banco. O problema que ainda quebra o acesso do Guilherme é a incompatibilidade do parâmetro do link.

Check que eu fiz:
- Em `src/pages/Invite.tsx`, a página lê apenas `searchParams.get('code')`
- No histórico desse caso, o link enviado para o Guilherme estava no formato `.../invite?token=...`
- Em `src/components/InviteMemberDialog.tsx`, o sistema atual já monta o convite como `.../invite?code=...`
- A migration que trocou `get_invite_details` para `text` já existe, então o bug antigo de tipo foi corrigido

Validação prática que bate com isso:
- `.../invite?token=...` continua abrindo “Convite Inválido”
- `.../invite?code=...` já entra em “Validando convite...”

Conclusão do check:
- O link antigo com `token=` não está confiável no código atual
- O formato que está alinhado com o frontend hoje é `code=`
- Então, do jeito que o app está agora, o link que tende a funcionar é o convite no formato `.../invite?code=<uuid>`, não `.../invite?token=<uuid>`

Arquivos envolvidos:
- `src/pages/Invite.tsx`
- `src/components/InviteMemberDialog.tsx`
- `supabase/migrations/20260413153413_38de2b24-51f6-4f81-8dfd-a2ee56fe5bed.sql`

Plano para blindar isso de vez:
1. Ajustar `Invite.tsx` para aceitar os dois formatos:
```text
const inviteCode = searchParams.get('code') ?? searchParams.get('token')
```
2. Padronizar a geração e o compartilhamento dos convites em um único formato
3. Testar fim a fim:
   - convite com `code`
   - convite com `token`
   - convite já usado
   - convite expirado/inválido

Resumo objetivo:
- Se você quer só o check: eu não confiaria no link antigo com `token`
- Eu confiaria no link com `code`, porque é esse que o frontend atual entende</final-text>