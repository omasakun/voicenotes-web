import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function main() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log("No users found. Creating default admin user...");

    const user = await auth.api.createUser({
      body: {
        email: "admin@example.com",
        name: "Admin User",
        password: "admin123",
        role: "admin",
      },
    });
  } else {
    console.log(`Found ${userCount} existing users. Skipping admin user creation.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
