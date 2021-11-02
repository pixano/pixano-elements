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
- [ ] [#doc] mise à jour de la procédure de livraison :
	- préparation de la livraison par les masters, livraison effective tournante parmis les membres du core pour multiplier les contributeurs visibles à Pixano sans prendre de risque sur la diffusion du contenu
	- décision de ce qui est puiblique ou non par le core
	- [ ] gestion de ces livraisons via https://github.com/google/copybara ? => semble parfait sur le papier, mais semble lourd à mettre en place...
- [ ] [#doc] il faudrait avoir une carte générale des événements : qui les envoie, et à quelle occasion
- [ ] [#interface] mettre l'opacité/transparence en paramètre réglable directement dans l'affichage avec un slider (en plus ou en remplamcent du bouton "Switch opacity")
- [ ] [#interface] mettre en correspndance chaque bouton avec un raccourci clavier (et l'afficher dans l'aide du bouton, aide détaillée)
- [x] [#interface] le zoom est conservé quand on passe d'une image à l'autre (dans app)
- [o] auto-tests dans gitlab :
	- => j'ai fait le boulot pour pixano-elements, mais gitlab est mal configuré et n'arrive pas à faire tourner les tests (manque de "runners")
	- => il faudra que je vois dans les paramètres d'admin de gitlab si je peux arranger çà
- [ ] Tester [pyodide](https://pyodide.org/en/stable/) : permettrait de simplifier l'utilisation combinée du python avec le javascript (run Python inside a web browser)
- [ ] trouver un endroit où stocker les fichiers de modèles et de démo (publics ou internes) => le dépôt est devenu très lourd !!
- [ ] revoir la procédure de livraison car la "Release V0.5.15 (#8)" a merdée (code non voulu inclu + release pas crée sur github) + il ne devrait pas y avoir de contributions directement sur le github
- [x] [#feature] add options to interaction modes (e.g. brush and polygon : option 1 (create), option 2 (add), option 3 (remove))
- [o] [#feature] lancer ocean (https://github.com/researchmm/TracKit) en python avec une image/instance de test pour pouvoir valider/corriger la version javascript
- [ ] [#feature] widget jupyter de pixano-element en python pour permettre une exploitation plus facile dans le process (à la manière de 51)
- [ ] [#interface] il faudrait que le mode en court change l'état du bouton pour qu'on sache tout de suite dans quel mode on est (c'est le cas dans l'app)
- [o] [#bug] Add `current=${this.targetFrameIdx}` in generic-display
- [o] [#bug] Add observer as variable in controllers
- [ ] [#feature] Replace observer by fast-json
- [ ] [#feature] Add update display and setOffet in view-controller
- [x] [#feature] Add mouse position coordinates
- [ ] [#feature] Rethink label attributes and when/how to set them
- [x] [#feature] pouvoir faire dispariatre/apparaitre toutes les annotations (typiquement pour voir ce qu'il y a derrière)
- [ ] [#feature] il faudrait un résumé de ce qui a été étiqueté (par exemple nombre de boites de piéton, nb boite véhicule, etc)
- [ ] [#interface] rajouter davantage d'infos sur les boutons (bulle avec titre + description, plutôt que titre seul comme aujourd'hui)
- [ ] [#feature] fonctionner par calque pour permettre des annotations de type différent => à définir plus précisément

## npx serve demos/polygon/
- [ ] [#interface] quel est le plus pratique :
	- passer en mode sélection automatiquement dès qu'on a fini un polygone comme ici ?
	- ou enchainer les instances et avoir un bouton séparé pour la sélection comme dans segmentation ?

## npx serve demos/segmentation
- [x] [#bogue] le bouton du milieu (déplacement) active également le brush
- [x] [#bogue] quand on dézoome avec le scroll il ne recentre pas l'image avec firefox
- [x] [#bogue] le curseur du brush ne disparait pas quand on quitte le mode brush
- [x] [#bogue] le brush sur la gauche/droite de l’image dépasse sur l’autre côté de l’image
- [x] [#interface] indiquer dans le menu la correspondance entre ctrl-shift et union-suppr
- [x] [#bogue] supprimer une instance ne fonctionne pas
- [ ] [#interface] il manque la possibilité de fusionner des masques quand on s'est planté (à valider)
- [x] [#interface] changer noms "Add Instance" en "Add Instance (Polygon)" et "Add Instance (Brush)"
- [?] [#interface] trop de boutons, il faut qu'on fasse la modifs des boutons dont tu as parlé: générer les boutons de mode et sous-mode à partir du code JS (ex: ctrl/shift)(attention à garder le menu paramétrable - à rajouter ou enlever / changer le style) (ajouter aussi les raccourcis)
- [x] [#interface] accélérer les calculs (trop long pour une image de grande taille) : réécriture générique de BlobExtractor.extract
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
- [x] ctrl/shift : le curseur doit indiquer si on est entrain d'ajouter ou retirer
- [x] ctrl/shift : réécriture pour rendre cohérent les boutons et le clavier
- [ ] ajouter un bouton filterLittle comme dans pixano-app
- [x] adapter la taille du brush à la taille de l'image (sur cette image il est minuscule, est-ce vraiment utile ?)
- [x] segmentation : le choix des couleurs doit être lié à la config choisie et non uniquement au mode
- [x] [#feature] possibilité de donner des attributs pour les segments
- [ ] [#interface] mettre l'opacité/transparence en paramètre réglable directement dans l'affichage avec un slider (en plus ou en remplamcent du bouton "Switch opacity")

## npx serve demos/smart-segmentation/
- [ ] [#interface] un message durant le chargement serait sympa
- [x] [#interface] idem segmentation : trop de boutons
- [x] [#interface] il manque le brush comme dans segmentation
- [x] [#feature] faire fonction l'union/soustraction comme pour brush

## npx serve demos/rectangle/
- [ ] [#interface] avoir une touche pour créer une nouvelle instance OU enchainer les instances ici ?
- [ ] [#feature] possibilité des rectangles avec rotation

## npx serve demos/smart-rectangle/
- [ ] [#interface] retrouver les boutons de rectangle pour pouvoir sélectionner / corriger / déplacer les instances ?

## npx serve demos/tracking/
- [x] [#bogue] "go to next key frame" ne met pas à jour la barre de navigation + "selected" ne fonctionne pas
- [x] [#bogue] après avoir créé une nouvelle instance "new", on ne quitte plus le mode création, on ne peut plus déplacer les boites existantes y compris celle qu'on vient de créer
- [ ] [] ne devrait pas hériter de rectangle : on ne veut pas le limiter aux rectangles
- [ ] [] d'ailleurs même le fichier ne devrait pas être dans graphics-2D => mais pose problème pour la publication => créer un dépôt dédié aux séries temporelles ? Çà a du sens ?
- [-] [#bug] Add Pixi import in controller-tracking
- [ ] [#bogue] impossible de supprimer une track entre deux keyframes (il réinterpole systématiquement) => nécessaire par exemple quand la cible passe derrière un poteau
	- => casser la track en créant une keyframe à la frame n-1
	- => possibilité de continuer la track en sélectionnant son numéro en mode create (et non via "new")

## npx serve demos/smart-tracking/
- [ ] afficher sur le curseur ce que l'on est en train de faire : numéro de la track en cours / new pour une création
- [ ] afficher un indicateur (par exemple curseur de chargement) pendant le chargement du modèle + idem pendant le tracking

## npx serve demos/graph/
- [x] [#feature #eurovanille] nombre et intitulés des keypoints réglables dynamiquement ou sans modification de code en dur
- [x] [#feature] Add backspace capacity in graph to remove last keypoint in creation mode


## Questions ?
	- [ ] [#other] Replace {...this} by this in controllers ?
	- [ ] [#feature] update 3d graphics with Valeo branch
	- [ ] [#feature] remove image extension criteria to include file ending differently
	- [ ] ["feature] start guidelines

