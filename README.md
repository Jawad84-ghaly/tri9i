# طريقي — Tri9i

Application GPS Android/iOS en React Native, Expo Managed et TypeScript. Interface maison et instructions en Darija marocaine, écrites en alphabet arabe. Thème vert menthe, crème et terre cuite, avec alertes sur la carte et phrases humoristiques courtes.

Le projet est une **base fonctionnelle à tester**, avec démonstration simulée et intégrations réseau réelles. Ce n'est pas un remplacement validé de Waze : les tests sur appareil, la validation routière et l'exploitation d'un service communautaire public restent à réaliser.

## Démarrer en mode démonstration

Prérequis : Node.js 22 LTS ou supérieur, npm, Android/iOS. Le projet utilise Expo SDK 55, React Native 0.83.10 et React 19.2. Le fichier `pnpm-lock.yaml` fixe les versions vérifiées ; pnpm 11 est une autre option d'installation.

```bash
npm install
```

Copier `.env.example` vers `.env` (`Copy-Item .env.example .env` sous PowerShell, `cp .env.example .env` sous macOS/Linux). Conserver `EXPO_PUBLIC_DEMO_MODE=true`, puis :

```bash
npx expo start --go
```

Utiliser **une version d'Expo Go compatible SDK 55**. Les versions récentes de l'application du store peuvent ne plus prendre en charge ce SDK : dans ce cas, créer un development build décrit ci-dessous. Android permet de récupérer une version adaptée depuis [expo.dev/go](https://expo.dev/go). Sur iPhone physique, privilégier un development build si Expo Go est incompatible.

Dans l'application : toucher « جرّب الطريق فـ كازا », sélectionner un des trois critères et « يالله نمشيو ». Un véhicule simulé parcourt le trajet en environ 90 secondes. Le bandeau signale clairement la simulation. Les tracés sont des fixtures illustratives, pas des itinéraires carrossables. Les alertes démo et les signalements démo restent locaux à ce téléphone. Le fond de carte nécessite Internet même en démo. Aucune permission GPS n'est demandée en démo.

Avec pnpm, utiliser `pnpm install --frozen-lockfile`, puis `pnpm exec expo start --go`. `pnpm-workspace.yaml` autorise le script d'installation d'esbuild nécessaire aux tests.

Pour forcer la démonstration même si `.env` contient le mode réel : `npm run demo`.
Sous Windows, le lanceur `START-DEMO.ps1` installe les dépendances si nécessaire puis démarre Expo.
Le lanceur limite l'accès au PC par défaut. Pour autoriser explicitement l'accès depuis un téléphone sur un Wi-Fi de confiance : `npm run demo -- --lan` ou `./START-DEMO.ps1 -Lan`. Le téléphone et le PC doivent être sur le même réseau Wi-Fi ; le serveur de développement devient accessible aux autres appareils de ce réseau.

Le lanceur détecte l'adresse Wi-Fi actuelle et attend un manifeste Expo valide avant de générer `.local/qr.png` et `.local/connection.json`. Scanner le nouveau QR dans **Expo Go → Scan QR code** sur Android. Garder le lanceur ouvert : une image QR n'héberge pas l'application et ne reste pas valable après changement de réseau ou arrêt du serveur. Pour diagnostiquer le réseau, ouvrir `http://ADRESSE_DU_PC:8081/status` dans le navigateur du téléphone : la réponse attendue est `packager-status:running`. Si cette page ne répond pas, vérifier le Wi-Fi commun, le VPN et l'isolation des appareils par le routeur avant de rescanner. Le lanceur ne modifie pas le pare-feu et n'ouvre pas de tunnel public.

## Passer au GPS réel

### Si le téléphone ne peut pas joindre le PC en Wi-Fi

Sous Windows, pour garder Expo actif indépendamment du terminal de test : `./START-DEMO.ps1 -Tunnel -Background`. Le PC doit rester allumé, éveillé et connecté. Consulter `.local/expo.out.log`, `.local/expo.err.log` et `.local/qr.png`. Pour arrêter uniquement cette instance et ses processus enfants : `./STOP-DEMO.ps1`. Le script d'arrêt vérifie que l'identifiant enregistré appartient encore au lanceur de ce projet.

Après accord pour exposer temporairement le serveur de développement via ngrok, lancer `npm run demo -- --tunnel` (Windows : `./START-DEMO.ps1 -Tunnel`). Le composant `@expo/ngrok` est inclus dans les dépendances de développement. Le nouveau QR est généré dans `.local/qr.png` après réception de l'adresse du tunnel. Il reste nécessaire de garder le PC et ce processus actifs. Toute personne possédant le lien peut accéder au serveur et au code de développement tant que le tunnel fonctionne. Arrêter avec Ctrl+C dès la fin du test. Ce mode ne modifie pas le pare-feu Windows et ne déploie pas une application permanente.

Dans `.env` :

```dotenv
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_MAPBOX_TOKEN=pk.votre_jeton_public
EXPO_PUBLIC_ALERTS_URL=https://votre-serveur-de-test.example
GOOGLE_MAPS_ANDROID_API_KEY=votre_cle_google_android
```

Redémarrer Metro avec `npx expo start --clear` après modification. Les variables `EXPO_PUBLIC_*` sont incorporées au client : ne jamais y mettre un secret, une clé privée ou une URL de flux partenaire contenant des identifiants.

1. Créer un compte Mapbox, activer l'accès et la facturation nécessaires pour **Directions API** et **Geocoding API v6**, puis utiliser un jeton public `pk.*`. Contrôler quotas, restrictions applicables et coûts dans le compte.
2. Pour Android en build natif, activer **Maps SDK for Android** dans Google Cloud et renseigner `GOOGLE_MAPS_ANDROID_API_KEY`. Restreindre cette clé au package `ma.tri9i.navigation` et aux empreintes SHA-1 des signatures de développement/production. `app.config.ts` injecte réellement la valeur dans le plugin `react-native-maps` : une chaîne `process.env...` écrite dans `app.json` ne serait pas évaluée.
3. iOS utilise **Apple Maps**, sans clé Google. `react-native-maps` n'affiche pas des tuiles Mapbox ; Mapbox fournit ici la recherche, les routes et les incidents. Le SDK natif Mapbox Navigation n'est pas utilisé.
4. Autoriser la localisation précise, activer le GPS, puis rechercher une adresse/ville au Maroc ou maintenir un doigt sur la carte. Le géocodage couvre les adresses et lieux administratifs, pas une recherche exhaustive de commerces/POI. Les noms propres viennent du fournisseur, demandé en arabe ; ils peuvent être retournés dans leur langue d'origine.
5. Choisir un critère et démarrer. Le suivi caméra peut être désactivé en déplaçant la carte, puis réactivé avec « ورّيني بلاصتي ».

Le refus d'accès, le GPS indisponible, les fixes vieux de plus de 20 secondes ou imprécis de plus de 60 mètres bloquent le démarrage et le signalement. Il n'y a aucun basculement automatique vers une fausse position ou de fausses routes.

## Builds Android et iOS

L'application reste en Managed Workflow : les plugins Expo configurent les projets natifs à la compilation.

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
# Sur iOS : compte Apple, signature et appareil enregistré selon le type de build.
npx eas-cli build --profile development --platform ios
npx expo start --dev-client
```

Configurer les mêmes variables dans l'environnement EAS utilisé par le build. Ne pas compter sur un `.env` ignoré par Git pour fournir les valeurs au build distant. Reconstruire après changement de clé native ou de permission. Ne pas remplacer les identifiants de package sans mettre à jour les restrictions des clés.

`npm run android` et `npm run ios` ouvrent un émulateur/simulateur installé. Le simulateur iOS local nécessite macOS/Xcode ; Windows permet le développement Android et les builds iOS distants EAS.

## Trois critères : ce qui est calculé

`services/routingService.ts` envoie deux requêtes indépendantes à `mapbox/driving-traffic`, chacune demandant des alternatives : une standard et une avec `exclude=toll`. Géométrie GeoJSON et étapes de manœuvre sont validées à réception.

| Choix affiché | Calcul réel | Limite indiquée |
| --- | --- | --- |
| Le plus rapide | Durée minimale parmi les candidats reçus, profil trafic | Données historiques/live selon disponibilité locale ; aucune garantie de couverture live au Maroc |
| Le plus économique | Meilleure estimation de carburant parmi les candidats demandés sans péages, sans intersection `toll` ni notification de violation de cette exclusion | Modèle indicatif : 6,5 L/100 km + 0,6 L/heure ; pas de prix du carburant ni modèle moteur/pente |
| Le plus court | Distance minimale parmi tous les candidats reçus | Ne garantit pas le minimum global sur le réseau routier |

Toujours trois **cartes de critères**, pas trois tracés forcément différents. Un parcours identique est étiqueté. Si aucun trajet sans péage n'est disponible, son option est désactivée : on ne présente pas un trajet à péage comme économique. Si toutes les requêtes échouent, une erreur s'affiche ; aucun tracé démo n'est injecté.

Pour garantir un vrai plus court chemin, il faudrait ajouter un moteur dont la pondération est explicitement la distance sur le graphe routier. Le profil automobile standard d'OSRM ne garantit pas non plus cet objectif, et le serveur public OSRM n'apporte pas de trafic live. Ce projet préfère annoncer cette limite plutôt que présenter des alternatives rapides comme un optimum mathématique.

Le calcul est rafraîchi toutes les 90 secondes en navigation au premier plan (deux requêtes à chaque cycle). Les incidents présents dans les réponses Directions sont extraits pour le trajet, sans prétendre couvrir toute la ville. L'interface indique l'âge du dernier calcul et l'absence de données trafic confirmées. Les données `congestion` connues prouvent la présence d'annotations, pas le caractère live de chaque segment. Si le critère choisi devient indisponible, le dernier trajet reste affiché avec une indication d'échec de mise à jour.

## Serveur communautaire testable

```bash
npm run server
```

Le serveur écoute par défaut sur `127.0.0.1:8787`. Il est autonome, en JavaScript Node.js, sans base externe. Les signalements sont enregistrés dans `.local/alerts.json` par remplacement atomique et survivent au redémarrage. Les expirations sont : 30 minutes pour police, 60 pour radar, 120 pour travaux, 45 pour accident, 15 pour bouchon. Les sessions anonymes restent en mémoire ; le client en recrée une après expiration ou redémarrage. La variable serveur `ALERTS_STORAGE_FILE` permet de choisir un fichier sur un volume persistant. Ne pas exécuter plusieurs instances sur le même fichier ; utiliser une base partagée pour ce cas.

Une erreur d'écriture renvoie HTTP 503 et n'est pas annoncée comme un signalement réussi. Un fichier illisible ou corrompu bloque le démarrage sans être écrasé. Les tests utilisent le stockage mémoire lorsqu'aucun chemin n'est fourni à `createAlertServer()`.

Pour deux téléphones, rendre ce serveur accessible via **une URL HTTPS de développement** ou un déploiement de test, puis mettre cette URL dans `EXPO_PUBLIC_ALERTS_URL` sur les deux appareils, en mode réel. Le code ne déploie ni n'expose automatiquement le serveur. `localhost` sur un téléphone désigne le téléphone. Les builds natifs peuvent bloquer HTTP non chiffré ; utiliser HTTPS évite de relâcher les paramètres natifs. Si nécessaire pour un proxy local, `HOST=0.0.0.0` et `PORT` sont configurables.

| Méthode | Chemin | Fonction |
| --- | --- | --- |
| GET | `/health` | État et disponibilité du flux partenaire |
| POST | `/session` | Session anonyme temporaire d'une heure |
| GET | `/alerts?bbox=ouest,sud,est,nord` | Alertes non expirées dans une zone, maximum 2 000 |
| POST | `/alerts` | Signalement authentifié par la session anonyme |

Corps de signalement :

```json
{
  "kind": "accident",
  "coordinate": { "latitude": 33.59, "longitude": -7.62 }
}
```

Types : `police`, `radar`, `construction`, `accident`, `traffic`. Le client obtient sa session au premier signalement. En-têtes d'écriture : `Content-Type: application/json` et `Authorization: Bearer <session>`. Identifiant, source, date et expiration sont attribués par le serveur. Les entrées sont validées, la taille des corps limitée et le nombre de requêtes restreint. Une session expirée côté serveur est réinitialisée au prochain essai manuel.

La carte recharge les alertes toutes les 15 secondes autour de la position (rayon approximatif de 15 km). C'est du **quasi temps réel par polling**, pas une connexion WebSocket. Une panne garde uniquement les alertes encore valides et affiche l'état hors connexion ; les expirées disparaissent. Le bouton de signalement n'indique le succès qu'après confirmation du serveur. Le serveur ne conserve pas de trajectoire GPS, mais reçoit la zone de consultation et le point signalé.

Avant une ouverture publique, remplacer cette base de développement par un service avec stockage partagé, comptes ou attestation d'appareil, modération, validation des signalements et quotas distribués. Les sessions anonymes ne vérifient ni l'identité ni la présence sur les lieux. Le limiteur utilise l'adresse du socket ; derrière un proxy, prévoir une politique explicite de confiance du proxy. Ne pas réutiliser cette configuration telle quelle pour un service public.

## Waze et autres flux

Il n'existe pas ici d'API Waze publique anonyme permettant d'importer librement toutes les alertes. Waze Data Feed est réservé aux partenaires autorisés et aux zones convenues. OpenStreetMap fournit une base cartographique, pas un flux communautaire live de police/accidents. Les données trafic Mapbox ne constituent pas un accès aux alertes police Waze.

Un adaptateur Waze JSON est fourni dans `server/waze.mjs`. Une fois l'accès partenaire obtenu, définir **uniquement sur le serveur** `WAZE_FEED_URL` avec l'URL accordée, puis démarrer. Le serveur interroge le flux toutes les deux minutes, normalise les alertes reconnues et ignore les entrées invalides ou anciennes. Le code traite la collection `alerts` (police, accidents, bouchons, travaux), pas les géométries `jams` ni un flux XML. La durée de 30 minutes est une politique conservatrice du prototype. Adapter ce traitement au contrat et à la version du flux attribué ; aucune connexion partenaire réelle n'a été testée sans identifiants.

Ne pas partager l'URL du flux dans l'application. Ne pas démarrer ce branchement sans autorisation du fournisseur. Le statut du flux se consulte via `/health` ; l'indicateur mobile concerne le serveur communautaire, pas la santé du fournisseur Waze.

## Darija et guidage vocal

`constants/darijaAudioPrompts.ts` contient les libellés, les alertes humoristiques et le traducteur de manœuvres. On génère les indications depuis `type`, `modifier` et `exit` ; on ne lit pas les instructions anglaises du fournisseur.

Exemples : « دور على ليمن », « الصبر زين، والطريق ما غاديش يطير », « اللي بغا أتاي، يركن اللّول ». Les alertes radar invitent à ralentir et à respecter la route.

`expo-speech` recherche d'abord une voix système `ar-MA`, puis une voix arabe. La présence d'une voix arabe ne garantit pas une prononciation marocaine. Un message signale ce repli ; si aucune voix arabe n'est installée, les instructions visuelles restent utilisables et aucune voix française/anglaise n'est sélectionnée. Sur iPhone, désactiver le mode silencieux pour tester `expo-speech`. Les dialogs système de permissions et les noms natifs de la carte suivent la langue de l'OS.

Pour une voix Darija garantie, remplacer `services/speechService.ts` par un service TTS Darija via serveur, ou enregistrer un corpus audio natif. Aucune clé privée de TTS ne doit être embarquée. La version livrée utilise exclusivement le moteur système demandé.

## Comportement et limites de navigation

- Suivi au premier plan, mise en veille désactivée pendant la navigation. Pas de service GPS arrière-plan, de guidage écran verrouillé ou d'Android Auto/CarPlay.
- Projection géométrique du GPS sur la polyligne et progression par étapes. Les intersections rapprochées, boucles et routes superposées nécessitent encore un véritable map matching et une validation terrain.
- Recalcul après trois fixes successifs à plus de 80 mètres du tracé, avec délai minimal de 30 secondes entre tentatives.
- Annonce d'une manœuvre distante, puis à moins de 230 mètres et de 40 mètres. Les manœuvres priment sur l'humour, avec limitation des répétitions d'alertes. Voix coupée à la mise en arrière-plan.
- Alertes vocales seulement devant le véhicule sur le tracé, à moins de 550 mètres et à moins de 65 mètres latéralement. Le sens de circulation d'un signalement n'est pas connu : une alerte sur la chaussée opposée peut rester visible/annoncée.
- Arrivée : à moins de 45 mètres de l'extrémité routière et avec moins de 90 mètres restants sur le tracé. L'extrémité est celle renvoyée par le moteur, éventuellement recalée sur la route.
- Temps restant estimé proportionnellement au parcours restant jusqu'au prochain calcul ; pas de recalcul d'ETA par vitesse instantanée. La démonstration se met en pause en arrière-plan puis reprend au même endroit.
- Au démarrage du guidage réel, un trajet calculé depuis plus de 30 secondes ou depuis une origine éloignée de plus de 60 mètres est recalculé avant de commencer.
- Pas de cartes hors ligne, de limite de vitesse fiable, de reconnaissance des voies ou de confirmation collaborative des alertes.

## Structure

```text
tri9i/
├── App.tsx
├── index.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── app.json
├── app.config.ts
├── eas.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── constants/
│   ├── config.ts
│   └── darijaAudioPrompts.ts
├── data/demo.ts
├── hooks/
│   ├── useLocation.ts
│   └── useAlerts.ts
├── screens/NavigationScreen.tsx
├── services/
│   ├── routingService.ts
│   ├── searchService.ts
│   ├── alertsService.ts
│   ├── speechService.ts
│   └── http.ts
├── types/navigation.ts
├── utils/
│   ├── geo.ts
│   └── guidance.ts
├── server/
│   ├── index.mjs
│   ├── waze.mjs
│   ├── storage.mjs
│   └── server.test.mjs
├── tests/navigation.test.ts
├── scripts/start-demo.mjs
├── START-DEMO.ps1
├── VALIDATION.md
└── README.md
```

## Vérifications

```bash
npm run typecheck
npm test
npm run test:server
npx expo install --check
npx expo export --platform all
```

Les tests couvrent la sélection multicritère, les requêtes de routing, le refus de faux trajets économiques, les erreurs réseau, les distances, l'arrivée, les alertes en avant/derrière/hors trajet/expirées, la traduction des manœuvres, puis une interaction HTTP réelle de signalement et consultation entre clients, avec validation et expiration.

Recette manuelle sur Android **et** iOS :

1. Démo sans clé : trois options, lancement, déplacement simulé, changement de caméra, cinq types de marqueurs et signalement local.
2. GPS réel : autorisation refusée puis acceptée, GPS imprécis, adresse introuvable et destination choisie sur la carte.
3. Clé Mapbox réelle : route, données trafic disponibles/absentes, exclusion des péages, alternatives identiques et quota dépassé.
4. Deux téléphones : publier sur A et constater l'alerte sur B dans les 15 secondes ; couper le serveur et vérifier l'indication de panne.
5. Simuler une déviation, une arrivée, une perte réseau et une mise en arrière-plan ; vérifier absence de voix en arrière-plan.
6. Tester une voix `ar-MA`, un repli arabe et un appareil sans voix arabe. Vérifier le texte sur petit écran, grande police et lecteur d'écran.

Un export JavaScript réussi ne remplace pas la compilation native et ces essais sur appareils. Les API externes réelles nécessitent les clés de l'utilisateur.

## Documentation des fournisseurs

- [Expo SDK 55](https://expo.dev/changelog/sdk-55) : versions React/React Native.
- [react-native-maps dans Expo](https://docs.expo.dev/versions/v55.0.0/sdk/map-view/) : Expo Go et configuration de la carte native.
- [Expo Location](https://docs.expo.dev/versions/v55.0.0/sdk/location/) : localisation au premier plan.
- [Expo Speech](https://docs.expo.dev/versions/v55.0.0/sdk/speech/) : voix système et mode silencieux iOS.
- [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/) : alternatives, exclusions, annotations et incidents.
- [Mapbox Geocoding v6](https://docs.mapbox.com/api/search/geocoding/) : recherche de destination.
- [Couverture Mapbox](https://docs.mapbox.com/help/dive-deeper/mapbox-data/) : disponibilité par territoire.
- [Spécification Waze Data Feed](https://support.google.com/waze/partners/answer/13458165?hl=en) : accès partenaire et données autorisées.

Les conditions d'utilisation, l'attribution et les droits de redistribution des données de chaque fournisseur doivent être conservés dans l'application finale.
