import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function seedDatabase() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log("No users found. Creating default admin user...");

    await auth.api.createUser({
      body: {
        email: "admin@example.com",
        name: "Admin User",
        password: "admin123",
        role: "admin",
      },
    });
  }
}
