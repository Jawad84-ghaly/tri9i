# Vérifications de la livraison

## Version 1.1 — 24 septembre 2026

TypeScript strict réussi ; 16 tests mobiles (dont 4 sur la persistance des favoris), 4 tests serveur et 2 tests de connexion réussis. L'option économique préfère l'absence de péage et avertit explicitement lorsqu'une requête d'évitement retourne des péages. Un serveur communautaire sans flux partenaire annonce maintenant Waze désactivé, jamais connecté. Le workflow live exige un jeton Mapbox public et un serveur HTTPS joignable ; aucun accès fournisseur ni hébergement live n'est configuré au moment de ces vérifications. Les favoris sur appareil, les API authentifiées et les trajets GPS réels restent à valider sur téléphone.

Vérifié le 18 septembre 2026, sous Windows avec Node.js 24.19.0.

| Vérification | Résultat |
| --- | --- |
| TypeScript strict (`tsc --noEmit`) | Réussi |
| Vitest — logique mobile et API simulées | 12 tests réussis |
| Node test runner — serveur HTTP, stockage persistant et adaptateur partenaire | 4 tests réussis |
| Compatibilité des dépendances (`expo install --check`) | Versions attendues par Expo |
| Export Android par Metro/Hermes | Réussi, 739 modules, bundle d'environ 2,6 Mo |
| Export iOS par Metro/Hermes | Réussi, 741 modules, bundle d'environ 2,6 Mo |
| Démarrage du serveur Expo | Réussi, `/status` répond `packager-status:running` |
| Manifestes Android/iOS servis par Expo | HTTP 200 pour chaque plateforme, SDK 55 |
| Bundles de développement Android/iOS servis par Expo | HTTP 200, environ 6,3 Mo chacun |
| Serveur communautaire | `/health` répond `ok: true`, stockage fichier activé |

Le test serveur démarre une véritable instance HTTP locale, obtient une session, soumet un signalement, le consulte depuis une autre requête et vérifie son expiration. Les tests de routing simulent les réponses du fournisseur ; ils ne prouvent pas la couverture réseau ou trafic réelle.

Non exécuté faute d'appareil/simulateur et de clés fournis : compilation native APK/IPA, validation visuelle Android/iOS, guidage GPS réel, prononciation vocale, requêtes Mapbox authentifiées, connexion à un flux Waze partenaire. Le protocole de recette manuelle est dans le README.

L'archive contient les sources et le verrouillage des dépendances, sans `node_modules`, secrets, fichiers de cache ni bundles de vérification. Installer les dépendances avant le lancement. Le backend fourni conserve les signalements dans un fichier local et sert aux essais ; son exploitation publique demande les adaptations décrites dans le README.

La reprise a corrigé l'instruction de virage avancée trop tôt, ajouté la revalidation d'un trajet ancien avant départ, conservé la progression de la démo après passage en arrière-plan et annulé les requêtes en cours lorsque l'application quitte le premier plan. Le stockage a des tests de reprise après redémarrage, d'expiration et de refus d'écrasement d'un fichier corrompu.

Le lancement sur le Wi-Fi a été effectué après autorisation explicite de l'utilisateur. Le serveur communautaire reste limité à `127.0.0.1`. Aucune clé ni donnée partenaire réelle n'a été ajoutée.

## Correction de connexion du 21 septembre 2026

Tentative de tunnel autorisée par l'utilisateur : `@expo/ngrok` mis à jour vers 4.1.3, puis délai de démarrage Expo porté de 10 à 60 secondes dans un wrapper limité à ce processus. Le tunnel a brièvement annoncé une connexion, puis a perdu la session lors du téléchargement Android. Le contrôle public a retourné HTTP 404 `ERR_NGROK_3200` (endpoint offline) ; les journaux ont signalé des erreurs de connexion et de certificat. Aucun QR de tunnel n'a été livré comme fonctionnel. Le processus de diagnostic a été arrêté. Un changement de réseau est nécessaire pour poursuivre la vérification sur téléphone ; aucune validation TLS ni règle de pare-feu n'a été désactivée.

Le QR de la session précédente utilisait une ancienne adresse Wi-Fi et Expo était arrêté. Le lanceur détecte maintenant l'adresse actuelle, contrôle le manifeste Android avant de produire le QR et enregistre l'URL et la date dans `.local/connection.json`. Deux tests supplémentaires vérifient le choix du Wi-Fi et le rejet des adresses locales non utilisables depuis le téléphone (`npm run test:connection`). Aucun pare-feu n'a été désactivé, aucun tunnel public n'a été créé. La connexion depuis le téléphone reste à confirmer par l'utilisateur.

## Vérification réussie le 22 septembre 2026

Après changement de réseau, tunnel Expo/ngrok lancé avec le délai de 60 secondes. Vérification externe HTTPS : manifeste Android HTTP 200, bundle Android HTTP 200 (6 270 983 octets), puis réponse packager-status:running. Le QR livré correspond à cette session. Aucun lancement sur appareil n'est encore confirmé par ces contrôles serveur.


## Maintien du serveur — 22 septembre 2026, 12:47 UTC

Le précédent processus de test n'était plus actif lors du retour de l'utilisateur (tunnel HTTP 404 ERR_NGROK_3200). Expo a été relancé avec Start-Process Windows en arrière-plan indépendant. Manifeste et téléchargement externe Android de 6 270 983 octets vérifiés HTTP 200, puis contrôle de disponibilité réussi. Des commandes Windows de démarrage en arrière-plan et d'arrêt ciblé ont été ajoutées. La validation sur le téléphone reste à confirmer.

