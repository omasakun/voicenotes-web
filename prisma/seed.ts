import { hashPassword } from "@/lib/bcrypt";
import { prisma } from "@/lib/prisma";

prisma.user.create({
  data: {
    email: "admin@example.com",
    name: "Admin",
    hash: await hashPassword("password"),
    isAdmin: true,
  },
});
