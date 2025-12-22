#!/bin/bash

# ============================================
# InsightFlow Vercel Deployment Script
# ============================================
#
# This script deploys the InsightFlow application to Vercel.
#
# Prerequisites:
#   1. Install Vercel CLI: npm i -g vercel
#   2. Login to Vercel: vercel login
#   3. Set up environment variables in Vercel dashboard
#
# Usage:
#   ./scripts/deploy.sh          # Deploy to preview
#   ./scripts/deploy.sh prod     # Deploy to production
#
# Required Environment Variables (set in Vercel dashboard):
#   - SUPABASE_URL
#   - SUPABASE_ANON_KEY
#   - FEISHU_WEBHOOK_URL (optional)
#   - GEMINI_API_KEY (optional, for AI features)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

# Print header
print_header() {
    echo ""
    print_msg $BLUE "============================================"
    print_msg $BLUE "  InsightFlow - Vercel Deployment"
    print_msg $BLUE "============================================"
    echo ""
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_msg $RED "Error: Vercel CLI is not installed."
        print_msg $YELLOW "Install it with: npm i -g vercel"
        exit 1
    fi
    print_msg $GREEN "✓ Vercel CLI found"
}

# Check if logged in to Vercel
check_vercel_auth() {
    if ! vercel whoami &> /dev/null; then
        print_msg $YELLOW "You are not logged in to Vercel."
        print_msg $YELLOW "Running 'vercel login'..."
        vercel login
    fi
    local user=$(vercel whoami 2>/dev/null)
    print_msg $GREEN "✓ Logged in as: $user"
}

# Build the project locally first to catch errors
build_project() {
    print_msg $BLUE "Building project..."
    npm run build:vercel
    print_msg $GREEN "✓ Build successful"
}

# Deploy to Vercel
deploy() {
    local env=$1

    if [ "$env" == "prod" ]; then
        print_msg $BLUE "Deploying to PRODUCTION..."
        vercel --prod
    else
        print_msg $BLUE "Deploying to PREVIEW..."
        vercel
    fi
}

# Main execution
main() {
    local env=${1:-preview}

    print_header

    print_msg $BLUE "Step 1/4: Checking Vercel CLI..."
    check_vercel_cli

    print_msg $BLUE "Step 2/4: Checking authentication..."
    check_vercel_auth

    print_msg $BLUE "Step 3/4: Building project..."
    build_project

    print_msg $BLUE "Step 4/4: Deploying to Vercel..."
    deploy $env

    echo ""
    print_msg $GREEN "============================================"
    print_msg $GREEN "  Deployment Complete!"
    print_msg $GREEN "============================================"
    echo ""
    print_msg $YELLOW "Don't forget to set environment variables in Vercel dashboard:"
    print_msg $YELLOW "  - SUPABASE_URL"
    print_msg $YELLOW "  - SUPABASE_ANON_KEY"
    print_msg $YELLOW "  - FEISHU_WEBHOOK_URL (optional)"
    print_msg $YELLOW "  - GEMINI_API_KEY (optional)"
    echo ""
}

# Run main function
main "$@"
