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
- **`/relatorios`** (requer login) — movimento de cada fila em um período:
  senhas emitidas, atendimentos concluídos, faltas, cancelamentos, espera média
  e duração média do atendimento.

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

O envio é feito pela **Twilio**. Sem as credenciais configuradas o sistema roda
em modo simulado e a mensagem apenas aparece no log do servidor:

```
[whatsapp:simulado] para 5511998887777: Olá, Maria! Sua senha #3 (Atendimento Geral) acabou de ser chamada...
```

Para enviar de verdade, preencha as três variáveis no `.env`:

```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="seu-auth-token"
TWILIO_WHATSAPP_FROM="+14155238886"   # número do sandbox da Twilio
```

O `ACCOUNT_SID` e o `AUTH_TOKEN` ficam no painel da Twilio (Console → Account
Info). Para testar sem aprovar uma conta comercial, use o **WhatsApp Sandbox**
(Console → Messaging → Try it out → Send a WhatsApp message): cada paciente
precisa mandar uma vez o código `join <palavra>` para o número do sandbox antes
de conseguir receber mensagens.

Uma falha no envio nunca impede a recepção de chamar o paciente — o erro é
registrado no log e a senha segue chamada normalmente, apenas sem o selo
"Avisado no WhatsApp".

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

## Relatório de atendimentos

Em `/relatorios` a equipe escolhe um período (hoje, 7 dias, 30 dias ou datas
específicas) e vê, por fila:

| Coluna | O que mede |
| ------- | ----------- |
| Emitidas | senhas criadas no período |
| Atendidas | atendimentos concluídos |
| Faltas | pacientes que não compareceram quando chamados |
| Canceladas | senhas canceladas pela recepção |
| Em aberto | senhas do período ainda aguardando ou em atendimento |
| Espera média | da emissão da senha até a chamada |
| Duração média | do início ao fim do atendimento |

As senhas são contadas pela data de emissão, no fuso do servidor. Os tempos
médios do total são calculados sobre todas as senhas, não pela média das médias
das filas — assim uma fila de baixo volume não distorce o número.

O botão **Baixar CSV** exporta exatamente as linhas da tela (o arquivo é gerado
no servidor, pelos mesmos dados). O separador é `;` e o arquivo leva um BOM
UTF-8, para abrir direto no Excel em português sem quebrar colunas nem acentos.
O período fica no nome do arquivo
(`relatorio-atendimentos-2026-09-01_a_2026-09-08.csv`), mantendo o conteúdo
puramente tabular para importar em outras ferramentas.

## Próximos passos sugeridos

- Sair do sandbox da Twilio para um número WhatsApp aprovado (produção).
- Relatório por profissional, além de por fila.
- Tela de gestão de usuários de recepção (hoje é feita via `npm run staff:create`).
