# EcoCampus : module C (traitement des donnees)

Programme en C99 : charge `data/measures_in.csv`, gere les mesures (ajout, suppression,
recherche, tri), calcule les statistiques, detecte les anomalies (valeur > seuil)
et genere `data/data.json` pour le module Web.

## Structure (module C = dossier `c/`)
| Fichier | Role | Responsable |
|---|---|---|
| `gestion.h` | types (`Mesure`, `Tableau`, `Stat`) et prototypes de TOUTES les fonctions | equipe |
| `gestion.c` | charger le CSV, ajouter (+ alerte), supprimer, afficher / rechercher | Saif |
| `analyse.c` | tri (`qsort`), statistiques par batiment et ressource | Ahmed |
| `export.c` | ecriture de `data.json` | Ayoub |
| `main.c` | menu, appelle les 3 autres fichiers | Ayoub |
| `Makefile`, `tests.sh` | compilation et 32 tests automatiques | Ayoub |

## Compiler et executer (depuis le dossier `c/`)
    gcc -std=c99 -Wall -Wextra -o ecocompus main.c gestion.c analyse.c export.c
    ./ecocompus                              # lit ../data/measures_in.csv
    ./ecocompus ../data/measures_test.csv    # lit le fichier indique
Ou : `make`, `make run`, `make test`, `make clean`.
Sous Windows : `ecocompus.exe`. Pour generer le JSON : choix 1 (charger) puis 8 (exporter).

## Menu
1 charger le CSV - 2 afficher / rechercher - 3 ajouter - 4 supprimer - 5 trier -
6 statistiques - 7 alertes - 8 exporter data.json - 0 quitter

## Tests
`make test` : 32 verifications (compilation, chargement, erreurs, ajout, suppression,
recherche, tri, alertes, statistiques, export JSON valide).
Repartition : Saif (gestion.c), Ahmed (analyse.c), Ayoub (export.c, main.c, Makefile, tests).
