#!/bin/bash
# ====================================================================
# SCRIPT DE MISE À JOUR DU BINAIRE ACTIF (schoolmanage) DANS LE HUB
# ====================================================================
set -e

echo "🏗️  1. Compilation du backend Django avec PyInstaller..."
cd project_init_django_Angular

# S'assurer que PyInstaller est disponible
./.venv/bin/pip install -q pyinstaller

# Compiler le binaire
./.venv/bin/pyinstaller --noconfirm app.spec

# Chemin actif de l'application dans le Hub
TARGET_DIR="/home/stechclarin/.local/share/com.ethernanos.hub/apps/930e2a6f-7dfb-4541-b607-7b520053b9b4"

if [ -d "$TARGET_DIR" ]; then
    echo "🚚 2. Copie du binaire compilé vers le dossier de l'application..."
    
    # Arrêter proprement les anciens processus restants
    echo "🛑 Arrêt des anciens processus Django en arrière-plan..."
    pkill -f schoolmanage || true
    pkill -f "manage.py runserver" || true
    
    # Copier le contenu du dist compilé
    cp -r dist/schoolmanage/* "$TARGET_DIR/"
    
    echo "===================================================================="
    echo "✅ APPLICATION MISE À JOUR AVEC SUCCÈS !"
    echo "📁 Dossier cible : $TARGET_DIR"
    echo "===================================================================="
else
    echo "❌ Erreur : L'application n'est pas installée dans le Hub."
    echo "Veuillez d'abord l'installer depuis l'interface du Hub."
    exit 1
fi
