/*
 * app.js : point d'entrée de l'interface. Charge data.json puis met à jour
 * l'état global, les chiffres clés, le graphique et les tableaux.
 */
(function () {
  "use strict";

  const Donnees = EcoCampus.Donnees;
  const Filtres = EcoCampus.Filtres;
  const Graphique = EcoCampus.Graphique;

  const etat = {
    donnees: null,
    filtres: Object.assign({}, Filtres.PAR_DEFAUT),
    tri: { cle: "date", sens: -1 }
  };

  const $ = function (id) { return document.getElementById(id); };

  /* ---------- Utilitaires d'affichage ---------- */

  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function nombre(n, decimales) {
    return Number(n).toLocaleString("fr-FR", {
      minimumFractionDigits: decimales === undefined ? 1 : decimales,
      maximumFractionDigits: decimales === undefined ? 1 : decimales
    });
  }

  /** "2026-10-01 08:00" -> "01/10/2026 08:00" */
  function dateFr(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(d);
    return m ? m[3] + "/" + m[2] + "/" + m[1] + m[4] : d;
  }

  function pastille(ressource) {
    const r = Donnees.RESSOURCES[ressource];
    return '<span class="ec-pastille" style="background:' + r.couleur + '"></span>' + echapper(r.libelle);
  }

  function depassement(m) {
    return m.depassement_pct !== undefined ? m.depassement_pct : Math.max(0, m.taux - 100);
  }

  /* ---------- Messages ---------- */

  function afficherErreur(message) {
    $("zone-erreur").innerHTML =
      '<div class="alert alert-danger d-flex gap-3 align-items-start mb-0">' +
      '<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>' +
      "<div><strong>Les données ne peuvent pas être affichées.</strong><br>" + echapper(message) + "</div></div>";
  }

  function effacerErreur() {
    $("zone-erreur").innerHTML = "";
  }

  /* ---------- Rendu ---------- */

  function rendreEtat(donnees) {
    const mesures = donnees.mesures;
    const total = mesures.length;
    const alertes = mesures.filter(function (m) { return m.alerte; }).length;
    const batiments = new Set(mesures.map(function (m) { return m.batiment; })).size;
    const pct = total > 0 ? (alertes / total) * 100 : 0;
    let titre;

    if (total === 0) titre = "Aucune mesure disponible";
    else if (alertes === 0) titre = "Aucune alerte : tout est sous les seuils";
    else if (alertes === 1) titre = "1 mesure dépasse son seuil";
    else titre = alertes + " mesures dépassent leur seuil";

    $("etat-titre").textContent = titre;
    document.querySelector(".ec-etat").classList.toggle("a-des-alertes", alertes > 0);

    let detail = "Sur " + total + " mesure" + (total > 1 ? "s" : "") + " relevée" + (total > 1 ? "s" : "") +
      " dans " + batiments + " bâtiment" + (batiments > 1 ? "s" : "") + ".";
    if (donnees.meta.genere_le) detail += " Données générées le " + dateFr(donnees.meta.genere_le) + ".";
    $("etat-detail").textContent = detail;

    $("jauge-ok").style.width = (100 - pct) + "%";
    $("jauge-alerte").style.width = pct + "%";
    $("jauge-legende").textContent = nombre(pct, 0) + " % des mesures sont en alerte (" + alertes + " sur " + total + ").";
    $("jauge").setAttribute("aria-label", alertes + " mesures en alerte sur " + total);

    $("pied-source").textContent = donnees.meta.source
      ? "Source : " + donnees.meta.source + " (module C)"
      : "Données produites par le module C (data.json)";
  }

  function rendreChiffres(mesures) {
    const alertes = mesures.filter(function (m) { return m.alerte; });
    const batiments = new Set(mesures.map(function (m) { return m.batiment; })).size;

    $("chiffre-mesures").textContent = mesures.length;
    $("chiffre-batiments").textContent = batiments;
    $("chiffre-alertes").textContent = alertes.length;

    if (alertes.length === 0) {
      $("chiffre-depassement").textContent = "0 %";
      $("chiffre-depassement-nom").textContent = "aucun dépassement";
    } else {
      const pire = alertes.reduce(function (a, b) { return depassement(b) > depassement(a) ? b : a; });
      $("chiffre-depassement").textContent = "+" + nombre(depassement(pire), 0) + " %";
      $("chiffre-depassement-nom").textContent =
        "pire dépassement (" + pire.batiment + ", " + Donnees.RESSOURCES[pire.ressource].libelle.toLowerCase() + ")";
    }
  }

  function rendreStatistiques(stats) {
    const corps = $("corps-stats");
    if (stats.length === 0) {
      corps.innerHTML = '<tr><td colspan="6" class="text-center ec-note py-4">Aucune statistique pour ces critères.</td></tr>';
      return;
    }
    corps.innerHTML = stats.map(function (s) {
      return "<tr><td>" + echapper(s.batiment) + "</td><td>" + pastille(s.ressource) + "</td>" +
        '<td class="text-end">' + nombre(s.total) + " " + echapper(s.unite || "") + "</td>" +
        '<td class="text-end">' + nombre(s.moyenne) + "</td>" +
        '<td class="text-end">' + nombre(s.max) + "</td>" +
        '<td class="text-end">' + nombre(s.min) + "</td></tr>";
    }).join("");
  }

  function rendreMesures(mesures) {
    const tries = Filtres.trierMesures(mesures, etat.tri.cle, etat.tri.sens);
    const vide = tries.length === 0;

    $("table-mesures").classList.toggle("d-none", vide);
    $("vide-mesures").classList.toggle("d-none", !vide);
    $("compteur-mesures").textContent = tries.length + " mesure" + (tries.length > 1 ? "s" : "") + " affichée" + (tries.length > 1 ? "s" : "");

    $("corps-mesures").innerHTML = tries.map(function (m) {
      const etatCellule = m.alerte
        ? '<span class="ec-badge ec-badge-alerte">Alerte +' + nombre(depassement(m), 0) + " %</span>"
        : '<span class="ec-badge ec-badge-ok">Normal</span>';
      return '<tr class="' + (m.alerte ? "ec-ligne-alerte" : "") + '">' +
        "<td>" + echapper(m.batiment) + "</td>" +
        "<td>" + pastille(m.ressource) + "</td>" +
        '<td class="text-end">' + nombre(m.valeur) + " " + echapper(m.unite) + "</td>" +
        '<td class="text-end">' + nombre(m.seuil) + " " + echapper(m.unite) + "</td>" +
        "<td>" + echapper(dateFr(m.date)) + "</td>" +
        "<td>" + etatCellule + "</td></tr>";
    }).join("");

    // Indicateurs de tri dans l'en-tête
    document.querySelectorAll("#table-mesures thead th").forEach(function (th) {
      const actif = th.dataset.cle === etat.tri.cle;
      const icone = th.querySelector(".bi");
      th.setAttribute("aria-sort", actif ? (etat.tri.sens === 1 ? "ascending" : "descending") : "none");
      icone.className = "bi " + (actif ? (etat.tri.sens === 1 ? "bi-chevron-up" : "bi-chevron-down") : "bi-chevron-expand");
    });
  }

  function rendreGraphique(mesures) {
    const dessine = Graphique.dessiner($("graphique"), mesures);
    $("graphique").classList.toggle("d-none", !dessine);
    $("graphique-vide").classList.toggle("d-none", dessine);
  }

  function rendreTout() {
    if (!etat.donnees) return;
    const mesures = Filtres.filtrerMesures(etat.donnees.mesures, etat.filtres);
    rendreChiffres(mesures);
    rendreGraphique(mesures);
    rendreStatistiques(Filtres.filtrerStatistiques(etat.donnees.statistiques, etat.filtres));
    rendreMesures(mesures);
  }

  /* ---------- Chargement ---------- */

/* ---------- Chargement ---------- */

  function afficher(donnees) {
    // ---> AJOUTEZ CETTE LIGNE ICI POUR WATTI :
    window.ecoData = donnees;

    etat.donnees = donnees;
    effacerErreur();
    rendreEtat(donnees);
    rendreTout();
  }

  function echecChargement(erreur) {
    etat.donnees = null;
    Graphique.detruire();
    afficherErreur(erreur.message);
    $("etat-titre").textContent = "Aucune donnée chargée";
    $("etat-detail").textContent = "Générez data.json avec le module C, puis cliquez sur « Actualiser ».";
    document.querySelector(".ec-etat").classList.remove("a-des-alertes");
    $("jauge-ok").style.width = "0";
    $("jauge-alerte").style.width = "0";
    $("jauge-legende").textContent = "";
    ["chiffre-mesures", "chiffre-batiments", "chiffre-alertes"].forEach(function (id) { $(id).textContent = "0"; });
    $("chiffre-depassement").textContent = "0 %";
    $("corps-stats").innerHTML = "";
    $("corps-mesures").innerHTML = "";
    $("compteur-mesures").textContent = "";
    $("graphique").classList.add("d-none");
    $("graphique-vide").classList.remove("d-none");
  }

  function charger() {
    return Donnees.chargerDepuisUrl().then(afficher).catch(echecChargement);
  }

  /* ---------- Filtres et événements ---------- */

  function lireFiltres() {
    etat.filtres = {
      texte: $("f-texte").value,
      ressource: $("f-ressource").value,
      debut: $("f-debut").value,
      fin: $("f-fin").value,
      alertesSeulement: $("f-alertes").checked
    };
    rendreTout();
  }

  function reinitialiserFiltres() {
    $("f-texte").value = "";
    $("f-ressource").value = "";
    $("f-debut").value = "";
    $("f-fin").value = "";
    $("f-alertes").checked = false;
    lireFiltres();
  }

  function appliquerTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    $("icone-theme").className = "bi " + (theme === "dark" ? "bi-sun" : "bi-moon-stars");
    try { localStorage.setItem("ecocampus-theme", theme); } catch (e) { /* stockage indisponible */ }
    rendreTout(); // le graphique relit les couleurs du thème
  }

  function themeInitial() {
    try {
      const memorise = localStorage.getItem("ecocampus-theme");
      if (memorise === "dark" || memorise === "light") return memorise;
    } catch (e) { /* ignoré */ }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function brancherEvenements() {
    ["f-texte", "f-debut", "f-fin"].forEach(function (id) { $(id).addEventListener("input", lireFiltres); });
    ["f-ressource", "f-alertes"].forEach(function (id) { $(id).addEventListener("change", lireFiltres); });
    $("f-reset").addEventListener("click", reinitialiserFiltres);
    $("vide-reset").addEventListener("click", reinitialiserFiltres);

    document.querySelectorAll(".ec-tri").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        const cle = bouton.dataset.tri;
        if (etat.tri.cle === cle) etat.tri.sens = -etat.tri.sens;
        else etat.tri = { cle: cle, sens: 1 };
        rendreTout();
      });
    });

    $("btn-actualiser").addEventListener("click", charger);
    $("btn-theme").addEventListener("click", function () {
      appliquerTheme(document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark");
    });
    $("input-fichier").addEventListener("change", function (evt) {
      const fichier = evt.target.files[0];
      if (!fichier) return;
      Donnees.chargerDepuisFichier(fichier).then(function (d) {
        afficher(d);
        $("pied-source").textContent = "Source : " + fichier.name + " (fichier chargé manuellement)";
      }).catch(echecChargement);
      evt.target.value = ""; // permet de recharger le même fichier
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.setAttribute("data-bs-theme", themeInitial());
    $("icone-theme").className = "bi " + (themeInitial() === "dark" ? "bi-sun" : "bi-moon-stars");
    brancherEvenements();
    charger();
  });
})();
