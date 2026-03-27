# Guide de Déploiement - EtherNanos Hub

Ce document explique comment déployer le Hub (Launcher) et les applications qu'il gère (Modules).

## 1. Déploiement du Hub (L'application Native)

Le Hub doit être compilé pour chaque système d'exploitation (Windows, macOS, Linux).

### Conditions Préalables
- **Node.js** (LTS) & **npm**
- **Rust** & **Cargo**
- Dépendances système (Linux uniquement) : `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`, etc.

### Compilation Locale
Pour générer l'exécutable pour votre OS actuel :
```bash
./scripts/hub-package.sh 1.0.0
```
Le résultat se trouvera dans `./releases/1.0.0/`.

### Compilation Multi-Plateforme (Auto)
Une GitHub Action est configurée dans `.github/workflows/build.yml`. 
- À chaque push sur `main`, un "Draft Release" est créé sur GitHub.
- Il contiendra automatiquement le `.exe` (Windows), le `.dmg` (Mac) et le `.deb` (Linux).

---

## 2. Déploiement des Modules (ex: SchoolManage)

Les modules sont des applications web Angular packagées en archives `.tar.gz`.

### Processus de Packaging
Utilisez le script standard pour préparer une version d'un module :
```bash
./scripts/app-package.sh schoolmanage 1.0.0 ../chemin/vers/schoolmanage
```

### Structure de Sortie
Le script génère un dossier prêt à être mis en ligne :
- `metadata.json` : Contient l'ID, la version et le Hash SHA-256 (pour la sécurité).
- `schoolmanage-v1.0.0.tar.gz` : L'archive des fichiers web.

### Mise en ligne
1. Copiez le contenu de `./releases/apps/schoolmanage/1.0.0/` sur votre serveur web.
2. Le Hub pourra alors télécharger le JSON, vérifier le Hash, et installer l'application.

---

## 3. Variables d'Environnement (.env)

Le projet utilise des variables préfixées par `VITE_` (ex: `VITE_SUPABASE_URL`).

### En Local
Les scripts `hub-package.sh` et `app-package.sh` chargent automatiquement les fichiers `.env` présents dans les dossiers respectifs. Assurez-vous que vos variables y sont bien définies avant de lancer le packaging.

### Sur GitHub Actions
Les variables sensibles (comme les clés API privées) doivent être ajoutées dans les **GitHub Secrets** de votre dépôt. Le workflow `.github/workflows/build.yml` doit être édité pour mapper ces secrets aux variables d'environnement lors du build.

## 5. Configuration du Serveur de Distribution (Nginx)

Pour que vos utilisateurs reçoivent les mises à jour, vous devez exposer le dossier `releases/` sur le web.

### Installation de Nginx sur le VPS
```bash
sudo apt install nginx
```

### Configuration SSL & Sous-domaine (Recommandé)
Le fichier `vps/nginx.conf` est configuré pour utiliser un sous-domaine dédié (`updates.ethernanos.space`) et forcer le HTTPS.

1.  **DNS** : Créez un enregistrement de type **A** :
    *   **Nom** : `updates`
    *   **Valeur** : `72.60.2.96` (ou l'IP de votre VPS)
2.  **Config Nginx** : Copiez le fichier et créez le lien symbolique.
3.  **Certificat SSL** :
    ```bash
    sudo certbot --nginx -d updates.ethernanos.space
    ```

### URLs de Distribution
Vos fichiers seront alors accessibles de manière sécurisée :
- **Hub metadata** : `https://updates.ethernanos.space/releases/1.0.0/metadata.json`
