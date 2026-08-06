#!/bin/bash
# ====================================================================
# SCRIPT DE COMPILATION LOCAL ETHER NANOS HUB (.deb)
# ====================================================================

# Stop on first error
set -e

echo "===================================================================="
echo " 🛠️  EtherNanos Hub - Compilation locale (.deb)"
echo "===================================================================="

# 1. Vérification de l'OS (Linux uniquement pour générer un .deb)
if [ "$(uname)" != "Linux" ]; then
    echo "❌ Erreur : Ce script nécessite Linux pour compiler un paquet Debian (.deb)."
    exit 1
fi

# 2. Vérification / Installation des dépendances système nécessaires
echo "📦 1. Vérification des dépendances système..."
MISSING_DEPS=()
for dep in libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev; do
    if ! dpkg -s "$dep" >/dev/null 2>&1; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "⚠️  Dépendances système manquantes détectées : ${MISSING_DEPS[*]}"
    if [ -t 0 ]; then
        read -p "Voulez-vous les installer via 'sudo apt' ? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt-get update
            sudo apt-get install -y "${MISSING_DEPS[@]}"
        else
            echo "❌ Compilation annulée (dépendances système manquantes)."
            exit 1
        fi
    else
        echo "❌ Erreur : Dépendances manquantes. Veuillez exécuter :"
        echo "   sudo apt-get update && sudo apt-get install -y ${MISSING_DEPS[*]}"
        exit 1
    fi
else
    echo "✅ Toutes les dépendances système sont installées."
fi

# 3. Chargement des variables d'environnement si un fichier .env existe
if [ -f .env ]; then
    echo "📝 Chargement des variables d'environnement depuis le fichier .env..."
    export $(grep -v '^#' .env | xargs)
fi

# 4. Installation des dépendances NPM
echo "⚡ 2. Installation des dépendances Node.js (Root)..."
npm install

echo "⚡ 3. Installation des dépendances Node.js (Frontend)..."
cd ui
npm install
cd ..

# 5. Compilation Tauri (frontend + backend Rust)
echo "🚀 4. Lancement de la compilation avec Tauri..."
npm run build

# 6. Localisation et déplacement du fichier .deb généré
DEB_DIR="src-tauri/target/release/bundle/deb"
TARGET_DIR="/home/stechclarin/Documents/personnel"

if [ -d "$DEB_DIR" ]; then
    DEB_FILE=$(find "$DEB_DIR" -name "*.deb" -type f | head -n 1)
    if [ -n "$DEB_FILE" ]; then
        # Assurer que le dossier cible existe
        mkdir -p "$TARGET_DIR"
        
        # Copier le fichier deb en retirant les espaces du nom
        CLEAN_NAME=$(basename "$DEB_FILE" | tr -d ' ')
        cp "$DEB_FILE" "$TARGET_DIR/$CLEAN_NAME"
        FINAL_DEB="$TARGET_DIR/$CLEAN_NAME"

        echo "===================================================================="
        echo "🎉 COMPILATION ET COPIE TERMINÉES AVEC SUCCÈS !"
        echo "💾 Emplacement du paquet : $FINAL_DEB"
        echo "📦 Taille du fichier     : $(du -sh "$FINAL_DEB" | cut -f1)"
        echo "===================================================================="
        echo "💡 Pour installer le paquet localement, vous pouvez exécuter :"
        echo "   sudo dpkg -i $FINAL_DEB"
        echo "===================================================================="
    else
        echo "❌ Erreur : Le dossier de bundle deb existe mais aucun fichier .deb n'a été trouvé."
        exit 1
    fi
else
    echo "❌ Erreur : Le dossier bundle deb n'a pas été généré."
    exit 1
fi

##################################################################

                  .               
                  #\             
                 ##\\          
                ###\\\        
               ####\\\\          
              #####\\\\\           

##################################################################
