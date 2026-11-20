# Gérer le catalogue HIDRISSI

Votre développeur doit d'abord configurer la connexion et le déploiement. Ensuite :

1. Ouvrez `/admin/` sur le site et connectez-vous avec le compte GitHub autorisé. Pour la première installation, utilisez le jeton fourni/configuré avec votre développeur. Ne le communiquez jamais aux clients.
2. Ouvrez **Catalogue → Produits**. Les produits sont regroupés dans une liste ; enregistrez le catalogue après chaque modification.
3. Pour ajouter un produit, cliquez sur **Ajouter**, choisissez un identifiant unique comme `nouveau-modele`, remplissez nom, marque, catégorie, prix en chiffres et textes français. Ajoutez les textes arabes si disponibles : les champs arabes vides affichent le français.
4. Ajoutez les photos dans la liste **Photos**. La première est la photo principale ; réordonnez la liste si nécessaire. Ajoutez chaque photo avec son bouton d'ajout.
5. Pour changer un prix, ouvrez le produit et modifiez **Prix (dh)**, sans écrire « dh » dans le champ.
6. Pour une rupture de stock, désactivez **En stock**. Le produit reste visible mais ne peut plus être commandé.
7. Pour supprimer un produit, retirez son entrée de la liste. Conservez ses photos si elles sont utilisées ailleurs.
8. Cliquez sur **Publier/Enregistrer**. Attendez la réussite du déploiement (souvent une à quelques minutes), puis rechargez le site. En cas d'échec, contactez le développeur : la dernière version publiée reste accessible.

## Conseils photos

Utilisez JPEG, PNG ou WebP, idéalement 3 à 6 photos par produit. Avant l'envoi, redimensionnez à 1600 pixels maximum sur le côté le plus long et compressez sous 500 Ko par photo. Convertissez les photos HEIC de l'iPhone en JPEG. Conservez les originaux sur votre appareil. Le CMS ne garantit pas automatiquement la compression. Les images existantes sont déjà optimisées.

Après publication, vérifiez la fiche en français et en arabe, son prix, ses photos et le statut du stock. Une suppression ou une erreur peut être restaurée par le développeur avec l'historique Git.
