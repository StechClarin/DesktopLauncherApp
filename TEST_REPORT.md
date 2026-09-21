# Rapport de Tests — Ethernanos Hub

> Date : 02/09/2026 — Projet : `DesktopLauncherApp`

## 1. Architecture analysée

### Backend (`project_init_django_Angular/`)
- **Django 5.2 + DRF 3.16 + Graphene-Django 3.2** sur **PostgreSQL** (`projet_init_db`)
- **REST (écriture)** : Router dynamique `RouterView` → `/api/<model>/<method>/(pk|uuid)/`
  - 44 contrôleurs générés à partir de `BaseController` (list, save, get, delete, status, export_data, import_data…)
- **GraphQL (lecture)** : `/graphql` → schéma dynamique (`schema_loader`) : **68 requêtes** chargées depuis les 10 apps
- **Auth** : SimpleJWT (`/api/auth/login/`, `/api/auth/refresh/`) avec claims custom (username, is_superuser, hub_id)
- **APIs externes (Bridge Hub)** : `/api/external/*` sécurisées par `X-Hub-Api-Key`
  - provisioning, sync-in, sync-delta, push-delta, sync-tenant, sync-assets (manifest/transfer), unlock-module, ping, health
- **Middlewares** : HubPrefix, HubHandshake, License, JWT, Establishment (14 middlewares)

### Frontend (`ui/`) — pages du Hub
- Angular 18, standalone components, signaux (signals) + RxJS
- Routes : `/login` (LoginComponent) et `/hub` (HubLayoutComponent, protégé par `authGuard`)
- Vues du Hub (onglets `HubStateService.activeTab`) :
  - `home` → HomeViewComponent (news, héros, apps récentes)
  - `library` → LibraryViewComponent (filtres statut/recherche, mode grille/liste)
  - `store` → StoreViewComponent (catalogue, catégories, deals, animations)
  - `downloads` → DownloadsViewComponent (historique, tâches)
  - `settings` → SettingsViewComponent (apparence, compte, à propos)
  - Plus : AppDetailView, InstallationWizard, SyncDebugDrawer, HubSidebar, HubHeader

### Desktop (`src-tauri/`) — Rust/Tauri
- 5 services Rust exposés via `invoke_handler` : app_manager, download, db, update + modèles (ProcessManager, DownloadManager, AppManifest, DbConfig)

---

## 2. Résultats des suites de tests

| Suite | Nombre | Résultat | Durée |
|-------|--------|----------|-------|
| Intégration LIVE (REST + GraphQL + Bridge) | 56 | **56/56 PASS** | ~40 s |
| Django TestCase (`apps.core.tests`) | 64 | **64/64 PASS** | ~6 min (avec `SKIP_SYNC_TRACKING=1`) |
| Angular Karma/Jasmine (`ng test`) | 42 | **42/42 PASS** | ~1 min |
| Rust `cargo test` (modèles) | 9 | **9/9 PASS** | ~9 s |
| **Total** | **171** | **171/171 PASS** | |

### Fichiers de test ajoutés
- `project_init_django_Angular/tests/test_api_live.py` — suite d'intégration LIVE (serveur + données seedées)
- `project_init_django_Angular/apps/core/tests/` — suite unitaire Django :
  - `base.py`, `test_auth.py`, `test_health.py`, `test_rest_router.py`, `test_graphql.py`, `test_external_api.py`, `test_middleware.py`
- `ui/src/app/...` — 5 fichiers `.spec.ts` (HubStateService, LibraryView, StoreView, AppCard, AppComponent corrigé)
- `src-tauri/src/models.rs` — module `#[cfg(test)]` (9 tests)

---

## 3. Bugs découverts et corrigés (v1.0)

| # | Bug | Symptôme | Fichier corrigé |
|---|-----|----------|-----------------|
| 1 | Code debug oublié dans `RouterView.dispatch` court-circuitant `super().dispatch()` | `export_data` → 500 `AssertionError: .accepted_renderer not set` | `apps/core/api/controllers/RouterController.py` |
| 2 | `EstablishmentMiddleware` ne validait pas le format UUID pour les superusers | `X-Establishment-ID: invalid-uuid` → 500 | `apps/core/middleware/__init__.py` |
| 3 | DRF lève `Http404` sur `?format=csv` (aucun renderer CSV enregistré) → `export_data` inaccessible | `export_data` → 404 `Not found.` | `RouterController.perform_content_negotiation` + `BaseController.perform_content_negotiation` |
| 4 | `ExportFile.to_excel` ne sérialise pas UUID/Decimal | Export Excel → `Cannot convert UUID(...) to Excel` | `apps/core/utils/exportfile.py` (`_normalize_value`) |
| 5 | `LicenseMiddleware` exécuté AVANT `JWTMiddleware` | Bypass superuser inopérant en mode Bearer (403 à tort) | `config/settings.py` (ordre des middlewares) |



---

## 4. Couverture REST testée (contexte & contraintes)

- Auth : login username/email, mauvais password → 401, refresh, claims JWT, token invalide → 401
- Router : list (GET/POST), create/update/delete, contrôleur inconnu → 404, méthode inconnue → 405, auth via router → 404
- Contraintes : `X-Establishment-ID` requis (filtrage multi-tenant), UUID malformé géré, export CSV/Excel fonctionnel, import sans fichier → 400

## 5. Couverture GraphQL testée

- Introspection : 68 champs de requête
- `me`, `establishments`, `establishment`, `users` (masque `ethernanos`), `students`, `classrooms`, `modules`, `dashboardData`
- Pagination `totalCount/items`, filtres (`search`, `username`, `isActive`)
- Sécurité : non authentifié → `me` retourne `null` (soft-fail), query invalide → erreurs GraphQL

## 6. APIs externes (Bridge Hub) testées

- Provision tenant (clé valide/invalide, champs manquants)
- Sync tenant (succès, tenant inconnu → 404, paramètre manquant → 400)
- Unlock/revoke module (404 owner inconnu, 400 champs manquants)
- Sync delta, push delta, sync-in (401 sans clé)
- Sync assets : manifest (404/400), transfer path traversal → 403, path manquant → 400

## 7. Middlewares testés

- Licence : superuser bypass (après fix ordre), blocage non-superuser sans licence → 403
- Handshake Hub : mode Hub sans jeton → 403, avec jeton → OK, hors mode Hub → OK
- Préfixe : `ETHER_APP_PREFIX` nettoyé pour le routage
- Establishment : UUID valide/invalide

## 8. Comment exécuter les suites

```bash
# Backend — tests unitaires Django (test DB PostgreSQL)
cd project_init_django_Angular
SKIP_SYNC_TRACKING=1 .venv/bin/python manage.py test apps.core.tests -v 2 --keepdb

# Backend — intégration LIVE (serveur sur 127.0.0.1:8010)
.venv/bin/python manage.py runserver 127.0.0.1:8010 &
.venv/bin/python tests/test_api_live.py

# Frontend Angular
cd ui
CHROME_BIN=/usr/bin/google-chrome npx ng test --watch=false --browsers=ChromeHeadless

# Desktop Rust
cd src-tauri
cargo test --lib
```

## 9. Recommandations

1. Ajouter un renderer CSV/Excel DRF dédié (plutôt que le bypass de négociation) pour pérenniser l'export.
2. Déplacer la logique `export_data`/`import_template` hors du paramètre `?format=` (conflit avec la négociation DRF).
3. Réduire le bruit des `print()` des middlewares (log propre) — visible dans les sorties de test.
4. `test_schema_introspection` et les requêtes GraphQL lourdes sont lentes (~6,5 s/test) : prévoir un cache de schéma / limiter l'introspection en prod.
