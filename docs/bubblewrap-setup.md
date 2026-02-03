# Bubblewrap TWA Setup Guide

## Quick Start

### 1. Install Prerequisites
```bash
# Install Node.js LTS from https://nodejs.org
# Install Java JDK 11+ from https://adoptium.net
```

### 2. Install Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
# Or use npx (recommended)
```

### 3. Initialize TWA Project
```bash
# In your project root, run:
npx @bubblewrap/cli init --manifest https://ai-privacy-guard-frontend.onrender.com/manifest.json
```

### 4. Generate Signing Key
```bash
# During init, Bubblewrap will prompt to create a new keystore
# Save the keystore file and passwords securely!
# NEVER commit keystore to git!
```

### 5. Get SHA-256 Fingerprint
```bash
# After generating keystore, get fingerprint:
keytool -list -v -keystore your-keystore.ks -alias android
# Copy the SHA-256 fingerprint
```

### 6. Update assetlinks.json
Update `frontend/public/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.aiprivacyguard.twa",
    "sha256_cert_fingerprints": [
      "YOUR:SHA256:FINGERPRINT:HERE"
    ]
  }
}]
```

### 7. Deploy Updated assetlinks.json
```bash
# Commit and push changes
git add -A
git commit -m "Update assetlinks.json with SHA256 fingerprint"
git push origin main

# Wait for Render to deploy (~2-3 min)
# Verify: https://ai-privacy-guard-frontend.onrender.com/.well-known/assetlinks.json
```

### 8. Build Release AAB
```bash
npx @bubblewrap/cli build
# This creates: app-release-bundle.aab
```

### 9. Upload to Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app > Android App
3. Go to Release > Production
4. Upload `app-release-bundle.aab`
5. Fill store listing using `docs/play-store-listing.md`
6. Submit for review

## Important Notes

- **Keystore backup**: Keep keystore + passwords in secure location (lost = can't update app)
- **Package name**: Use `com.aiprivacyguard.twa` or your own domain
- **Review time**: First app review takes 1-7 days
