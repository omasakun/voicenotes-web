# Voicenotes Web

Transcribe your voice notes to text with ease.

## Getting Started

```bash
vfox install
pnpm install

pnpm db:migrate
pnpm dev
```

## Whisper Server Deployment (Google Cloud Run)

- [Google Cloud Console](https://console.cloud.google.com/)
  - [Create a Google Cloud Project](https://console.cloud.google.com/projectcreate)
  - [Setup Billing](https://console.cloud.google.com/billing/linkedaccount)
  - [Enable Artifact Registry API](https://console.cloud.google.com/flows/enableapi?apiid=artifactregistry.googleapis.com)
  - [Enable Cloud Run API](https://console.cloud.google.com/flows/enableapi?apiid=run.googleapis.com)
  - [Request a GPU Quota Increase](https://cloud.google.com/run/docs/configuring/services/gpu#request-quota)
  - [Artifact Registry](https://console.cloud.google.com/artifacts)
  - [Cloud Run Console](https://console.cloud.google.com/run)

1. **Configure Environment**

   Copy `.env.deploy.example` to `.env.deploy` and fill in your Google Cloud project ID and desired options.

2. **Deploy**

   ```bash
   gcloud init
   pnpm whisper:deploy
   ```

3. **Update Main App**

   Set `WHISPER_URL` in your main `.env`:

   ```env
   WHISPER_URL=https://your-service-url.run.app
   ```
