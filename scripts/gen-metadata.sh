#!/bin/bash

# Script utility to generate metadata.json for all files in a release directory
# Usage: ./scripts/gen-metadata.sh <app_name> <version> <directory>

APP_NAME=$1
VERSION=$2
RELEASE_DIR=$3

if [ -z "$APP_NAME" ] || [ -z "$VERSION" ] || [ -z "$RELEASE_DIR" ]; then
    echo "❌ Usage: ./scripts/gen-metadata.sh <app_name> <version> <directory>"
    exit 1
fi

if [ ! -d "$RELEASE_DIR" ]; then
    echo "❌ Error: Directory $RELEASE_DIR not found."
    exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
METADATA_FILE="$RELEASE_DIR/metadata.json"

echo "🍱 Generating metadata.json for $APP_NAME v$VERSION in $RELEASE_DIR"

# Header
echo "{" > "$METADATA_FILE"
echo "  \"app\": \"$APP_NAME\"," >> "$METADATA_FILE"
echo "  \"version\": \"$VERSION\"," >> "$METADATA_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$METADATA_FILE"
echo "  \"artifacts\": [" >> "$METADATA_FILE"

# List files excluding metadata.json itself
FIRST=true
for file in "$RELEASE_DIR"/*; do
    FILENAME=$(basename "$file")
    # Skip metadata files and the script itself
    if [[ "$FILENAME" == "metadata.json" || "$FILENAME" == *.os_info.json ]]; then continue; fi
    
    if [ -f "$file" ]; then
        HASH=$(sha256sum "$file" | awk '{ print $1 }')
        
        # Try to get OS from a sidecar .os_info.json if it exists
        # This allows GitHub Actions to 'pass' the OS name to this script
        OS="unknown"
        if [ -f "$file.os_info.json" ] && command -v jq >/dev/null 2>&1; then
            OS=$(jq -r '.os' "$file.os_info.json")
        fi

        # Fallback to extension detection if still unknown
        if [ "$OS" == "unknown" ] || [ "$OS" == "null" ]; then
            EXTENSION="${FILENAME##*.}"
            case "$EXTENSION" in
                exe|msi) OS="windows" ;;
                dmg|pkg) OS="macos" ;;
                deb|AppImage|rpm) OS="linux" ;;
                gz|zip) 
                    if [[ "$FILENAME" == *"linux"* ]]; then OS="linux"; 
                    elif [[ "$FILENAME" == *"win"* ]]; then OS="windows";
                    elif [[ "$FILENAME" == *"mac"* || "$FILENAME" == *"darwin"* ]]; then OS="macos";
                    fi
                    ;;
            esac
        fi

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$METADATA_FILE"
        fi
        
        echo "    { \"name\": \"$FILENAME\", \"os\": \"$OS\", \"hash\": \"$HASH\" }" >> "$METADATA_FILE"
    fi
done

# Footer
echo "  ]" >> "$METADATA_FILE"
echo "}" >> "$METADATA_FILE"

echo "✅ metadata.json generated successfully!"
cat "$METADATA_FILE"
