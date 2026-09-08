# Clínica — Gestão de Filas

Sistema de gerenciamento de filas de atendimento para clínicas: a recepção emite
senhas e chama os pacientes, um painel exibe as chamadas em uma TV, e o paciente
consulta sua posição na fila e **quanto tempo falta para ser atendido**.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite

## Como rodar localmente

```bash
npm install
cp .env.example .env   # se ainda não existir
# gere um AUTH_SECRET e cole no .env: openssl rand -hex 32
npx prisma migrate dev # cria o banco SQLite local (dev.db)
npm run db:seed        # cria filas de exemplo e o usuário de recepção
npm run dev
```

Acesse `http://localhost:3000`.

## Telas

- **`/recepcao`** (requer login) — emitir senhas, chamar o próximo paciente,
  iniciar/concluir atendimento, marcar não comparecimento e cancelar senhas.
- **`/painel`** — painel para exibir em uma TV na sala de espera, com a senha
  chamada em cada fila (atualiza automaticamente).
- **`/senha`** — o paciente informa a fila e o número da senha para ver sua
  posição e o **tempo estimado de espera**.

## Login da recepção

O `npm run db:seed` cria um usuário padrão: `recepcao` / `trocar123` (ou os
valores definidos em `STAFF_USERNAME`/`STAFF_PASSWORD`/`STAFF_NAME` no `.env`
antes de rodar o seed). **Troque essa senha antes de usar em produção.**

Para criar ou atualizar outros usuários de recepção:

```bash
npm run staff:create -- <usuario> <senha> "Nome do atendente"
```

A sessão é guardada em um cookie `httpOnly` assinado com `AUTH_SECRET`
(`src/lib/auth.ts`), validado em `src/proxy.ts` — o Proxy do Next.js (antigo
`middleware.ts`) que protege a página `/recepcao` e as rotas de API usadas
para emitir/chamar/atualizar senhas. As rotas de consulta usadas pelo
paciente e pelo painel público continuam sem autenticação.

## Como funciona a estimativa de tempo de espera

Para cada fila, o sistema calcula o tempo médio de atendimento com base nos
últimos atendimentos concluídos (`src/lib/wait-time.ts`). Enquanto não há
histórico suficiente, usa o tempo médio padrão configurado na fila.

A estimativa de um paciente aguardando é:

```
tempo estimado = (pacientes na frente × tempo médio de atendimento)
                + tempo restante do atendimento em andamento (se houver)
```

A página `/senha/[id]` atualiza essa estimativa automaticamente a cada poucos
segundos.

## Aviso por WhatsApp

Ao emitir uma senha, a recepção pode informar o WhatsApp do paciente (campo
opcional). Quando essa senha é chamada, o sistema envia automaticamente uma
mensagem avisando o paciente, e a recepção passa a ver "Avisado no WhatsApp"
no cartão da fila.

**O envio está em modo simulado**: enquanto `WHATSAPP_ENABLED` não for `true`,
a mensagem apenas aparece no log do servidor:

```
[whatsapp:simulado] para 5511998887777: Olá, Maria! Sua senha #3 (Atendimento Geral) acabou de ser chamada...
```

Para enviar de verdade, implemente a chamada do seu provedor (Twilio, Meta
WhatsApp Cloud API, Z-API...) na função `deliver()` de `src/lib/whatsapp.ts` e
defina `WHATSAPP_ENABLED="true"`. Uma falha no envio nunca impede a recepção de
chamar o paciente — o erro é registrado no log e a senha segue chamada
normalmente.

O telefone é guardado em formato E.164 (ex: `5511998887777`) e **nunca é
exposto** nas rotas públicas usadas pelo painel e pela consulta do paciente.

## Modelo de dados

- **Queue** (fila): nome, descrição, tempo médio de atendimento padrão.
- **Ticket** (senha): número (reinicia a cada dia por fila), nome e WhatsApp
  (opcional) do paciente, status (`WAITING`, `CALLED`, `IN_SERVICE`, `DONE`,
  `NO_SHOW`, `CANCELLED`), os horários de cada transição e quando o aviso de
  WhatsApp foi enviado.

## Scripts

| Comando               | Descrição                                     |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`           | inicia o servidor de desenvolvimento           |
| `npm run build`         | build de produção                              |
| `npm run start`         | roda o build de produção                       |
| `npm run lint`          | roda o ESLint                                  |
| `npm run db:migrate`    | cria/aplica migrations do Prisma               |
| `npm run db:studio`     | abre o Prisma Studio para inspecionar o banco  |
| `npm run db:seed`       | popula o banco com filas de exemplo e usuário de recepção |
| `npm run staff:create`  | cria/atualiza um usuário de recepção            |

## Próximos passos sugeridos

- Conectar um provedor real de WhatsApp (hoje o envio é simulado).
- Histórico e relatórios de atendimento por fila.
- Tela de gestão de usuários de recepção (hoje é feita via `npm run staff:create`).
