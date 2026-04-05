#!/bin/bash

# Standard Packaging script for Hub Modules (Angular Apps like SchoolManage)
# Usage: ./scripts/app-package.sh <app-id> <version> <path-to-app>
# Example: ./scripts/app-package.sh schoolmanage 1.0.0 ../schoolmanage

APP_ID=$1
VERSION=$2
APP_PATH=$3

if [ -z "$APP_ID" ] || [ -z "$VERSION" ] || [ -z "$APP_PATH" ]; then
    echo "❌ Error: Missing arguments"
    echo "Usage: ./scripts/app-package.sh <app-id> <version> <path-to-app>"
    exit 1
fi

set -e

RELEASE_DIR="./releases/apps/$APP_ID/$VERSION"
ARCHIVE_NAME="$APP_ID-v$VERSION.tar.gz"

echo "🚀 Packaging module: $APP_ID v$VERSION from $APP_PATH"

# 1. Build the target app
echo "🏗️ Building $APP_ID..."
cd "$APP_PATH"

# Load local .env if present (Vite-style)
if [ -f ".env" ]; then
    echo "🔑 Loading environment variables from .env..."
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ $line =~ ^VITE_ ]]; then
            export "$line"
        fi
    done < ".env"
fi

npm install --legacy-peer-deps
npm run build -- --base-href /

# --- INDUSTRIAL GUARD: INDEX.HTML SANITIZATION ---
# We MUST ensure index.html doesn't contain local filesystem paths
echo "🛡️ Auditing index.html for local path leaks..."
INDEX_FILE="dist/$APP_ID/browser/index.html"
if [ ! -f "$INDEX_FILE" ]; then
    INDEX_FILE="dist/index.html"
fi

if [ -f "$INDEX_FILE" ]; then
    # Detect the 'Smoking Gun' (C:/Program Files/Git/) or any absolute disk paths
    if grep -q "base href=\"C:/" "$INDEX_FILE"; then
        echo "⚠️ WARNING: Local path leak detected in index.html! Fixing..."
        sed -i 's|base href="[^"]*"|base href="/"|g' "$INDEX_FILE"
        echo "✅ index.html base href corrected to /"
    fi
fi

cd - > /dev/null

# 2. Locate build folder (detecting common Angular/Vite paths)
BUILD_PATH=""
if [ -d "$APP_PATH/dist/$APP_ID/browser" ]; then
    BUILD_PATH="$APP_PATH/dist/$APP_ID/browser"
elif [ -d "$APP_PATH/dist" ]; then
    BUILD_PATH="$APP_PATH/dist"
fi

if [ -z "$BUILD_PATH" ]; then
    echo "❌ Error: Could not find build folder in $APP_PATH/dist"
    exit 1
fi

# 3. Create release folder and archive
mkdir -p "$RELEASE_DIR"
echo "🗜️ Creating archive..."
tar -czf "$RELEASE_DIR/$ARCHIVE_NAME" -C "$BUILD_PATH" .

# 4. Hash and Metadata
echo "🔐 Finalizing metadata..."
get_hash() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{ print $1 }'
    else
        shasum -a 256 "$1" | awk '{ print $1 }'
    fi
}

HASH=$(get_hash "$RELEASE_DIR/$ARCHIVE_NAME")

cat <<EOF > "$RELEASE_DIR/metadata.json"
{
  "id": "$APP_ID",
  "version": "$VERSION",
  "hash": "$HASH",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "archive": "$ARCHIVE_NAME"
}
EOF

echo "--------------------------------------------------"
echo "✅ APP PACKAGING COMPLETE!"
echo "📦 Archive : $RELEASE_DIR/$ARCHIVE_NAME"
echo "--------------------------------------------------"
