/* [Ahmed] Menu 3 : saisie d'une mesure puis ajout (validation dans ajouter_mesure) */
static void menu_ajouter(Tableau *t) {
    char bat[TAILLE_TEXTE], res[TAILLE_TEXTE], date[TAILLE_DATE];
    double valeur, seuil;

    lire_texte("Batiment : ", bat, sizeof bat);
    lire_texte("Ressource (electricite/eau/chauffage) : ", res, sizeof res);
    lire_texte("Date (AAAA-MM-JJ HH:MM) : ", date, sizeof date);
    if (lire_nombre("Valeur : ", &valeur) != 0 || lire_nombre("Seuil : ", &seuil) != 0)
        printf("Erreur : nombre invalide, mesure non ajoutee.\n");
    else if (ajouter_mesure(t, bat, res, valeur, date, seuil) == 0)
        printf("Mesure ajoutee (id %d).\n", t->dernier_id);
    else
        printf("Erreur : donnees invalides, mesure non ajoutee.\n");
}

