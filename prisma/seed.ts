import { hashPassword } from "@/lib/bcrypt";
import { prisma } from "@/lib/prisma";

async function main() {
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      hash: await hashPassword("password"),
      isAdmin: true,
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
