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
npx prisma migrate dev # cria o banco SQLite local (dev.db)
npm run db:seed        # cria filas de exemplo (Geral, Prioritário, Exames)
npm run dev
```

Acesse `http://localhost:3000`.

## Telas

- **`/recepcao`** — emitir senhas, chamar o próximo paciente, iniciar/concluir
  atendimento, marcar não comparecimento e cancelar senhas.
- **`/painel`** — painel para exibir em uma TV na sala de espera, com a senha
  chamada em cada fila (atualiza automaticamente).
- **`/senha`** — o paciente informa a fila e o número da senha para ver sua
  posição e o **tempo estimado de espera**.

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

## Modelo de dados

- **Queue** (fila): nome, descrição, tempo médio de atendimento padrão.
- **Ticket** (senha): número (reinicia a cada dia por fila), nome do
  paciente, status (`WAITING`, `CALLED`, `IN_SERVICE`, `DONE`, `NO_SHOW`,
  `CANCELLED`) e os horários de cada transição.

## Scripts

| Comando               | Descrição                                     |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`           | inicia o servidor de desenvolvimento           |
| `npm run build`         | build de produção                              |
| `npm run start`         | roda o build de produção                       |
| `npm run lint`          | roda o ESLint                                  |
| `npm run db:migrate`    | cria/aplica migrations do Prisma               |
| `npm run db:studio`     | abre o Prisma Studio para inspecionar o banco  |
| `npm run db:seed`       | popula o banco com filas de exemplo            |

## Próximos passos sugeridos

- Autenticação para a recepção (hoje a tela de recepção é aberta).
- Notificação ao paciente (SMS/WhatsApp) quando a senha for chamada.
- Histórico e relatórios de atendimento por fila.
