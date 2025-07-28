import { migrateDatabase } from "./prisma-migration";
import { seedDatabase } from "./prisma-seed";
import { initializeTranscriptionQueue } from "./transcription";

let isStarted = false;

export async function startup() {
  if (isStarted) return;
  isStarted = true;
  console.log("Starting application...");
  await migrateDatabase();
  await seedDatabase();
  await initializeTranscriptionQueue();
  console.log("Application started successfully.");
}
