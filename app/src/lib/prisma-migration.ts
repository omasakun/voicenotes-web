import { execa } from "execa";

export async function migrateDatabase() {
  if (import.meta.env.DEV) {
    console.log("Running in development mode, skipping migration deployment.");
  } else {
    const { failed } = await execa({ stderr: "inherit", reject: false })`npm exec prisma migrate deploy`;
    if (!failed) {
      console.log("Migration deployment completed successfully.");
    } else {
      console.error("Migration deployment failed.");
      process.exit(1);
    }
  }
}
