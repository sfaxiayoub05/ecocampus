/* gestion.c : donnees du module C  |  RESPONSABLE : Saif
 * Role : charger le CSV, ajouter, supprimer, rechercher / afficher les mesures.
 *
 * LIENS AVEC L'EQUIPE
 *  - Fournit a Ahmed (analyse.c) le Tableau rempli, avec le champ "alerte" deja calcule.
 *  - Fournit a Ayoub (export.c) les memes mesures pour les ecrire dans data.json.
 *  - Appelee par Ayoub (main.c) : menus 1, 2, 3, 4 et 7.
 *  - Les types (Mesure, Tableau) sont definis dans gestion.h : ne pas les modifier seul. */
#include <stdio.h>
#include <string.h>
#include "gestion.h"

/* Ajoute une mesure a la fin du tableau apres validation, et calcule son alerte.
 * Appelee par charger_csv (ci-dessous) et par le menu "Ajouter" (main.c). */
int ajouter_mesure(Tableau *t, const char *batiment, const char *ressource,
                   double valeur, const char *date, double seuil) {
    /* 1. Validation : champs non vides, ressource connue, nombres coherents, tableau non plein.
     *    strpbrk refuse " et \ dans les textes : ils casseraient le fichier JSON. */
    if (t->taille >= MAX_MESURES || batiment[0] == '\0' || date[0] == '\0'
        || valeur < 0 || seuil <= 0
        || strpbrk(batiment, "\"\\") != NULL || strpbrk(date, "\"\\") != NULL
        || (strcmp(ressource, "electricite") != 0 && strcmp(ressource, "eau") != 0
            && strcmp(ressource, "chauffage") != 0))
        return -1;

    /* 2. Remplissage de la premiere case libre (snprintf ne depasse jamais la taille) */
    Mesure *m = &t->data[t->taille];
    m->id = ++t->dernier_id;
    snprintf(m->batiment, sizeof m->batiment, "%s", batiment);
    snprintf(m->ressource, sizeof m->ressource, "%s", ressource);
    snprintf(m->date, sizeof m->date, "%s", date);
    snprintf(m->unite, sizeof m->unite, "%s", strcmp(ressource, "eau") == 0 ? "m3" : "kWh");
    m->valeur = valeur;
    m->seuil = seuil;

    /* 3. Detection de l'anomalie : valeur strictement superieure au seuil */
    m->alerte = (valeur > seuil);
    m->depassement_pct = m->alerte ? (valeur - seuil) / seuil * 100.0 : 0.0;

    t->taille++;
    return 0;
}

/* Lit le CSV (en-tete : batiment,ressource,valeur,date,seuil). Une ligne invalide est
 * signalee avec son numero puis ignoree. Remplace le contenu actuel du tableau. */
int charger_csv(Tableau *t, const char *chemin) {
    FILE *f = fopen(chemin, "r");
    if (f == NULL) {
        printf("Erreur : impossible d'ouvrir '%s'\n", chemin);
        return -1;
    }
    char ligne[256], bat[TAILLE_TEXTE], res[TAILLE_TEXTE], date[TAILLE_DATE];
    double valeur, seuil;
    int numero = 1, charges = 0;

    t->taille = 0;
    t->dernier_id = 0;
    if (fgets(ligne, sizeof ligne, f) == NULL) {      /* 1re ligne = en-tete, ignoree */
        fclose(f);
        return 0;
    }
    while (fgets(ligne, sizeof ligne, f) != NULL) {
        numero++;
        /* sscanf decoupe la ligne en 5 champs separes par des virgules */
        if (sscanf(ligne, "%39[^,],%39[^,],%lf,%19[^,],%lf", bat, res, &valeur, date, &seuil) == 5
            && ajouter_mesure(t, bat, res, valeur, date, seuil) == 0)
            charges++;
        else if (ligne[strspn(ligne, " \t\r\n")] != '\0')  /* ignore les lignes vides */
            printf("Ligne %d invalide : ignoree\n", numero);
    }
    fclose(f);
    return charges;
}

/* Supprime la mesure d'identifiant id : memmove decale les suivantes vers la gauche. */
int supprimer_mesure(Tableau *t, int id) {
    for (int i = 0; i < t->taille; i++) {
        if (t->data[i].id == id) {
            memmove(&t->data[i], &t->data[i + 1], (t->taille - i - 1) * sizeof(Mesure));
            t->taille--;
            return 0;
        }
    }
    return -1;
}

/* Affiche les mesures correspondant aux filtres. strstr(texte, "") est toujours vrai :
 * un filtre vide ("") signifie donc "tous". Recherche partielle : "Biblio" trouve Bibliotheque.
 * Avec alertes_seules = 1, n'affiche que les mesures qui depassent leur seuil. */
void afficher_mesures(const Tableau *t, const char *batiment, const char *ressource,
                      int alertes_seules) {
    int n = 0;
    printf("\n%-3s %-17s %-11s %9s %-4s %9s %-16s %s\n",
           "ID", "Batiment", "Ressource", "Valeur", "Un.", "Seuil", "Date", "Etat");
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        if (strstr(m->batiment, batiment) == NULL || strstr(m->ressource, ressource) == NULL
            || (alertes_seules && !m->alerte))
            continue;
        char etat[24] = "";
        if (m->alerte) snprintf(etat, sizeof etat, "ALERTE +%.1f%%", m->depassement_pct);
        printf("%-3d %-17s %-11s %9.2f %-4s %9.2f %-16s %s\n", m->id, m->batiment,
               m->ressource, m->valeur, m->unite, m->seuil, m->date, etat);
        n++;
    }
    printf("(%d mesures)\n", n);
}
