# Deploy to Vercel Guide 🚀

## Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Environment Variables** - From your `.env` file

## Step 1: Prepare Your Repository

### 1.1 Check `.gitignore`

Make sure these are in `.gitignore`:
```
.env*
*.json
!package.json
!package-lock.json
!tsconfig.json
!next.config.ts
```

### 1.2 Remove Sensitive Files from Git (if already committed)

```bash
# Remove the JSON file from git history
git rm --cached white-fiber-470711-s7-9734addc06d2.json

# Commit the changes
git add .gitignore
git commit -m "Remove sensitive credentials from repository"
```

### 1.3 Push to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### 2.1 Import Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select the repository `ai_dashboard`

### 2.2 Configure Project

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (leave default)
- **Build Command**: `next build` (leave default)
- **Output Directory**: `.next` (leave default)

### 2.3 Add Environment Variables

Click "Environment Variables" and add these (from your `.env` file):

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://mnynkgjczivchkuyvrzg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
```

#### Stripe
```
STRIPE_SECRET_KEY=sk_test_51SHkM71...
STRIPE_WEBHOOK_SECRET=whsec_8f8e4fac...
STRIPE_PRICE_MONTHLY=price_1SHkl0...
STRIPE_PRICE_QUARTERLY=price_1SHmBt...
STRIPE_PRICE_YEARLY=price_1SHmBt...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
STRIPE_PORTAL_RETURN_URL=https://your-app.vercel.app/billing
```

#### OpenAI
```
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-proj-I8QZSsiafG...
```

#### Google Cloud / Vertex AI (IMPORTANT!)
```
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_PROJECT_ID=white-fiber-470711-s7
GOOGLE_CLOUD_CLIENT_EMAIL=767431721427-compute@developer.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCV4mUsvEb7sN6C
...
(paste the entire private key with \n preserved)
...
-----END PRIVATE KEY-----"
```

**⚠️ Important for `GOOGLE_CLOUD_PRIVATE_KEY`:**
- Copy the ENTIRE value from your `.env` including the quotes
- Make sure `\n` characters are preserved (they represent newlines)
- In Vercel UI, paste it as a multi-line value

### 2.4 Deploy

Click "Deploy" and wait ~2-3 minutes for the build to complete.

## Step 3: Update App URL

Once deployed, you'll get a URL like `https://ai-dashboard-xxx.vercel.app`

### 3.1 Update Environment Variables

Go to Project Settings → Environment Variables and update:

```
NEXT_PUBLIC_APP_URL=https://ai-dashboard-xxx.vercel.app
STRIPE_PORTAL_RETURN_URL=https://ai-dashboard-xxx.vercel.app/billing
```

### 3.2 Redeploy

Go to Deployments → Three dots menu → "Redeploy"

## Step 4: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
7. Redeploy

## Step 5: Test the Deployment

### 5.1 Test Embedding API

Visit: `https://your-app.vercel.app/api/embeddings/check`

Should return:
```json
{
  "ok": true,
  "projectId": "white-fiber-470711-s7",
  "location": "us-central1",
  "model": "projects/..."
}
```

### 5.2 Test Product Creation

1. Login to your app
2. Go to Products
3. Create a new product with image
4. Check browser console for "✅ Embeddings stored successfully"

### 5.3 Test RAG Search

1. Go to `/dashboard/rag-test`
2. Search for products
3. Verify semantic search works

## Troubleshooting

### Build Fails

**Error: "Invalid segment configuration export"**

This is a Next.js config warning. If the build fails, check:
- `next.config.ts` is properly formatted
- All API routes export proper HTTP methods

### Embedding API Returns 500

**Check:**
1. All Google Cloud env vars are set correctly
2. `GOOGLE_CLOUD_PRIVATE_KEY` has proper newlines (`\n`)
3. Project ID matches your GCP project
4. Vertex AI API is enabled in your GCP project

### Test private key format:

```bash
# In Vercel terminal (Project → Settings → Functions → Edge Functions → Terminal)
node -e "console.log(process.env.GOOGLE_CLOUD_PRIVATE_KEY?.substring(0, 50))"
# Should output: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk..."
```

### Images Don't Load

Make sure Supabase storage bucket `product-images` is public:
1. Go to Supabase Dashboard → Storage
2. Select `product-images` bucket
3. Make sure "Public bucket" is enabled

## Continuous Deployment

Vercel automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel will:
1. Detect the push
2. Build the project
3. Deploy automatically
4. Keep all environment variables

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` and redeploy

## Monitoring

- **Logs**: Project → Deployments → Select deployment → "Functions"
- **Analytics**: Project → Analytics
- **Performance**: Project → Speed Insights

## Security Checklist

- ✅ `.env` files are in `.gitignore`
- ✅ Google Cloud JSON file is NOT in git
- ✅ All secrets are in Vercel environment variables
- ✅ Supabase RLS policies are enabled
- ✅ Stripe webhook signature verification is enabled

## Cost Optimization

- **Vercel**: Free tier includes:
  - 100 GB bandwidth/month
  - 6,000 build minutes/month
  - Serverless function executions

- **Google Cloud Vertex AI**:
  - ~$0.00025 per 1,000 characters
  - Monitor usage in GCP Console

---

Your app is now live! 🎉

Need help? Check:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase + Vercel](https://supabase.com/partners/integrations/vercel)

