Ce fichier contient la liste des modifications/corrections prévues dans ce code. Ce fichier doit rester interne et ne pas se retrouver sur le github.  
Chaque point est rangé dans la section qui le concerne, càd. la fonctionnalité concernée.  

#Tags :
- [#interface] : modification concernant l'interface utilisateur : la visualisation, les boutons, etc
- [#bug] : bogue
	- [#firefox] : bogue lié uniquement à firefox
- [#feature] : nouvelle fonctionnalité / complément à une fonctionnalité existante
- [#doc] : besoin en documentation


# AFAIRE :
## général
- [ ] [#interface] modifier raccourcis clavier ? : systématiquement accompagner de ctrl ? Avec m,p et h, çà se déclenche quand on rajoute des commentaires...
- [ ] [#doc] nettoyer le dépôt github comme on l'a fait pour le gitlab
- [x] [#feature] nouveau module de classification
- [x] [#doc] tabulations/espaces uniformisée dans tous les fichiers
- [ ] [#feature] intégrer les labels et la gestion des annotations (locales) dans elements/core plutôt que dans app
- [ ] [#feature] permettre une démo complète (comme https://pixano.github.io/demo/demo.html avec chargement d'image, labels et export) pour chaque élément + conserver des démos simples pour debug (reste à voir comment séparer sans dupliquer le code)
- [ ] [#feature] créer une liste des objets étiquetés => pour l'app, séparation avec la sélection de la classe => s'inspirer des tiles du tracking : tout peut être uniformisé ici : liste des objets = liste des tracks, tile = modifs des attributs d'un objet/track
- [ ] [#doc] afficher le numéro de version de piwano-element correspondant au dernier commit ou tag + possibilité de le récupérer facilement depuis app
- [ ] [#interface] use the same key bindings everywere it is possible (and choose between implementing it in controller or in pxn-*)
- [ ] [#doc] mise à jour de la procédure de livraison :
	- préparation de la livraison par les masters, livraison effective tournante parmis les membres du core pour multiplier les contributeurs visibles à Pixano sans prendre de risque sur la diffusion du contenu
	- décision de ce qui est puiblique ou non par le core
	- [ ] gestion de ces livraisons via https://github.com/google/copybara ? => semble parfait sur le papier, mais semble lourd à mettre en place...
- [ ] [#doc] il faudrait avoir une carte générale des événements : qui les envoie, et à quelle occasion
- [ ] [#interface] mettre l'opacité/transparence en paramètre réglable directement dans l'affichage avec un slider (en plus ou en remplamcent du bouton "Switch opacity")
- [ ] [#interface] mettre en correspndance chaque bouton avec un raccourci clavier (et l'afficher dans l'aide du bouton, aide détaillée)
- [x] [#interface] le zoom est conservé quand on passe d'une image à l'autre (dans app)
- [ ] [#interface] pour les séquences d'images, on veut que le zoom reste le même d'une image à l'autre => mettre une option à cocher ? (cohée par défaut dans tracking et décochée par défaut le reste du temps ?)
- [o] auto-tests dans gitlab :
	- => j'ai fait le boulot pour pixano-elements, mais gitlab est mal configuré et n'arrive pas à faire tourner les tests (manque de "runners")
	- => il faudra que je vois dans les paramètres d'admin de gitlab si je peux arranger çà
- [ ] Tester [pyodide](https://pyodide.org/en/stable/) : permettrait de simplifier l'utilisation combinée du python avec le javascript (run Python inside a web browser)
- [ ] trouver un endroit où stocker les fichiers de modèles et de démo (publics ou internes) => le dépôt est devenu très lourd !!
- [ ] revoir la procédure de livraison car la "Release V0.5.15 (#8)" a merdée (code non voulu inclu + release pas crée sur github) + il ne devrait pas y avoir de contributions directement sur le github
- [ ] [#feature] widget jupyter de pixano-element en python pour permettre une exploitation plus facile dans le process (à la manière de 51)
- [ ] [#interface] il faudrait que le mode en court change l'état du bouton pour qu'on sache tout de suite dans quel mode on est (c'est le cas dans l'app)
- [o] [#bug] Add observer as variable in controllers
- [ ] [#feature] Replace observer by fast-json
- [ ] [#feature] Add update display and setOffet in view-controller
- [ ] [#feature] Rethink label attributes and when/how to set them
- [ ] [#feature] il faudrait un résumé de ce qui a été étiqueté (par exemple nombre de boites de piéton, nb boite véhicule, etc)
- [ ] [#interface] rajouter davantage d'infos sur les boutons (bulle avec titre + description, plutôt que titre seul comme aujourd'hui)
- [ ] [#feature] fonctionner par calque pour permettre des annotations de type différent => à définir plus précisément
- [ ] [#bug] Doit faire un rebase pour supprimer les gros fichiers de l'historique
- [ ] [#feature] fichiers à supprimer si pb (compléter commande cleanall)
- [ ] [#bug] modifier le readme de la démo de l'element seul
- [x] [#interface] raccourci clavier pour Toggle Labels

## npx serve demos/polygon/
- [ ] [#interface] quel est le plus pratique :
	- passer en mode sélection automatiquement dès qu'on a fini un polygone comme ici ?
	- ou enchainer les instances et avoir un bouton séparé pour la sélection comme dans segmentation ?

## npx serve demos/segmentation
- [ ] [#interface] il manque la possibilité de fusionner des masques quand on s'est planté (à valider)
- [?] [#interface] trop de boutons, il faut qu'on fasse la modifs des boutons dont tu as parlé: générer les boutons de mode et sous-mode à partir du code JS (ex: ctrl/shift)(attention à garder le menu paramétrable - à rajouter ou enlever / changer le style) (ajouter aussi les raccourcis)
- [o] [#interface] accélérer les calculs (trop long pour une image de grande taille) :
	1. méthode extract de BlobExtractor : 3-4s minimum à chaque appel (et il y en a à chaque sélection de mode, à chaque fois qu'on termine une zone, à chaque fois qu'on sélectionne une zone)
		- => réécriture générique de BlobExtractor.extract :
			- temps plus résonnables dépendant du nb de pixels couverts par la zone (de 200ms à 1s)
			- reste sous-optimal :
				- tout est recalculé à chaque fois ! il faudrait réécrire la classe et la manière de s'en servir pour conserver une carte complète des blobs, les calculer uniquement à la création, puis les mettre à jour si une nouvelle instance passe par dessus
				- extract sert pour deux fonctions de controller-mask : getPolygon et MaskManager.filterId; qui n'en tirent pas la même chose :
					- getPolygon : veut uniquement les coutours d'un blob donné
					- filterId veut tous les blobs pour pouvoir filtrer les plus petits
					- => il faudrait séparer les deux fonctionnalités, çà éviterait des calculs inutiles
				- on pourrait aussi gagner en calculant pour chaque instance une boite englobante (et effectuer les calculs à l'intérieur). Cette boite pourrait d'ailleurs être utile dans la base de données.
	2. l'affichage en direct de la zone couverte par le brush est également lente, mais c'est moins génant (plus compréhensible par un utilisateur en tout cas)
		- => le tracé n'est pas négligeable (autour de 200-300ms en général), mais il y a d'autres temps plus importants et génants qui sont cachés... une idée d'où çà peut venir ?
- [o] [#interface] ne plus utiliser un masque unique avec identité RGB, mais un masque binaire par instance (et une identité par un seul id) => plus simple à comprendre et gérer et potentiellement plus rapide si bien géré
- [ ] ajouter un bouton filterLittle comme dans pixano-app
- [x] [#feature] possibilité de donner des attributs pour les segments
- [ ] [#interface] mettre l'opacité/transparence en paramètre réglable directement dans l'affichage avec un slider (en plus ou en remplamcent du bouton "Switch opacity")
- [x] [#interface] possibilité d'utiliser tab comme dans les autres plugins
- [x] [#interface] connecter taggleLabels et toggleMask pour standardiser
- [ ] [#bogue] segmentation : get copy/paste to work
- [x] [#bogue] tab : les éléments supprimés restent dans la liste
- [x] [#bogue] tab : implémnetation du shift+tab comme pour les canvas2d
- [x] [#bogue] quand on supprime une instance, elle n'est pas supprimée du masque 

## npx serve demos/smart-segmentation/
- [x] [#interface] un message durant le chargement serait sympa
- [x] [#bogue] label pas pris en compte pour la création (à vérifier)

## npx serve demos/rectangle/
- [ ] [#interface] avoir une touche pour créer une nouvelle instance (n) OU enchainer les instances ici ? => uniformisation des comportements entre les modules et possibilité de personnaliser
- [ ] [#feature] possibilité des rectangles avec rotation

## npx serve demos/smart-rectangle/
- [ ] [#interface] retrouver les boutons de rectangle pour pouvoir sélectionner / corriger / déplacer les instances ?

## npx serve demos/tracking/
- [ ] [#feature] ne devrait pas hériter de rectangle : on ne veut pas le limiter aux rectangles
- [ ] [#feature] d'ailleurs même le fichier ne devrait pas être dans graphics-2D => mais pose problème pour la publication => créer un dépôt dédié aux séries temporelles ? Çà a du sens ?
- [-] [#bug] Add Pixi import in controller-tracking
- [ ] [#bogue] impossible de supprimer une track entre deux keyframes (il réinterpole systématiquement) => nécessaire par exemple quand la cible passe derrière un poteau
	- => casser la track en créant une keyframe à la frame n-1
	- => possibilité de continuer la track en sélectionnant son numéro en mode create (et non via "new")
- [ ] [#bogue] dupplication des boites jusqau'au bout au lieu d'attendre d'avoir une deuxième key pour interpoler
- [ ] [#bogue] tracking à l'envers
- [ ] [#feature] on veut que le zoom reste le même d'une image à l'autre, contrairement au fonctionnemnt hors tracking

## npx serve demos/smart-tracking/
- [ ] [#interface] afficher sur le curseur ce que l'on est en train de faire : numéro de la track en cours / new pour une création
- [ ] [#interface] afficher un indicateur (par exemple curseur de chargement) pendant le chargement du modèle + idem pendant le tracking
- [ ] [#bogue] smart-tracking : on peut encore utiliser la touche t et lancer un apprentissage après l'avoir quitté => trouver le removeEventListener manquant

## npx serve demos/graph/
- [ ] le bouton "edit" ne sert à rien

## Questions ?
	- [ ] [#other] Replace {...this} by this in controllers ?
	- [ ] [#feature] update 3d graphics with Valeo branch
	- [ ] [#feature] remove image extension criteria to include file ending differently
	- [ ] ["feature] start guidelines

