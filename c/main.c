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

