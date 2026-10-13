/* gestion.h : structures de donnees et prototypes du module C
 * UN SEUL fichier d'en-tete pour toute l'equipe (comme demande par le guide de la seance 2).
 * Il declare les structures Mesure, Tableau, Stat et les fonctions des 3 fichiers .c.
 * C'est le "contrat" entre Saif, Ahmed et Ayoub : NE PAS MODIFIER sans prevenir les autres. */
#ifndef GESTION_H
#define GESTION_H

#define MAX_MESURES  1000      /* capacite du tableau */
#define MAX_STATS    100       /* nombre maximal de groupes (batiment, ressource) */
#define TAILLE_TEXTE 40
#define TAILLE_DATE  20

/* Une mesure = une ligne du CSV + deux champs calcules (alerte, depassement) */
typedef struct {
    int    id;                      /* identifiant unique */
    char   batiment[TAILLE_TEXTE];
    char   ressource[TAILLE_TEXTE]; /* "electricite", "eau" ou "chauffage" */
    char   unite[8];                /* "kWh" ou "m3" */
    char   date[TAILLE_DATE];       /* "AAAA-MM-JJ HH:MM" */
    double valeur;
    double seuil;
    int    alerte;                  /* 1 si valeur > seuil, sinon 0 */
    double depassement_pct;         /* depassement du seuil en %, 0 si pas d'alerte */
} Mesure;

/* Le "classeur" : toutes les mesures en memoire */
typedef struct {
    Mesure data[MAX_MESURES];
    int    taille;                  /* nombre de mesures stockees */
    int    dernier_id;              /* dernier identifiant attribue */
} Tableau;

/* Statistiques d'un couple (batiment, ressource) */
typedef struct {
    char   batiment[TAILLE_TEXTE];
    char   ressource[TAILLE_TEXTE];
    char   unite[8];
    int    nb_mesures;
    int    nb_alertes;
    double total, moyenne, max, min;
} Stat;

/* ---- gestion.c [Saif] : donnees ---- */
/* Retourne le nombre de mesures chargees, ou -1 si le fichier est absent. */
int  charger_csv(Tableau *t, const char *chemin);
/* Retourne 0 si OK, -1 si donnees invalides ou tableau plein. Calcule l'alerte. */
int  ajouter_mesure(Tableau *t, const char *batiment, const char *ressource,
                    double valeur, const char *date, double seuil);
/* Retourne 0 si OK, -1 si l'id n'existe pas. */
int  supprimer_mesure(Tableau *t, int id);
/* Affiche les mesures filtrees ("" = pas de filtre ; alertes_seules = 1 pour les alertes). */
void afficher_mesures(const Tableau *t, const char *batiment, const char *ressource,
                      int alertes_seules);

/* ---- analyse.c [Ahmed] : tri et statistiques ---- */
/* critere 1 = valeur decroissante, critere 2 = batiment puis date. */
void trier_mesures(Tableau *t, int critere);
/* Remplit stats[] (au plus MAX_STATS cases) et retourne le nombre de groupes. */
int  calculer_stats(const Tableau *t, Stat *stats);
void afficher_stats(const Stat *stats, int n);

/* ---- export.c [Ayoub] : fichier data.json pour le module Web ---- */
/* Retourne 0 si OK, -1 si le fichier ne peut pas etre ecrit. */
int  exporter_json(const Tableau *t, const Stat *stats, int nb_stats,
                   const char *source, const char *chemin);

#endif
