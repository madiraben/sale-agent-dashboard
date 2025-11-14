# 🤖 AI Social Sales Dashboard

A full-featured Next.js SaaS platform that enables businesses to sell products through AI-powered chatbots on Facebook Messenger and Telegram. Built with Next.js 15, Supabase, Stripe, and OpenAI.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Database Setup](#database-setup)
- [Integration Setup](#integration-setup)
  - [Facebook Messenger](#facebook-messenger-setup)
  - [Telegram Bot](#telegram-bot-setup)
  - [Stripe Billing](#stripe-billing-setup)
  - [Google Cloud AI](#google-cloud-ai-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🛍️ E-commerce Management
- **Product Management**: Create, edit, and manage products with categories
- **Order Processing**: Track orders from placement to completion
- **Customer Management**: View customer profiles, order history, and contact info
- **Inventory Tracking**: Real-time stock management with automatic updates

### 🤖 AI-Powered Sales Bot
- **Multi-Platform**: Facebook Messenger and Telegram support
- **Conversational AI**: Natural language understanding powered by OpenAI GPT-4
- **Smart Product Search**: RAG (Retrieval-Augmented Generation) for intelligent product recommendations
- **Order Automation**: Complete checkout flow through chat
- **Multi-Language**: Supports English and Khmer

### 🎨 Bot Customization
- **Personality Presets**: Choose from Friendly, Professional, or Casual tones
- **Custom Prompts**: Fine-tune bot behavior with custom system prompts
- **Message Templates**: Customize welcome, away, and fallback messages
- **Bot Features Toggle**: Enable/disable auto-response and RAG

### 💳 Multi-Tenant Billing
- **Subscription Plans**: Monthly, Quarterly, and Yearly options
- **Stripe Integration**: Secure payment processing
- **Customer Portal**: Self-service subscription management
- **Usage-Based Access**: RLS (Row-Level Security) based on subscription status

### 📊 Analytics & Insights
- **Sales Dashboard**: Revenue tracking, order metrics, and trends
- **Customer Analytics**: Top customers, order patterns
- **Product Performance**: Best-selling products and categories

---

## 🛠️ Tech Stack

**Frontend & Backend:**
- Next.js 15.5.4 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

**Database & Auth:**
- Supabase (PostgreSQL + Auth)
- Row-Level Security (RLS)

**AI & ML:**
- OpenAI GPT-4o-mini
- Google Cloud Vertex AI
- Custom RAG pipeline

**Payments:**
- Stripe Checkout & Billing
- Stripe Customer Portal

**Integrations:**
- Facebook Graph API
- Telegram Bot API

**Deployment:**
- Google Cloud Run (Docker)
- Google Cloud Build (CI/CD)
- Artifact Registry

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ and npm
- **Supabase Account** (free tier works)
- **Stripe Account** (test mode)
- **OpenAI API Key** with GPT-4 access
- **Google Cloud Project** (for embeddings)
- **Facebook Developer Account** (for Messenger)
- **Telegram Account** (for bot creation)
- **Docker** (for deployment)
- **Google Cloud SDK** (for deployment)

---

## 🔐 Environment Setup

Create a `.env` file in the project root with the following variables:

### Database (Supabase)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### AI Services
```env
# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# Google Cloud (for embeddings)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Payment (Stripe)
```env
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRICE_MONTHLY=price_monthly-id
STRIPE_PRICE_QUARTERLY=price_quarterly-id
STRIPE_PRICE_YEARLY=price_yearly-id
```

### Application URLs
```env
# Local development
APP_URL=http://localhost:3000
STRIPE_PORTAL_RETURN_URL=http://localhost:3000/billing

# Production (update when deployed)
# APP_URL=https://your-domain.com
# STRIPE_PORTAL_RETURN_URL=https://your-domain.com/billing
```

### Facebook Integration
```env
FB_APP_ID=your-facebook-app-id
FB_APP_SECRET=your-facebook-app-secret
FB_WEBHOOK_VERIFY_TOKEN=any-random-string-123
```

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 3. Build for Production
```bash
npm run build
npm start
```

### 4. Lint & Format
```bash
npm run lint
npm run format
```

---

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and keys to `.env`

### 2. Apply Database Migrations

Run these SQL files in order through Supabase SQL Editor:

```sql
-- 1. Core tables (tenants, products, customers, orders)
src/supabase_sql/supabase.sql

-- 2. Add embeddings support for RAG
src/supabase_sql/migration_add_embeddings.sql

-- 3. Add search function
src/supabase_sql/migration_add_search_function.sql

-- 4. Add Facebook integration
src/supabase_sql/migration_add_facebook_pages.sql

-- 5. Add Telegram integration
src/supabase_sql/migration_add_telegram_bots.sql

-- 6. Add bot chat logging
src/supabase_sql/migration_bot_chat_messages_v2.sql

-- 7. Add bot sessions
src/supabase_sql/migration_bot_sessions_v2.sql

-- 8. Add messenger sender ID
src/supabase_sql/migration_add_messenger_sender_id.sql

-- 9. Add delivery address to orders
src/supabase_sql/migration_add_order_delivery_address.sql

-- 10. Add bot settings
src/supabase_sql/migration_add_tenant_settings.sql

-- 11. Fix customers contact info
src/supabase_sql/migration_fix_customers_contact.sql

-- 12. Add pending orders support
src/supabase_sql/migration_add_pending_orders.sql

-- 13. Fix visual search (if using visual features)
src/supabase_sql/fix_visual_search.sql
```

### 3. Enable Storage
1. Go to Storage in Supabase dashboard
2. Create a bucket named `product-images`
3. Set it to public or add appropriate policies

### 4. Enable Authentication
1. Go to Authentication → Providers
2. Enable Email authentication
3. Configure email templates (optional)

---

## 🔗 Integration Setup

### Facebook Messenger Setup

#### 1. Create Facebook App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → Business → Next
3. Add **Messenger** product
4. Add **Webhooks** product

#### 2. Configure Webhook
```
Callback URL: https://your-domain.com/api/facebook/webhook
Verify Token: (same as FB_WEBHOOK_VERIFY_TOKEN in .env)

Subscribe to fields:
- messages
- messaging_postbacks
- message_deliveries
- message_reads
```

#### 3. Get App Credentials
- Copy **App ID** → `FB_APP_ID`
- Copy **App Secret** → `FB_APP_SECRET`

#### 4. Add Facebook Login
1. Add **Facebook Login** product
2. Set OAuth Redirect URI: `https://your-domain.com/api/facebook/oauth/callback`
3. Request permissions: `pages_messaging`, `pages_read_engagement`, `pages_manage_metadata`

#### 5. Connect Pages
1. Sign in to the dashboard
2. Go to Profile → Connect Facebook
3. Select pages to connect
4. Bot will now respond to messages on those pages

---

### Telegram Bot Setup

#### 1. Create Bot with BotFather
1. Open Telegram, search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy the **bot token**

#### 2. Configure Bot
1. Go to dashboard → Profile
2. Paste bot token in Telegram section
3. Click "Connect Bot"

#### 3. Bot Features
The webhook is automatically set to: `https://your-domain.com/api/telegram/webhook/[secret]`

---

### Stripe Billing Setup

#### 1. Create Stripe Account
Sign up at [stripe.com](https://stripe.com)

#### 2. Create Products & Prices
1. Go to Products → Add Product
2. Create three products:
   - **Monthly Plan** - $20/month
   - **Quarterly Plan** - $54/quarter
   - **Yearly Plan** - $180/year
3. Copy each **Price ID** (starts with `price_...`) to `.env`

#### 3. Set Up Webhook (Local Development)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Copy the webhook secret (whsec_...) to STRIPE_WEBHOOK_SECRET
```

#### 4. Set Up Webhook (Production)
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret to production env

#### 5. Test Payment
Use test card: `4242 4242 4242 4242`, any future date, any CVC

---

### Google Cloud AI Setup

#### 1. Create Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project
3. Enable **Vertex AI API**

#### 2. Create Service Account
```bash
# Create service account
gcloud iam service-accounts create ai-sales-bot \
  --display-name="AI Sales Bot"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ai-sales-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=ai-sales-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copy credentials to .env
```

---

## 🚢 Deployment

### Deploy to Google Cloud Run

#### 1. Prerequisites
```bash
# Install Google Cloud SDK
brew install --cask google-cloud-sdk

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Configure Docker Repository
```bash
# Enable Artifact Registry
gcloud services enable artifactregistry.googleapis.com

# Create repository (one-time)
gcloud artifacts repositories create web \
  --repository-format=docker \
  --location=us-central1
```

#### 3. Build & Deploy (Automatic via Cloud Build)

**Option A: Push to GitHub (Auto-deploy)**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
# Cloud Build trigger will automatically build and push image
```

**Option B: Manual Build**
```bash
# Build image
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t ai-dashboard:latest .

# Tag for Google Cloud
docker tag ai-dashboard:latest \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/web/ai-dashboardatest:latest

# Push to registry
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/web/ai-dashboardatest:latest
```

#### 4. Deploy to Cloud Run
```bash
# Deploy using script
./scripts/deploy.sh dev latest    # Development
./scripts/deploy.sh prod latest   # Production

# OR deploy manually
gcloud run deploy ai-dashboardatest \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/web/ai-dashboardatest:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 1Gi \
  --max-instances 10
```

#### 5. Set Environment Variables
```bash
gcloud run services update ai-dashboardatest \
  --region us-central1 \
  --set-env-vars "\
SUPABASE_SERVICE_ROLE_KEY=your-key,\
STRIPE_SECRET_KEY=your-key,\
STRIPE_WEBHOOK_SECRET=your-key,\
OPENAI_API_KEY=your-key,\
APP_URL=https://your-service.run.app,\
FB_APP_ID=your-id,\
FB_APP_SECRET=your-secret,\
GOOGLE_CLOUD_PROJECT_ID=your-project"
```

#### 6. Update Webhooks
After deployment, update webhook URLs in:
- Facebook App Dashboard → Webhooks
- Stripe Dashboard → Webhooks
- `.env` → `APP_URL` and `STRIPE_PORTAL_RETURN_URL`

---

## 📁 Project Structure

```
ai_dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── billing/       # Stripe checkout & portal
│   │   │   ├── bot/           # Bot operations
│   │   │   ├── facebook/      # Messenger integration
│   │   │   ├── telegram/      # Telegram integration
│   │   │   └── stripe/        # Stripe webhooks
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main app pages
│   │   │   ├── customers/     # Customer management
│   │   │   ├── products/      # Product management
│   │   │   ├── sales/         # Order management
│   │   │   ├── profile/       # User profile & integrations
│   │   │   └── setting/       # Bot settings
│   │   └── billing/           # Billing page
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   └── dashboard/        # Dashboard-specific components
│   ├── lib/                   # Core logic
│   │   ├── chat/             # Chat orchestration
│   │   ├── sales/            # Sales bot logic
│   │   │   ├── stages/       # Conversation stages
│   │   │   ├── ai-responder.ts
│   │   │   ├── order.ts
│   │   │   └── session.ts
│   │   ├── rag/              # RAG pipeline
│   │   ├── facebook/         # Facebook API
│   │   ├── telegram/         # Telegram API
│   │   └── supabase/         # Supabase clients
│   ├── supabase_sql/          # Database migrations
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── scripts/                   # Deployment scripts
├── Dockerfile                 # Docker configuration
├── cloudbuild.yaml           # Cloud Build config
└── next.config.ts            # Next.js configuration
```

---

## 🔌 API Endpoints

### Public APIs
- `GET /` - Landing page
- `GET /billing` - Pricing page
- `POST /api/billing/create-checkout` - Create Stripe checkout
- `POST /api/stripe/webhook` - Stripe webhook handler

### Protected APIs (Authentication Required)
- `POST /api/facebook/oauth/start` - Start Facebook OAuth
- `GET /api/facebook/oauth/callback` - OAuth callback
- `GET /api/facebook/connected` - Get connected pages
- `DELETE /api/facebook/connected` - Disconnect Facebook
- `POST /api/telegram/connect` - Connect Telegram bot
- `GET /api/telegram/connected` - Get bot info
- `DELETE /api/telegram/connected` - Disconnect bot
- `DELETE /api/bot/clear-memory` - Clear bot conversation history

### Webhooks
- `POST /api/facebook/webhook` - Messenger events
- `POST /api/telegram/webhook/[secret]` - Telegram updates
- `POST /api/stripe/webhook` - Stripe events

---

## 🐛 Troubleshooting

### Database Issues

**Problem**: RLS policies blocking queries
```sql
-- Temporarily disable RLS for debugging (DON'T USE IN PRODUCTION)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
```

**Problem**: Migrations fail
- Run migrations one by one
- Check for existing tables/policies
- Use `DROP TABLE IF EXISTS ... CASCADE;` carefully

### Bot Not Responding

**Facebook Messenger:**
1. Check webhook is subscribed to page
2. Verify token in `FB_WEBHOOK_VERIFY_TOKEN`
3. Check Cloud Run logs: `gcloud run services logs read`
4. Verify page access token is valid

**Telegram:**
1. Check webhook is set: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Verify bot token is correct
3. Check Cloud Run logs

### Deployment Issues

**Build fails:**
- Check all environment variables are set
- Verify Docker has enough memory
- Try building locally first

**Service not accessible:**
- Check `--allow-unauthenticated` flag
- Verify Cloud Run service is deployed
- Check firewall/VPC settings

### Stripe Webhook Not Working

**Local:**
```bash
# Check if Stripe CLI is running
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

**Production:**
1. Verify webhook URL in Stripe Dashboard
2. Check webhook secret matches
3. Review Stripe Dashboard → Webhooks → Logs

---

## 📝 License

This project is proprietary and confidential.

---

## 🤝 Support

For issues and questions:
1. Check troubleshooting section
2. Review deployment logs
3. Check Supabase logs for database issues
4. Review API documentation

---

## 🎯 Next Steps

After setup:
1. ✅ Create your first product
2. ✅ Connect Facebook page or Telegram bot
3. ✅ Customize bot personality in Settings
4. ✅ Test the bot by sending a message
5. ✅ Set up your Stripe subscription
6. ✅ Monitor orders and customers

Happy selling! 🚀
