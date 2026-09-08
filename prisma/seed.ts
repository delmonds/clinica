import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.queue.count();
  if (existing > 0) {
    console.log("Já existem filas cadastradas, seed ignorado.");
    return;
  }

  await prisma.queue.createMany({
    data: [
      { name: "Atendimento Geral", description: "Consultas de rotina", defaultServiceMins: 15 },
      { name: "Prioritário", description: "Idosos, gestantes e urgências", defaultServiceMins: 10 },
      { name: "Exames", description: "Coleta e exames laboratoriais", defaultServiceMins: 8 },
    ],
  });

  console.log("Filas de exemplo criadas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
