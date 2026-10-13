/* main.c : menu principal  |  RESPONSABLE : Ayoub (relu par l'equipe)
 * Role : lit le choix de l'utilisateur et appelle les fonctions des autres fichiers.
 * Les menus de Saif (gestion.c) et d'Ahmed (analyse.c) sont etiquetes [Saif] / [Ahmed].
 *
 * LIENS AVEC L'EQUIPE
 *  - Appelle gestion.c (Saif) : menus 1 a 4 et 7.
 *  - Appelle analyse.c (Ahmed) : menus 5 et 6.
 *  - Appelle export.c (Ayoub) : menu 8.
 * Usage : ./ecocompus [fichier.csv]     (a lancer depuis le dossier c/) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

#define CSV_DEFAUT  "../data/measures_in.csv"
#define JSON_SORTIE "../data/data.json"

/* Lit une ligne de texte au clavier, sans le retour a la ligne */
static void lire_texte(const char *invite, char *dest, int taille) {
    printf("%s", invite);
    if (fgets(dest, taille, stdin) == NULL) { dest[0] = '\0'; return; }
    dest[strcspn(dest, "\n")] = '\0';
}

/* Lit un nombre ; retourne 0 si OK, -1 si le texte n'est pas un nombre valide */
static int lire_nombre(const char *invite, double *dest) {
    char tampon[64], *fin;
    lire_texte(invite, tampon, sizeof tampon);
    *dest = strtod(tampon, &fin);
    return (fin == tampon || *fin != '\0') ? -1 : 0;
}

/* [Saif] Menu 3 : saisie d'une mesure puis ajout (validation dans ajouter_mesure) */
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

static void afficher_menu(void) {
    printf("\n===== EcoCampus : module C =====\n");
    printf(" 1. Charger le fichier CSV\n");
    printf(" 2. Afficher / rechercher (batiment, ressource)\n");
    printf(" 3. Ajouter une mesure\n");
    printf(" 4. Supprimer une mesure\n");
    printf(" 5. Trier les mesures\n");
    printf(" 6. Statistiques par batiment\n");
    printf(" 7. Afficher les alertes\n");
    printf(" 8. Exporter data.json\n");
    printf(" 0. Quitter\n");
}

int main(int argc, char *argv[]) {
    const char *chemin_csv = (argc > 1) ? argv[1] : CSV_DEFAUT;
    Tableau t = {0};                       /* le "classeur" : vide au depart */
    Stat stats[MAX_STATS];
    char tampon[64], bat[TAILLE_TEXTE], res[TAILLE_TEXTE];
    int choix, nb_stats;

    do {
        afficher_menu();
        lire_texte("Votre choix : ", tampon, sizeof tampon);
        choix = atoi(tampon);

        switch (choix) {
        case 1:                                    /* [Saif] chargement */
            if (charger_csv(&t, chemin_csv) >= 0)
                printf("%d mesures en memoire.\n", t.taille);
            break;
        case 2:                                    /* [Saif] affichage et recherche ("" = tous) */
            lire_texte("Batiment (vide = tous) : ", bat, sizeof bat);
            lire_texte("Ressource (vide = toutes) : ", res, sizeof res);
            afficher_mesures(&t, bat, res, 0);
            break;
        case 3:                                    /* [Saif] ajout */
            menu_ajouter(&t);
            break;
        case 4:                                    /* [Saif] suppression */
            lire_texte("Id a supprimer : ", tampon, sizeof tampon);
            if (supprimer_mesure(&t, atoi(tampon)) == 0) printf("Mesure supprimee.\n");
            else printf("Erreur : id introuvable.\n");
            break;
        case 5:                                    /* [Ahmed] tri */
            lire_texte("Tri : 1 = par valeur (decroissant), 2 = par batiment : ",
                       tampon, sizeof tampon);
            if (atoi(tampon) == 1 || atoi(tampon) == 2) {
                trier_mesures(&t, atoi(tampon));
                afficher_mesures(&t, "", "", 0);
            } else
                printf("Choix de tri invalide.\n");
            break;
        case 6:                                    /* [Ahmed] statistiques */
            nb_stats = calculer_stats(&t, stats);
            afficher_stats(stats, nb_stats);
            break;
        case 7:                                    /* [Ayoub] alertes = mesures au-dessus du seuil */
            afficher_mesures(&t, "", "", 1);
            break;
        case 8:                                    /* [Ayoub] export JSON */
            if (t.taille == 0) {
                printf("Aucune mesure : chargez d'abord le CSV (choix 1).\n");
                break;
            }
            nb_stats = calculer_stats(&t, stats);
            if (exporter_json(&t, stats, nb_stats, chemin_csv, JSON_SORTIE) == 0)
                printf("Export reussi : %s (%d mesures, %d groupes)\n",
                       JSON_SORTIE, t.taille, nb_stats);
            break;
        case 0:
            printf("Au revoir.\n");
            break;
        default:
            printf("Choix invalide.\n");
        }
    } while (choix != 0);

    return 0;
}
