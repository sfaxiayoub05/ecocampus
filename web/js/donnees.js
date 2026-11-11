/*
 * donnees.js : chargement et validation du fichier d'échange data.json
 * (produit par le module C).
 */
(function (global) {
  "use strict";

  const EcoCampus = (global.EcoCampus = global.EcoCampus || {});

  // Chemin de data.json relatif à web/index.html (serveur lancé à la racine du projet).
  const URL_DONNEES = "../data/data.json";

  // Libellés et couleurs d'affichage des ressources.
  const RESSOURCES = {
    electricite: { libelle: "Électricité", couleur: "#d99a1c" },
    eau:         { libelle: "Eau",         couleur: "#2e86ab" },
    chauffage:   { libelle: "Chauffage",   couleur: "#7b5ea7" }
  };

  const CHAMPS_MESURE = ["batiment", "ressource", "valeur", "seuil", "date"];

  /** Vérifie la structure du JSON et lève une Error lisible en cas de problème. */
  function verifier(donnees) {
    if (donnees === null || typeof donnees !== "object" || Array.isArray(donnees)) {
      throw new Error("Le fichier ne contient pas un objet JSON valide.");
    }
    if (!Array.isArray(donnees.mesures)) {
      throw new Error("Le champ « mesures » est absent ou n'est pas une liste.");
    }

    donnees.mesures.forEach(function (m, i) {
      const manquants = CHAMPS_MESURE.filter(function (c) {
        return m[c] === undefined || m[c] === null || m[c] === "";
      });
      if (manquants.length > 0) {
        throw new Error("Mesure n°" + (i + 1) + " : champ(s) manquant(s) (" + manquants.join(", ") + ").");
      }
      if (typeof m.valeur !== "number" || typeof m.seuil !== "number" || m.seuil <= 0) {
        throw new Error("Mesure n°" + (i + 1) + " : « valeur » et « seuil » doivent être des nombres (seuil > 0).");
      }
      if (!RESSOURCES[m.ressource]) {
        throw new Error("Mesure n°" + (i + 1) + " : ressource inconnue (« " + m.ressource + " »).");
      }
      m.id = m.id !== undefined ? m.id : i + 1;
      m.alerte = Boolean(m.alerte);
      m.unite = m.unite || (m.ressource === "eau" ? "m3" : "kWh");
      m.taux = (m.valeur / m.seuil) * 100; // niveau par rapport au seuil, en %
    });

    donnees.statistiques = Array.isArray(donnees.statistiques) ? donnees.statistiques : [];
    donnees.meta = donnees.meta || {};
    return donnees;
  }

  /** Charge data.json via fetch(). */
  async function chargerDepuisUrl(url) {
    let reponse;
    try {
      reponse = await fetch(url || URL_DONNEES, { cache: "no-store" });
    } catch (e) {
      throw new Error(
        "Impossible de lire " + (url || URL_DONNEES) + ". Ouvrez la page avec un serveur local " +
        "(extension Live Server ou « python -m http.server »), ou utilisez « Charger un fichier »."
      );
    }
    if (!reponse.ok) {
      throw new Error(
        "Fichier data.json introuvable (HTTP " + reponse.status + "). " +
        "Lancez d'abord le programme C pour le générer."
      );
    }
    let json;
    try {
      json = await reponse.json();
    } catch (e) {
      throw new Error("data.json n'est pas un JSON valide.");
    }
    return verifier(json);
  }

  /** Charge un fichier JSON choisi par l'utilisateur (FileReader). */
  function chargerDepuisFichier(fichier) {
    return new Promise(function (resolve, reject) {
      const lecteur = new FileReader();
      lecteur.onerror = function () { reject(new Error("Lecture du fichier impossible.")); };
      lecteur.onload = function () {
        try {
          resolve(verifier(JSON.parse(lecteur.result)));
        } catch (e) {
          reject(e instanceof SyntaxError ? new Error("Ce fichier n'est pas un JSON valide.") : e);
        }
      };
      lecteur.readAsText(fichier, "utf-8");
    });
  }

  EcoCampus.Donnees = {
    RESSOURCES: RESSOURCES,
    chargerDepuisUrl: chargerDepuisUrl,
    chargerDepuisFichier: chargerDepuisFichier
  };
})(window);
