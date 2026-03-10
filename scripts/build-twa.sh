#!/bin/bash
# ============================================
# BillPro - TWA (Trusted Web Activity) Builder
# Generates an Android APK for Google Play Store
# ============================================
#
# Prerequisites:
#   1. Node.js installed
#   2. Java JDK 8+ installed (for Android SDK)
#   3. Android SDK installed (or install via Android Studio)
#   4. App deployed to HTTPS domain (e.g., billpro.vercel.app)
#
# Steps to publish to Play Store:
#
# STEP 1: Deploy your app to a domain with HTTPS
#   vercel --prod
#   (or deploy to any hosting: Netlify, Railway, etc.)
#
# STEP 2: Install Bubblewrap CLI
#   npm install -g @nicolo-ribaudo/bubblewrap
#   (or: npm install -g @nicolo-ribaudo/nicolo-ribaudo/bubblewrap)
#
# STEP 3: Initialize TWA project
#   mkdir twa && cd twa
#   bubblewrap init --manifest https://YOUR-DOMAIN.com/manifest.json
#
#   Bubblewrap will ask:
#   - App name: BillPro
#   - Package: com.billpro.app
#   - Signing key: create new (SAVE THE PASSWORD!)
#   - It will download Android SDK if needed
#
# STEP 4: Build the APK
#   bubblewrap build
#   (creates app-release-signed.apk and app-release-bundle.aab)
#
# STEP 5: Set up Digital Asset Links (REQUIRED)
#   Bubblewrap outputs the SHA-256 fingerprint.
#   Create file: public/.well-known/assetlinks.json
#   with content:
#   [{
#     "relation": ["delegate_permission/common.handle_all_urls"],
#     "target": {
#       "namespace": "android_app",
#       "package_name": "com.billpro.app",
#       "sha256_cert_fingerprints": ["YOUR-SHA-256-FINGERPRINT"]
#     }
#   }]
#   Deploy this file to your domain.
#
# STEP 6: Create Google Play Developer Account
#   - Go to: https://play.google.com/console
#   - Pay $25 one-time fee
#   - Complete account verification
#
# STEP 7: Upload to Play Store
#   - Create new app in Play Console
#   - Upload the .aab file (app bundle)
#   - Fill in store listing:
#     - Title: BillPro - Billing & Invoice System
#     - Description: Professional billing and invoice management
#     - Screenshots (take from your deployed app)
#     - Feature graphic (1024x500 banner)
#     - Category: Business > Finance
#   - Set up pricing: Free (monetize via in-app subscription)
#   - Submit for review
#
# STEP 8: Wait for approval (usually 3-7 days)
#
# ============================================

echo "BillPro TWA Build Guide"
echo "======================"
echo ""
echo "1. Deploy app to HTTPS domain first"
echo "2. Run: npm install -g @nicolo-ribaudo/bubblewrap"
echo "3. Run: mkdir twa && cd twa"
echo "4. Run: bubblewrap init --manifest https://YOUR-DOMAIN.com/manifest.json"
echo "5. Run: bubblewrap build"
echo "6. Upload .aab to Google Play Console"
echo ""
echo "See full guide in this script's comments."
