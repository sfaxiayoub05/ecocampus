/* analyse.c : tri et statistiques  |  RESPONSABLE : Ahmed
 * Role : trier les mesures (qsort) et calculer total / moyenne / max / min par groupe.
 * Utilise par : main.c (menus 5 et 6). Lit le Tableau rempli par gestion.c (Saif).
 *
 * LIENS AVEC L'EQUIPE
 *  - Recoit de Saif (gestion.c) le Tableau, avec "alerte" deja calcule a l'ajout.
 *  - Fournit a Ayoub (export.c) le tableau Stat[] ecrit dans la section "statistiques".
 *  - Appelee par Ayoub (main.c) : menus 5 et 6. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

/* Fonctions de comparaison demandees par qsort : negatif = a avant b, 0 = egal, positif = apres */
static int comparer_valeur(const void *a, const void *b) {
    double x = ((const Mesure *)a)->valeur, y = ((const Mesure *)b)->valeur;
    return (x < y) - (x > y);                 /* ordre decroissant */
}

static int comparer_batiment(const void *a, const void *b) {
    const Mesure *x = a, *y = b;
    int cmp = strcmp(x->batiment, y->batiment);
    return cmp != 0 ? cmp : strcmp(x->date, y->date);   /* a egalite : par date */
}

/* Trie le tableau avec la fonction standard qsort. */
void trier_mesures(Tableau *t, int critere) {
    qsort(t->data, t->taille, sizeof(Mesure), critere == 1 ? comparer_valeur : comparer_batiment);
}

/* Une seule passe sur les mesures : pour chacune, on retrouve (ou on cree) son groupe. */
int calculer_stats(const Tableau *t, Stat *stats) {
    int n = 0;
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];

        int g = 0;                            /* recherche du groupe (batiment, ressource) */
        while (g < n && !(strcmp(stats[g].batiment, m->batiment) == 0
                          && strcmp(stats[g].ressource, m->ressource) == 0))
            g++;

        if (g == n) {                         /* groupe inconnu : on le cree */
            if (n == MAX_STATS) continue;
            stats[g] = (Stat){ .max = m->valeur, .min = m->valeur };   /* le reste vaut 0 */
            snprintf(stats[g].batiment, sizeof stats[g].batiment, "%s", m->batiment);
            snprintf(stats[g].ressource, sizeof stats[g].ressource, "%s", m->ressource);
            snprintf(stats[g].unite, sizeof stats[g].unite, "%s", m->unite);
            n++;
        }

        Stat *s = &stats[g];                  /* mise a jour du groupe */
        s->nb_mesures++;
        s->total += m->valeur;
        s->nb_alertes += m->alerte;           /* champ calcule par ajouter_mesure (Saif) */
        if (m->valeur > s->max) s->max = m->valeur;
        if (m->valeur < s->min) s->min = m->valeur;
    }
    for (int g = 0; g < n; g++)
        stats[g].moyenne = stats[g].total / stats[g].nb_mesures;
    return n;
}

void afficher_stats(const Stat *s, int n) {
    printf("\n%-17s %-11s %3s %7s %10s %9s %9s %9s\n", "Batiment", "Ressource",
           "Nb", "Alertes", "Total", "Moyenne", "Max", "Min");
    for (int i = 0; i < n; i++)
        printf("%-17s %-11s %3d %7d %10.2f %9.2f %9.2f %9.2f\n", s[i].batiment,
               s[i].ressource, s[i].nb_mesures, s[i].nb_alertes, s[i].total,
               s[i].moyenne, s[i].max, s[i].min);
}
