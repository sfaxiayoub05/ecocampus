#!/bin/sh
# tests.sh : tests automatiques du module C (a lancer depuis le dossier c/)
# Usage : sh tests.sh      (ou : make test)
# Principe : on simule la frappe au clavier (menu) et on cherche un motif dans la sortie.
# Responsables : T1, T5 (alertes), T6 = Ayoub | T2, T3 = Saif | T4, T5 (stats) = Ahmed

OK=0; KO=0
EXE=./ecocompus
TEST=../data/measures_test.csv

# verifier "nom du test" "sortie du programme" "motif attendu"
verifier() {
    if printf '%s' "$2" | grep -q -- "$3"; then
        echo "[OK] $1"; OK=$((OK + 1))
    else
        echo "[ECHEC] $1 (motif attendu : $3)"; KO=$((KO + 1))
    fi
}

# lancer "fichier csv" "touches du menu"
lancer() { printf '%b' "$2" | $EXE "$1" 2>&1; }

echo "== T1 : compilation sans warning [Ayoub] =="
make clean >/dev/null
if make 2>&1 | grep -qE "warning|error"; then
    echo "[ECHEC] compilation"; KO=$((KO + 1))
else
    echo "[OK] compilation"; OK=$((OK + 1))
fi

echo "== T2 : chargement du CSV [Saif] =="
verifier "20 mesures chargees"  "$(lancer $TEST '1\n0\n')" "20 mesures en memoire"
verifier "fichier absent"       "$(lancer absent.csv '1\n0\n')" "impossible d'ouvrir"
SORTIE=$(lancer ../data/measures_erreurs.csv '1\n0\n')
verifier "ligne 3 invalide"     "$SORTIE" "Ligne 3 invalide"
verifier "ligne 4 invalide"     "$SORTIE" "Ligne 4 invalide"
verifier "ligne 5 invalide"     "$SORTIE" "Ligne 5 invalide"
verifier "2 mesures valides"    "$SORTIE" "2 mesures en memoire"
verifier "rechargement sans doublon" "$(lancer $TEST '1\n1\n2\n\n\n0\n')" "(20 mesures)"

echo "== T3 : ajout, suppression, recherche [Saif] =="
verifier "ajout valide"         "$(lancer $TEST '1\n3\nCantine\neau\n2026-10-04 08:00\n12\n30\n0\n')" "Mesure ajoutee (id 21)"
verifier "ajout seuil 0"        "$(lancer $TEST '3\nCantine\neau\n2026-10-04 08:00\n12\n0\n0\n')" "donnees invalides"
verifier "ajout ressource inconnue" "$(lancer $TEST '3\nCantine\ngaz\n2026-10-04 08:00\n12\n30\n0\n')" "donnees invalides"
verifier "ajout batiment vide"  "$(lancer $TEST '3\n\neau\n2026-10-04 08:00\n12\n30\n0\n')" "donnees invalides"
verifier "ajout guillemet refuse" "$(lancer $TEST '3\nCan"tine\neau\n2026-10-04 08:00\n12\n30\n0\n')" "donnees invalides"
verifier "ajout valeur non numerique" "$(lancer $TEST '3\nCantine\neau\n2026-10-04 08:00\nabc\n30\n0\n')" "nombre invalide"
verifier "suppression"          "$(lancer $TEST '1\n4\n1\n2\n\n\n0\n')" "Mesure supprimee"
verifier "19 mesures apres suppression" "$(lancer $TEST '1\n4\n1\n2\n\n\n0\n')" "(19 mesures)"
verifier "suppression id inconnu" "$(lancer $TEST '1\n4\n999\n0\n')" "id introuvable"
verifier "recherche Residence/chauffage" "$(lancer $TEST '1\n2\nResidence\nchauffage\n0\n')" "(3 mesures)"
verifier "recherche partielle Biblio" "$(lancer $TEST '1\n2\nBiblio\n\n0\n')" "(4 mesures)"
verifier "recherche sans resultat" "$(lancer $TEST '1\n2\nInconnu\n\n0\n')" "(0 mesures)"

echo "== T4 : tri [Ahmed] =="
verifier "tri par valeur : 745.00 en premier" "$(lancer $TEST '1\n5\n1\n0\n' | grep -A1 '^ID')" "745.00"
verifier "tri par batiment : Administration en premier" "$(lancer $TEST '1\n5\n2\n0\n' | grep -A1 '^ID')" "Administration"
verifier "choix de tri invalide" "$(lancer $TEST '1\n5\n9\n0\n')" "tri invalide"

echo "== T5 : alertes [Ayoub] et statistiques [Ahmed] =="
SORTIE=$(lancer $TEST '1\n7\n0\n')
verifier "6 alertes"            "$SORTIE" "(6 mesures)"
verifier "Bibliotheque +30 %"   "$SORTIE" "+30.0%"
verifier "Residence +20 %"      "$SORTIE" "+20.0%"
verifier "stats Bibliotheque : total 1190.10, moyenne 396.70" \
         "$(lancer $TEST '1\n6\n0\n' | grep 'Bibliotheque.*electricite')" "1190.10 *396.70 *520.00 *329.60"

echo "== T6 : export JSON [Ayoub] =="
rm -f ../data/data.json
verifier "message d'export"     "$(lancer $TEST '1\n8\n0\n')" "Export reussi"
if [ -f ../data/data.json ] && python3 -m json.tool ../data/data.json >/dev/null 2>&1; then
    echo "[OK] data.json est un JSON valide"; OK=$((OK + 1))
else
    echo "[ECHEC] data.json absent ou invalide"; KO=$((KO + 1))
fi
verifier "nb_mesures = 20"      "$(cat ../data/data.json)" '"nb_mesures": 20'
verifier "nb_alertes = 6"       "$(cat ../data/data.json)" '"nb_alertes": 6'
verifier "export sans donnees refuse" "$(lancer $TEST '8\n0\n')" "chargez d'abord"

echo
echo "Resultat : $OK reussi(s), $KO echec(s)"
[ "$KO" -eq 0 ]
