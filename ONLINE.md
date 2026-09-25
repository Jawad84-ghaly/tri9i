# Activer Tri9i en ligne

Le code et une démonstration sont publiés. **La publication GitHub seule ne connecte ni trafic ni alertes.** Il faut les accès ci-dessous, puis construire le mode `live`.

## 1. Mapbox : recherche, trajets et trafic

1. Créer le compte sur https://account.mapbox.com/auth/signup/ et vérifier l’adresse e-mail.
2. Dans https://account.mapbox.com/access-tokens/, copier le jeton **public** `pk.…`. Ne jamais mettre un jeton secret `sk.…` dans l’application.
3. Ouvrir https://github.com/Jawad84-ghaly/tri9i/settings/secrets/actions/new.
4. Nom : `EXPO_PUBLIC_MAPBOX_TOKEN`. Valeur : jeton public. Valider **Add secret**.

Le jeton public sera inclus dans l’APK. Limiter ses permissions aux besoins de l’application et surveiller l’utilisation dans Mapbox. Vérifier les tarifs/quotas affichés par le fournisseur avant d’activer une facturation.

## 2. Hébergement HTTPS des alertes

Créer un compte sur https://dashboard.render.com/register, éventuellement avec GitHub. Le fichier `render.yaml` prépare un **pilote gratuit en ligne** :

1. Dans Render : **New → Blueprint**, connecter uniquement `Jawad84-ghaly/tri9i` puis sélectionner la branche `main`.
2. Vérifier que le plan est **Free**, puis déployer le service `tri9i-alerts`.
3. Copier l’URL HTTPS attribuée par Render, puis ouvrir son chemin `/health`. Il doit répondre avec `ok: true`. Sans partenaire Waze, `partnerEnabled: false` est normal.
4. Dans https://github.com/Jawad84-ghaly/tri9i/settings/variables/actions créer `EXPO_PUBLIC_ALERTS_URL`, avec l’URL HTTPS du service, sans `/health`.

**Limites du pilote gratuit :** mise en veille après inactivité, réveil pouvant dépasser le délai de l’application, signalements perdus au redémarrage. Réessayer après le réveil. Ce n’est pas un service de production permanent. Pour une disponibilité continue, choisir explicitement une offre payante avec disque persistant (chemin `ALERTS_STORAGE_FILE` sur ce disque), ou une base partagée adaptée. Les sessions anonymes restent temporaires ; le serveur fourni est mono-instance et ses limites par IP derrière le proxy peuvent être partagées entre utilisateurs. Avant une diffusion large : protection anti-abus au niveau passerelle, modération, supervision et politique de confidentialité.

Documentation Render : https://render.com/docs/free et https://render.com/docs/blueprint-spec.

## 3. Construire et tester le vrai mode en ligne

Dans GitHub → **Actions → Android APK → Run workflow** : choisir `live`. La vérification exige un jeton Mapbox public, vérifie son accès au calcul de trajet et contrôle le serveur HTTPS. Une configuration manquante bloque la construction ; aucune simulation ne remplace des données manquantes.

Installer `tri9i-live.apk` depuis la release créée après succès. Sur le téléphone : autoriser le GPS, chercher une destination réelle, calculer les trois trajets, tester **Changer de trajet**, puis envoyer et vérifier un signalement depuis deux appareils. Tester d’abord à l’arrêt. En cas de perte réseau, le dernier trajet reste visible avec un avertissement ; les mises à jour nécessitent Internet. Le guidage reste au premier plan.

## Alertes externes et voix

- Le trafic et les incidents Mapbox dépendent de la couverture. Ils ne garantissent pas tous les contrôles ou radars.
- Les données Waze requièrent un partenariat autorisé et ses droits de redistribution. Configurer `WAZE_FEED_URL` uniquement dans Render, jamais dans GitHub public ni l’APK. Aucun flux communautaire Google Maps n’est connecté.
- Les textes et consignes sont en Darija par défaut ; français et anglais sont proposés. Les crédits imposés aux fournisseurs, noms de lieux et noms des voix ne sont pas traduits artificiellement.
- La synthèse vocale utilise les voix du téléphone : priorité à `ar-MA`, sinon avertissement pour le repli arabe. Un accent marocain naturel à 100 % n’est pas garanti par le moteur système. L’écran de réglages permet d’écouter et de choisir les voix disponibles. Aucune reconnaissance vocale de demandes de trajet n’est intégrée : le changement utilise les boutons.
