# Gérer le catalogue HIDRISSI

Votre développeur doit d'abord configurer la connexion et le déploiement. Ensuite :

1. Ouvrez `/admin/` sur le site et connectez-vous avec le compte GitHub autorisé. Pour la première installation, utilisez le jeton fourni/configuré avec votre développeur. Ne le communiquez jamais aux clients.
2. Ouvrez **Mes produits**. Chaque produit a sa propre ligne : cliquez sur son nom pour le modifier. Les colonnes affichent son prix, sa disponibilité et sa marque. Utilisez la recherche pour trouver un modèle et les filtres pour voir les produits disponibles ou en rupture.
3. Pour ajouter un produit, cliquez sur **Nouveau produit** (ou **Créer**), puis remplissez son nom, son prix, ses photos et sa marque. La référence est créée automatiquement. Ajoutez les textes arabes si disponibles : les champs arabes vides affichent le français.
4. Ajoutez les photos dans la liste **Photos**. La première est la photo principale ; réordonnez la liste si nécessaire. Ajoutez chaque photo avec son bouton d'ajout.
5. Pour changer un prix, ouvrez le produit et modifiez **Prix (dh)**, sans écrire « dh » dans le champ.
6. Pour une rupture de stock, désactivez **Disponible à la vente**. Le produit reste visible mais ne peut plus être commandé.
7. Pour supprimer un produit, ouvrez sa fiche puis choisissez **Supprimer** dans son menu. Confirmez uniquement si le modèle ne doit plus apparaître. Pour une indisponibilité temporaire, désactivez plutôt **Disponible à la vente**. Conservez ses photos si elles sont utilisées ailleurs.
8. Cliquez sur **Publier/Enregistrer**. Attendez la réussite du déploiement (souvent une à quelques minutes), puis rechargez le site. En cas d'échec, contactez le développeur : la dernière version publiée reste accessible.

## Conseils photos

Utilisez JPEG, PNG ou WebP, idéalement 3 à 6 photos par produit. Avant l'envoi, redimensionnez à 1600 pixels maximum sur le côté le plus long et compressez sous 500 Ko par photo. Convertissez les photos HEIC de l'iPhone en JPEG. Conservez les originaux sur votre appareil. Le CMS ne garantit pas automatiquement la compression. Les images existantes sont déjà optimisées.

Après publication, vérifiez la fiche en français et en arabe, son prix, ses photos et le statut du stock. Une suppression ou une erreur peut être restaurée par le développeur avec l'historique Git.
