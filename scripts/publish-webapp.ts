import chalk from "chalk";
import { $ } from "execa";
import fs from "node:fs";
import * as dotenv from "dotenv";

const dotenvFiles = [".env.publish", ".env"];
for (const file of dotenvFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
    break;
  }
}

const requiredEnv = ["WEBAPP_IMAGE_NAME"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(chalk.red(`Missing required environment variable: ${key}`));
    process.exit(1);
  }
}

const IMAGE_NAME = process.env.WEBAPP_IMAGE_NAME!;
const TAG = "latest";
const FULL_IMAGE_NAME = `${IMAGE_NAME}:${TAG}`;

function logStep(msg: string) {
  console.log(chalk.blueBright(`===> ${msg}`));
}
function logSuccess(msg: string) {
  console.log(chalk.green(`✓ ${msg}`));
}
function logError(msg: string) {
  console.error(chalk.red(`✗ ${msg}`));
}

async function main() {
  logStep("Building Docker image for webapp");
  await $`env DOCKER_BUILDKIT=1 docker image build -t ${FULL_IMAGE_NAME} -f Dockerfile.webapp .`;
  logSuccess("Docker image built");

  logStep("Pushing Docker image to Docker Hub");
  await $`docker push ${FULL_IMAGE_NAME}`;
  logSuccess("Docker image pushed");

  console.log("\nNext steps:");
  console.log(`1. Use the image ${FULL_IMAGE_NAME} in your deployments.`);
}

main().catch((err) => {
  logError("Publishing failed");
  console.error(err.message || err);
  process.exit(1);
});
