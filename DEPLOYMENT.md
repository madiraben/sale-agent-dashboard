# Cloud Run Deployment Guide

This guide explains how to manually deploy the AI Dashboard to Google Cloud Run.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Build & Deploy Workflow](#build--deploy-workflow)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### How It Works

```
┌─────────────────┐
│  Git Push       │
│  (dev_stage)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cloud Build    │  ← Triggered automatically
│  Trigger        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Docker   │  ← Embeds NEXT_PUBLIC_* vars
│  Image          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push to        │  ← Tags: SHA, latest, branch-latest
│  Artifact       │
│  Registry       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Manual Deploy  │  ← YOU deploy when ready
│  to Cloud Run   │
└─────────────────┘
```

### Key Components

- **Cloud Build**: Automatically builds Docker images on every push
- **Artifact Registry**: Stores Docker images with multiple tags
- **Cloud Run**: Serverless container platform (you deploy manually)
- **Secret Manager**: Stores sensitive credentials (API keys, tokens)

---

## Prerequisites

1. **Google Cloud CLI installed**
   ```bash
   gcloud --version
   ```

2. **Authenticated with GCP**
   ```bash
   gcloud auth login
   gcloud config set project <YOUR_PROJECT_ID>
   ```

3. **Required APIs enabled**
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API

---

## Initial Setup

### 1. Create Secrets in Secret Manager

Run these commands **once** to create secrets (use your secure values):

```bash
PROJECT_ID="<YOUR_PROJECT_ID>"

# Supabase Service Role Key
gcloud secrets create supabase-service-role --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)

# Stripe Secret Key
gcloud secrets create stripe-secret-key --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)

# Stripe Webhook Secret
gcloud secrets create stripe-webhook-secret --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)

# OpenAI API Key
gcloud secrets create openai-api-key --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)

# Facebook App Secret
gcloud secrets create fb-app-secret --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)

# Google Cloud Private Key (for Vertex AI)
gcloud secrets create google-cloud-private-key-whitefiber --replication-policy=automatic --project $PROJECT_ID || true
# (Add your secret value using a secure method)
```

*Never commit secret values or keys into code or documentation.*

### 2. Grant Secret Access to Cloud Run

```bash
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<YOUR_COMPUTE_SERVICE_ACCOUNT>" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Configure Cloud Build Trigger

1. Go to: https://console.cloud.google.com/cloud-build/triggers?project=<YOUR_PROJECT_ID>
2. Click "CREATE TRIGGER"
3. Fill in:
   - **Name**: `deploy-dev`
   - **Event**: Push to a branch
   - **Source**: 
     - Repository: your repository
     - Branch: `^dev_stage$`
   - **Configuration**: Cloud Build configuration file (`cloudbuild.yaml`)
   - **Substitution variables**:
     - `_NEXT_PUBLIC_SUPABASE_URL` = `<YOUR_SUPABASE_URL>`
     - `_NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<YOUR_SUPABASE_ANON_KEY>`
4. Click "CREATE"

---

## Build & Deploy Workflow

### Step 1: Push Code (Triggers Auto-Build)

```bash
git add .
git commit -m "your changes"
git push origin dev_stage
```

**What happens:**
- Cloud Build trigger fires automatically
- Builds Docker image with embedded `NEXT_PUBLIC_*` vars
- Tags image as:
  - commit SHA
  - `latest`
  - `dev_stage-latest`
- Pushes to Artifact Registry

**Monitor build:**
- Console: https://console.cloud.google.com/cloud-build/builds?project=<YOUR_PROJECT_ID>
- CLI: `gcloud builds list --project <YOUR_PROJECT_ID> --limit 5`

### Step 2: Verify Image Built

```bash
gcloud artifacts docker images list \
  <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME> \
  --project <YOUR_PROJECT_ID> \
  --limit 5
```

You should see your new image with multiple tags.

### Step 3: Deploy to Cloud Run (Manual)

**Option A: Deploy Latest Build**

```bash
gcloud run deploy <SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:latest \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated
```

**Option B: Deploy Specific SHA (Recommended for Production)**

```bash
# Replace with your actual commit SHA
gcloud run deploy <SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:<COMMIT_SHA> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated
```

**Option C: Deploy via Console**

1. Go to: https://console.cloud.google.com/run/detail/<REGION>/<SERVICE_NAME>?project=<YOUR_PROJECT_ID>
2. Click **"EDIT & DEPLOY NEW REVISION"**
3. Under "Container image URL", click "SELECT"
4. Choose your image (e.g., `:latest`)
5. Click **"DEPLOY"**

### Step 4: Verify Deployment

```bash
# Get service URL
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --format='value(status.url)'

# Check if env vars are set
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --format='value(spec.template.spec.containers[0].env)'
```

---

## Environment Variables

### Public Variables (Embedded at Build Time)

These are set in the Cloud Build trigger and embedded into the Docker image:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

*Do not share your actual values in documentation. Store these securely.*

**To update:** Edit the Cloud Build trigger substitutions in Console.

### Runtime Variables (Set on Cloud Run Service)

These are configured on the Cloud Run service itself:

#### Plain Environment Variables

```bash
gcloud run services update <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --update-env-vars \
OPENAI_MODEL="gpt-4o-mini",\
OPENAI_BASE_URL="https://api.openai.com/v1",\
STRIPE_PRICE_MONTHLY="<YOUR_PRICE_MONTHLY>",\
STRIPE_PRICE_QUARTERLY="<YOUR_PRICE_QUARTERLY>",\
STRIPE_PRICE_YEARLY="<YOUR_PRICE_YEARLY>",\
FB_APP_ID="<YOUR_FB_APP_ID>",\
FB_WEBHOOK_VERIFY_TOKEN="<YOUR_FB_WEBHOOK_VERIFY_TOKEN>",\
GOOGLE_CLOUD_PROJECT_ID="<YOUR_PROJECT_ID>",\
GOOGLE_CLOUD_LOCATION="<REGION>",\
GOOGLE_CLOUD_CLIENT_EMAIL="<YOUR_CLIENT_EMAIL>",\
APP_URL="<YOUR_APP_URL>",\
STRIPE_PORTAL_RETURN_URL="<YOUR_STRIPE_PORTAL_RETURN_URL>"
```

#### Secret Variables (From Secret Manager)

Already configured via `--set-secrets` during initial deploy. To update:

```bash
gcloud run services update <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --update-secrets \
SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
OPENAI_API_KEY=openai-api-key:latest,\
FB_APP_SECRET=fb-app-secret:latest,\
GOOGLE_CLOUD_PRIVATE_KEY=google-cloud-private-key-whitefiber:latest
```

### Full Environment Setup (First Time Deploy)

If deploying for the first time or need to restore all env vars:

```bash
gcloud run deploy <SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:latest \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 1Gi \
  --max-instances 5 \
  --set-env-vars \
NEXT_PUBLIC_SUPABASE_URL="<YOUR_SUPABASE_URL>",\
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>",\
OPENAI_MODEL="gpt-4o-mini",\
OPENAI_BASE_URL="https://api.openai.com/v1",\
STRIPE_PRICE_MONTHLY="<YOUR_PRICE_MONTHLY>",\
STRIPE_PRICE_QUARTERLY="<YOUR_PRICE_QUARTERLY>",\
STRIPE_PRICE_YEARLY="<YOUR_PRICE_YEARLY>",\
FB_APP_ID="<YOUR_FB_APP_ID>",\
FB_WEBHOOK_VERIFY_TOKEN="<YOUR_FB_WEBHOOK_VERIFY_TOKEN>",\
GOOGLE_CLOUD_PROJECT_ID="<YOUR_PROJECT_ID>",\
GOOGLE_CLOUD_LOCATION="<REGION>",\
GOOGLE_CLOUD_CLIENT_EMAIL="<YOUR_CLIENT_EMAIL>",\
APP_URL="<YOUR_APP_URL>",\
STRIPE_PORTAL_RETURN_URL="<YOUR_STRIPE_PORTAL_RETURN_URL>" \
  --set-secrets \
SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
OPENAI_API_KEY=openai-api-key:latest,\
FB_APP_SECRET=fb-app-secret:latest,\
GOOGLE_CLOUD_PRIVATE_KEY=google-cloud-private-key-whitefiber:latest
```

*Do not put any sensitive keys or actual secret values in documentation or code.*

---

## Troubleshooting

### Build Fails

**Check build logs:**
```bash
gcloud builds list --project <YOUR_PROJECT_ID> --limit 1
gcloud builds log BUILD_ID --project <YOUR_PROJECT_ID>
```

**Common issues:**
- Missing `Dockerfile` in repo → Ensure it's committed
- Build args not passed → Check trigger substitutions
- Syntax error in code → Fix and push again

### Deploy Fails

**Check service status:**
```bash
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID>
```

**Common issues:**
- Image not found → Verify image exists in Artifact Registry
- Secret access denied → Grant `secretmanager.secretAccessor` role
- Port mismatch → Ensure `--port 8080` matches Dockerfile `EXPOSE`

### Runtime Errors

**View logs:**
```bash
# Live tail
gcloud beta run services logs tail <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID>

# Recent logs
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="<SERVICE_NAME>"' \
  --project <YOUR_PROJECT_ID> \
  --limit 100 \
  --format json
```

**Common issues:**
- Missing env vars → Check with `gcloud run services describe`
- 403 errors → Verify `APP_URL` matches actual service URL
- 500 errors → Check logs for stack traces

### Rollback to Previous Version

```bash
# List recent revisions
gcloud run revisions list \
  --service <SERVICE_NAME> \
  --region <REGION> \
  --project <YOUR_PROJECT_ID>

# Deploy specific revision
gcloud run services update-traffic <SERVICE_NAME> \
  --to-revisions REVISION_NAME=100 \
  --region <REGION> \
  --project <YOUR_PROJECT_ID>
```

Or deploy a previous image SHA:

```bash
gcloud run deploy <SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:OLD_SHA \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated
```

---

## Quick Reference

### Essential Commands

```bash
# View service URL
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> --project <YOUR_PROJECT_ID> \
  --format='value(status.url)'

# View env vars
gcloud run services describe <SERVICE_NAME> \
  --region <REGION> --project <YOUR_PROJECT_ID> \
  --format='value(spec.template.spec.containers[0].env)'

# Update single env var
gcloud run services update <SERVICE_NAME> \
  --region <REGION> --project <YOUR_PROJECT_ID> \
  --update-env-vars KEY=value

# View logs
gcloud beta run services logs tail <SERVICE_NAME> \
  --region <REGION> --project <YOUR_PROJECT_ID>

# List images
gcloud artifacts docker images list \
  <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME> \
  --project <YOUR_PROJECT_ID>

# List builds
gcloud builds list --project <YOUR_PROJECT_ID> --limit 10
```

### Important Links

- **Cloud Run Console**: https://console.cloud.google.com/run?project=<YOUR_PROJECT_ID>
- **Cloud Build**: https://console.cloud.google.com/cloud-build/builds?project=<YOUR_PROJECT_ID>
- **Artifact Registry**: https://console.cloud.google.com/artifacts?project=<YOUR_PROJECT_ID>
- **Secret Manager**: https://console.cloud.google.com/security/secret-manager?project=<YOUR_PROJECT_ID>
- **Logs**: https://console.cloud.google.com/logs/query?project=<YOUR_PROJECT_ID>

---

## Best Practices

1. **Always deploy specific SHAs to production** (not `latest`)
2. **Test in dev before promoting to prod**
3. **Use `--update-env-vars` to preserve existing config**
4. **Monitor logs after each deploy**
5. **Keep secrets in Secret Manager, never in code or documentation**
6. **Tag images with meaningful names** (e.g., `v1.2.3`, `release-YYYY-MM-DD`)

---

## Multi-Environment Setup (Optional)

To create staging/production environments:

```bash
# Create staging service
gcloud run deploy <STAGING_SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:latest \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated \
  --max-instances 3

# Create production service
gcloud run deploy <PROD_SERVICE_NAME> \
  --image <REGION>-docker.pkg.dev/<YOUR_PROJECT_ID>/<REPO>/<IMAGE_NAME>:STABLE_SHA \
  --region <REGION> \
  --project <YOUR_PROJECT_ID> \
  --allow-unauthenticated \
  --max-instances 10
```

Then configure different env vars for each environment as appropriate.

---

**Questions?** Check the [troubleshooting section](#troubleshooting) or view logs in the Cloud Console.

