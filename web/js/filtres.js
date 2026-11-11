/*
 * filtres.js : recherche, filtrage et tri côté client (aucun appel au C).
 */
(function (global) {
  "use strict";

  const EcoCampus = (global.EcoCampus = global.EcoCampus || {});

  const FILTRES_PAR_DEFAUT = {
    texte: "",
    ressource: "",
    debut: "",
    fin: "",
    alertesSeulement: false
  };

  /** Minuscules sans accents : « Bibliothèque » et « bibliotheque » se valent. */
  function normaliser(texte) {
    return String(texte).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  /** Retourne les mesures qui respectent tous les critères actifs. */
  function filtrerMesures(mesures, f) {
    const motif = normaliser(f.texte);
    return mesures.filter(function (m) {
      const jour = m.date.slice(0, 10); // "AAAA-MM-JJ", comparable en texte
      if (motif && normaliser(m.batiment).indexOf(motif) === -1) return false;
      if (f.ressource && m.ressource !== f.ressource) return false;
      if (f.debut && jour < f.debut) return false;
      if (f.fin && jour > f.fin) return false;
      if (f.alertesSeulement && !m.alerte) return false;
      return true;
    });
  }

  /** Filtre les statistiques du C (qui n'ont pas de date) par bâtiment et ressource. */
  function filtrerStatistiques(stats, f) {
    const motif = normaliser(f.texte);
    return stats.filter(function (s) {
      if (motif && normaliser(s.batiment).indexOf(motif) === -1) return false;
      if (f.ressource && s.ressource !== f.ressource) return false;
      return true;
    });
  }

  /** Retourne une copie triée. sens : 1 (croissant) ou -1 (décroissant). */
  function trierMesures(mesures, cle, sens) {
    return mesures.slice().sort(function (a, b) {
      const x = a[cle];
      const y = b[cle];
      let r;
      if (typeof x === "number" && typeof y === "number") {
        r = x - y;
      } else {
        r = String(x).localeCompare(String(y), "fr", { sensitivity: "base" });
      }
      return (r !== 0 ? r : a.id - b.id) * sens;
    });
  }

  EcoCampus.Filtres = {
    PAR_DEFAUT: FILTRES_PAR_DEFAUT,
    normaliser: normaliser,
    filtrerMesures: filtrerMesures,
    filtrerStatistiques: filtrerStatistiques,
    trierMesures: trierMesures
  };
})(window);
