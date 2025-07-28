import { seedDatabase } from "@/lib/prisma-seed";

seedDatabase().catch((e) => {
  console.error(e);
  process.exit(1);
});
