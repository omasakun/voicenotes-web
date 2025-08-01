import fs from "node:fs";
import chalk from "chalk";
import * as dotenv from "dotenv";
import { $ } from "execa";

const dotenvFiles = [".env.deploy", ".env"];
for (const file of dotenvFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
    break;
  }
}

const requiredEnv = [
  "GOOGLE_CLOUD_PROJECT",
  "WHISPER_PASSWORD",
  "WHISPER_REGION",
  "WHISPER_SERVICE_NAME",
  "WHISPER_MEMORY",
  "WHISPER_CPU",
  "WHISPER_CONCURRENCY",
  "WHISPER_TIMEOUT",
  "WHISPER_MAX_INSTANCES",
  "WHISPER_MODEL_NAME",
  "WHISPER_COMPUTE_TYPE",
  "WHISPER_DEVICE",
  "WHISPER_BATCH_SIZE",
  "WHISPER_HOST",
  "WHISPER_PORT",
];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(chalk.red(`Missing required environment variable: ${key}`));
    process.exit(1);
  }
}

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!;
const WHISPER_PASSWORD = process.env.WHISPER_PASSWORD!;
const REGION = process.env.WHISPER_REGION!;
const SERVICE_NAME = process.env.WHISPER_SERVICE_NAME!;
const IMAGE_NAME = `${REGION}-docker.pkg.dev/${PROJECT_ID}/docker/${SERVICE_NAME}`;
const MEMORY = process.env.WHISPER_MEMORY!;
const CPU = process.env.WHISPER_CPU!;
const CONCURRENCY = process.env.WHISPER_CONCURRENCY!;
const TIMEOUT = process.env.WHISPER_TIMEOUT!;
const MAX_INSTANCES = process.env.WHISPER_MAX_INSTANCES!;
const WHISPER_MODEL_NAME = process.env.WHISPER_MODEL_NAME!;
const WHISPER_COMPUTE_TYPE = process.env.WHISPER_COMPUTE_TYPE!;
const WHISPER_DEVICE = process.env.WHISPER_DEVICE!;
const WHISPER_BATCH_SIZE = process.env.WHISPER_BATCH_SIZE;
const WHISPER_HOST = process.env.WHISPER_HOST!;
const WHISPER_PORT = process.env.WHISPER_PORT!;
const WHISPER_SHUTDOWN_TIMEOUT = process.env.WHISPER_SHUTDOWN_TIMEOUT!;

function logStep(msg: string) {
  console.log(chalk.blueBright(`===> ${msg}`));
}
function logSuccess(msg: string) {
  console.log(chalk.green(`✓ ${msg}`));
}
function logError(msg: string) {
  console.error(chalk.red(`✗ ${msg}`));
}

const $nofail = $({ reject: false });
const $withlog = $({ stdout: "inherit", stderr: "inherit" });

async function main() {
  logStep("Creating Artifact Registry repository (if needed)");
  await $nofail`gcloud artifacts repositories create docker --repository-format=docker --location=${REGION} --project=${PROJECT_ID}`;
  logSuccess("Artifact Registry repository ensured");

  logStep("Configuring Docker for Artifact Registry");
  await $withlog`gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet`;
  logSuccess("Docker configured for Artifact Registry");

  logStep("Building Docker image");
  await $withlog`env DOCKER_BUILDKIT=1 docker image build -t ${IMAGE_NAME} --build-arg WHISPER_MODEL_NAME=${WHISPER_MODEL_NAME} -f Dockerfile.whisper .`;
  logSuccess("Docker image built");

  logStep("Pushing image to Artifact Registry");
  await $withlog`docker push ${IMAGE_NAME}`;
  logSuccess("Image pushed to Artifact Registry");

  logStep("Deploying to Cloud Run");

  const envVars = [
    `WHISPER_MODEL_NAME=${WHISPER_MODEL_NAME}`,
    `WHISPER_COMPUTE_TYPE=${WHISPER_COMPUTE_TYPE}`,
    `WHISPER_DEVICE=${WHISPER_DEVICE}`,
    `WHISPER_BATCH_SIZE=${WHISPER_BATCH_SIZE}`,
    `WHISPER_HOST=${WHISPER_HOST}`,
    `WHISPER_PORT=${WHISPER_PORT}`,
    `WHISPER_PASSWORD=${WHISPER_PASSWORD}`,
    `WHISPER_SHUTDOWN_TIMEOUT=${WHISPER_SHUTDOWN_TIMEOUT}`,
  ];

  const args: string[] = [];
  args.push("--memory", MEMORY);
  args.push("--cpu", CPU);
  args.push("--concurrency", CONCURRENCY);
  args.push("--timeout", `${TIMEOUT}s`);
  args.push("--port", WHISPER_PORT);
  args.push("--set-env-vars", envVars.join(","));
  args.push("--min-instances", "0");
  args.push("--max-instances", MAX_INSTANCES);
  if (WHISPER_DEVICE === "cuda") {
    args.push("--gpu", "1");
    args.push("--gpu-type", "nvidia-l4");
    args.push("--no-gpu-zonal-redundancy");
  }

  await $withlog`gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_NAME} --project ${PROJECT_ID} --region ${REGION} --platform=managed --allow-unauthenticated ${args}`;
  logSuccess("Service deployed successfully");

  logStep("Getting service URL");
  const { stdout: serviceUrl } =
    await $`gcloud run services describe ${SERVICE_NAME} --project ${PROJECT_ID} --region ${REGION} --format=value(status.url)`;
  logSuccess(`Service URL: ${serviceUrl}`);

  logStep("Testing health endpoint");
  try {
    await $`curl ${serviceUrl}/health`;
    logSuccess("Health check passed");
  } catch {
    logError("Health check failed - service might still be starting up");
    console.log(`You can manually test: curl ${serviceUrl}/health`);
  }

  console.log("\nNext steps:");
  console.log(`1. Update your main application's environment variable:`);
  console.log(`   WHISPER_URL=${serviceUrl}`);
  console.log("\n2. Test the transcription service:");
  console.log(
    `   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}" --project=${PROJECT_ID} --limit=50`,
  );
}

main().catch((err) => {
  logError("Deployment failed");
  console.error(err.message || err);
  process.exit(1);
});
