#!/bin/bash
set -e

# Deploy script for Cloud Run
# Usage: ./scripts/deploy.sh [environment] [image-tag]
# Example: ./scripts/deploy.sh dev latest
# Example: ./scripts/deploy.sh prod abc123f

ENV=${1:-dev}
IMAGE_TAG=${2:-latest}
PROJECT_ID="meleon-477813"
REGION="us-central1"
REPO="web"

case $ENV in
  dev)
    SERVICE="ai-dashboardatest"
    MAX_INSTANCES=5
    ;;
  staging)
    SERVICE="ai-dashboard-staging"
    MAX_INSTANCES=3
    ;;
  prod)
    SERVICE="ai-dashboard-prod"
    MAX_INSTANCES=10
    ;;
  *)
    echo "Unknown environment: $ENV"
    echo "Usage: $0 [dev|staging|prod] [image-tag]"
    exit 1
    ;;
esac

IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ai-dashboardatest:$IMAGE_TAG"

echo "🚀 Deploying to $ENV environment..."
echo "   Service: $SERVICE"
echo "   Image: $IMAGE"
echo ""

# Deploy with update-env-vars (preserves existing env vars)
gcloud run deploy $SERVICE \
  --image "$IMAGE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 1Gi \
  --max-instances "$MAX_INSTANCES"

echo ""
echo "✅ Deployment complete!"
echo "   URL: $(gcloud run services describe $SERVICE --region $REGION --project $PROJECT_ID --format='value(status.url)')"

