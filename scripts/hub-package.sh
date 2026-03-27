#!/bin/bash

# Packaging script for the Launcher Hub (Tauri)
# Usage: ./scripts/hub-package.sh <version>
# Example: ./scripts/hub-package.sh 1.0.0

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "❌ Error: Specify a version (e.g., 1.0.0)"
    echo "Usage: ./scripts/hub-package.sh <version>"
    exit 1
fi

# Stop on error
set -e

APP_NAME="ethernanos-launcher"
RELEASE_DIR="./releases/$VERSION"

echo "🚀 Starting packaging for $APP_NAME Hub v$VERSION"

# 1. Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ui/dist

# 1.5 Load Environment Variables for Frontend Build
if [ -f "ui/.env" ]; then
    echo "🔑 Loading environment variables from ui/.env..."
    # Export variables starting with VITE_ to the current environment
    # Use a safe way to handle quotes and spaces
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ $line =~ ^VITE_ ]]; then
            export "$line"
        fi
    done < "ui/.env"
else
    echo "⚠️ Warning: ui/.env not found. Local build might miss some variables."
fi

# 2. Build Tauri App
echo "🏗️ Building Tauri Production App..."

# Ensure dependencies are installed
echo "📦 Installing root dependencies..."
npm install
echo "📦 Installing UI dependencies..."
cd ui && npm install && cd ..

# This command automatically builds the frontend then the native code
npm run build

# 3. Prepare release directory
echo "📂 Creating release directory: $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 4. Search and copy installers based on OS
echo "📦 Locating artifacts..."
# Path for Tauri v2 Linux bundles
BUNDLE_PATH="./src-tauri/target/release/bundle"

# Logic to copy files (using globs to match .deb, .appimage, .exe, .msi, .dmg)
find "$BUNDLE_PATH" -name "*.deb" -exec cp {} "$RELEASE_DIR/" \; 2>/dev/null || true
find "$BUNDLE_PATH" -name "*.AppImage" -exec cp {} "$RELEASE_DIR/" \; 2>/dev/null || true
find "$BUNDLE_PATH" -name "*.msi" -exec cp {} "$RELEASE_DIR/" \; 2>/dev/null || true
find "$BUNDLE_PATH" -name "*.dmg" -exec cp {} "$RELEASE_DIR/" \; 2>/dev/null || true

# 5. Generate Metadata
echo "🔐 Calculating Hashes and generating metadata.json..."

# Helper for hashes (works on Linux and macOS)
get_hash() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{ print $1 }'
    else
        shasum -a 256 "$1" | awk '{ print $1 }'
    fi
}

# Create metadata.json with file list and hashes
{
  echo "{"
  echo "  \"app\": \"$APP_NAME\","
  echo "  \"version\": \"$VERSION\","
  echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo "  \"artifacts\": ["
  
  FIRST=true
  for file in "$RELEASE_DIR"/*; do
      [ -e "$file" ] || continue
      [[ "$(basename "$file")" == "metadata.json" ]] && continue
      
      if [ "$FIRST" = true ]; then FIRST=false; else echo ","; fi
      
      FILENAME=$(basename "$file")
      HASH=$(get_hash "$file")
      echo "    { \"name\": \"$FILENAME\", \"hash\": \"$HASH\" }"
  done
  
  echo "  ]"
  echo "}"
} > "$RELEASE_DIR/metadata.json"

echo "--------------------------------------------------"
echo "✅ HUB PACKAGING COMPLETE!"
echo "📦 Release location: $RELEASE_DIR"
echo "--------------------------------------------------"
