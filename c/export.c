/* export.c : generation de data.json  |  RESPONSABLE : Ayoub
 * Role : ecrire les sections meta, mesures et statistiques selon le format de la seance 1.
 *
 * LIENS AVEC L'EQUIPE
 *  - Recoit de Saif (gestion.c) le Tableau et de Ahmed (analyse.c) le tableau Stat[].
 *  - Appelee par Ayoub (main.c) : menu 8, toujours apres calculer_stats().
 *  - Le fichier produit (data.json) est le "contrat" lu par le module Web (seance 3). */
#include <stdio.h>
#include <time.h>
#include "gestion.h"

int exporter_json(const Tableau *t, const Stat *stats, int nb_stats,
                  const char *source, const char *chemin) {
    FILE *f = fopen(chemin, "w");
    if (f == NULL) {
        printf("Erreur : impossible de creer '%s'\n", chemin);
        return -1;
    }
    char date_gen[32];
    time_t maintenant = time(NULL);
    strftime(date_gen, sizeof date_gen, "%Y-%m-%d %H:%M:%S", localtime(&maintenant));
    int nb_alertes = 0;
    for (int i = 0; i < t->taille; i++) nb_alertes += t->data[i].alerte;

    /* ---- section meta (le nom du CSV : "\" remplace par "/" pour rester du JSON valide) ---- */
    fprintf(f, "{\n  \"meta\": {\n    \"version_format\": \"1.0\",\n");
    fprintf(f, "    \"genere_le\": \"%s\",\n    \"source\": \"", date_gen);
    for (const char *p = source; *p; p++) fputc(*p == '\\' ? '/' : *p, f);
    fprintf(f, "\",\n    \"nb_mesures\": %d,\n    \"nb_alertes\": %d\n  },\n", t->taille, nb_alertes);

    /* ---- section mesures : une ligne par mesure, virgule sauf apres la derniere ---- */
    fprintf(f, "  \"mesures\": [\n");
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        fprintf(f, "    {\"id\": %d, \"batiment\": \"%s\", \"ressource\": \"%s\", \"unite\": \"%s\", "
                   "\"valeur\": %.2f, \"seuil\": %.2f, \"date\": \"%s\", "
                   "\"alerte\": %s, \"depassement_pct\": %.1f}%s",
                m->id, m->batiment, m->ressource, m->unite, m->valeur, m->seuil, m->date,
                m->alerte ? "true" : "false", m->depassement_pct,
                (i < t->taille - 1) ? ",\n" : "\n");
    }

    /* ---- section statistiques : une ligne par groupe (batiment, ressource) ---- */
    fprintf(f, "  ],\n  \"statistiques\": [\n");
    for (int i = 0; i < nb_stats; i++) {
        const Stat *s = &stats[i];
        fprintf(f, "    {\"batiment\": \"%s\", \"ressource\": \"%s\", \"unite\": \"%s\", "
                   "\"nb_mesures\": %d, \"nb_alertes\": %d, \"total\": %.2f, \"moyenne\": %.2f, "
                   "\"max\": %.2f, \"min\": %.2f}%s",
                s->batiment, s->ressource, s->unite, s->nb_mesures, s->nb_alertes,
                s->total, s->moyenne, s->max, s->min, (i < nb_stats - 1) ? ",\n" : "\n");
    }
    fprintf(f, "  ]\n}\n");

    if (fclose(f) != 0) {                      /* detecte une ecriture incomplete */
        printf("Erreur : ecriture de '%s' incomplete\n", chemin);
        return -1;
    }
    return 0;
}
