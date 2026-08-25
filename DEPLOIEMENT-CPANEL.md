# Déploiement sur cPanel (100 % statique)

L'application est une SPA React : **aucun Node.js n'est requis sur le serveur**.
La base de données (compétitions, notes, codes d'accès) est hébergée dans le cloud
et interrogée directement depuis le navigateur ; toute la logique sensible
(vérification des codes admin / président) vit dans des fonctions sécurisées
de la base, pas dans du code serveur.

## 1. Générer le build

```bash
npm install     # ou bun install
npm run build   # génère le dossier dist/
```

Le dossier `dist/` contient `index.html`, `assets/`, les icônes, le manifeste PWA
et le fichier `.htaccess`.

## 2. Envoyer sur cPanel

Cible : `juryscores.bitdevsgtga.org` → racine du document (ex. `public_html/juryscores/`).

1. Gestionnaire de fichiers cPanel → dossier racine du sous-domaine.
2. Téléverser **le contenu** de `dist/` (pas le dossier lui-même).
3. Vérifier que le fichier caché `.htaccess` est bien présent
   (activer « Afficher les fichiers cachés » dans le gestionnaire de fichiers).

## 3. Pourquoi le `.htaccess` est indispensable

Les routes `/login`, `/vote`, `/admin`, `/president` n'existent pas en tant que
fichiers. Le `.htaccess` renvoie `index.html` pour tout chemin inconnu, sinon un
rafraîchissement de page renverrait une erreur 404. Il gère aussi la compression
et le cache des assets.

## 4. Mise à jour

Relancer `npm run build` et remplacer le contenu du dossier en ligne.
Les noms de fichiers sont versionnés (hash), le cache navigateur se met donc à
jour tout seul.

## 5. Codes d'accès de démonstration

- Administrateur : `9999`
- Jurés : `1111`, `2222` (président), `3333`

Pensez à les modifier depuis l'espace d'administration avant l'événement.

## Note importante

Les clés incluses dans le build sont des clés **publiques** (prévues pour le
navigateur). L'accès aux données est régi par les règles de sécurité de la base.
