import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/auth";

const [username, password, ...nameParts] = process.argv.slice(2);

if (!username || !password) {
  console.error("Uso: npm run staff:create -- <usuario> <senha> [nome]");
  process.exit(1);
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const normalizedUsername = username.trim().toLowerCase();
  const name = nameParts.join(" ") || normalizedUsername;
  const passwordHash = await hashPassword(password);

  const staff = await prisma.staff.upsert({
    where: { username: normalizedUsername },
    update: { passwordHash, name },
    create: { username: normalizedUsername, passwordHash, name },
  });

  console.log(`Usuário "${staff.username}" (${staff.name}) pronto para login.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
