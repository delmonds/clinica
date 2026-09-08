import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/auth";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function seedQueues() {
  const existing = await prisma.queue.count();
  if (existing > 0) {
    console.log("Já existem filas cadastradas, seed de filas ignorado.");
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

async function seedStaff() {
  const username = (process.env.STAFF_USERNAME ?? "recepcao").trim().toLowerCase();
  const existing = await prisma.staff.findUnique({ where: { username } });
  if (existing) {
    console.log(`Usuário de recepção "${username}" já existe, seed de staff ignorado.`);
    return;
  }

  const password = process.env.STAFF_PASSWORD ?? "trocar123";
  const passwordHash = await hashPassword(password);

  await prisma.staff.create({
    data: { username, name: process.env.STAFF_NAME ?? "Recepção", passwordHash },
  });

  console.log(`Usuário de recepção criado -> usuário: "${username}" / senha: "${password}"`);
  console.log("Troque essa senha em produção (veja README) ou defina STAFF_USERNAME/STAFF_PASSWORD antes do seed.");
}

async function main() {
  await seedQueues();
  await seedStaff();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
