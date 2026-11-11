/*
 * graphique.js : histogramme Chart.js du niveau de consommation par bâtiment.
 * Les ressources n'ont pas la même unité (kWh, m3) : on compare donc chaque
 * mesure à son seuil, en pourcentage. La ligne à 100 % matérialise le seuil.
 * Une barre = la moyenne des mesures d'un bâtiment pour une ressource.
 * Si au moins une de ces mesures est en alerte, la barre reçoit un contour
 * rouge et l'infobulle indique le nombre d'alertes et la pire mesure.
 */
(function (global) {
  "use strict";

  const EcoCampus = (global.EcoCampus = global.EcoCampus || {});
  let instance = null;

  function detruire() {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  }

  /** Regroupe les mesures : bâtiment -> ressource -> {taux, valeur, n, nbAlertes, pire}. */
  function agreger(mesures) {
    const parBatiment = new Map();
    mesures.forEach(function (m) {
      if (!parBatiment.has(m.batiment)) parBatiment.set(m.batiment, new Map());
      const parRessource = parBatiment.get(m.batiment);
      const g = parRessource.get(m.ressource) ||
        { taux: 0, valeur: 0, n: 0, nbAlertes: 0, pire: 0, unite: m.unite };
      g.taux += m.taux;
      g.valeur += m.valeur;
      g.n += 1;
      if (m.alerte) g.nbAlertes += 1;
      if (m.taux > g.pire) g.pire = m.taux;
      parRessource.set(m.ressource, g);
    });
    return parBatiment;
  }

  /**
   * Dessine (ou redessine) le graphique. Retourne false s'il n'y a rien à afficher.
   */
  function dessiner(canvas, mesures) {
    detruire();
    if (mesures.length === 0 || typeof Chart === "undefined") return false;

    const RESSOURCES = EcoCampus.Donnees.RESSOURCES;
    const style = getComputedStyle(document.documentElement);
    const encre = style.getPropertyValue("--ec-secondaire").trim() || "#56675f";
    const grille = style.getPropertyValue("--ec-bord").trim() || "#d3dcd7";
    const alerte = style.getPropertyValue("--ec-alerte").trim() || "#c23b32";

    const donnees = agreger(mesures);
    const batiments = Array.from(donnees.keys()).sort(function (a, b) { return a.localeCompare(b, "fr"); });
    const ressources = Object.keys(RESSOURCES).filter(function (r) {
      return mesures.some(function (m) { return m.ressource === r; });
    });

    const jeux = ressources.map(function (r) {
      const details = batiments.map(function (b) {
        const g = donnees.get(b).get(r);
        return g ? {
          taux: g.taux / g.n, moyenne: g.valeur / g.n, unite: g.unite,
          n: g.n, nbAlertes: g.nbAlertes, pire: g.pire
        } : null;
      });
      const enAlerte = function (ctx) {
        const d = details[ctx.dataIndex];
        return !!d && d.nbAlertes > 0;
      };
      return {
        type: "bar",
        label: RESSOURCES[r].libelle,
        data: details.map(function (d) { return d ? Math.round(d.taux * 10) / 10 : null; }),
        details: details,
        backgroundColor: RESSOURCES[r].couleur,
        borderColor: function (ctx) { return enAlerte(ctx) ? alerte : "transparent"; },
        borderWidth: function (ctx) { return enAlerte(ctx) ? 3 : 0; },
        borderRadius: 3,
        order: 2
      };
    });

    jeux.push({
      type: "line",
      label: "Seuil (100 %)",
      data: batiments.map(function () { return 100; }),
      borderColor: alerte,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      order: 1
    });

    Chart.defaults.font.family = '"Manrope", system-ui, sans-serif';
    instance = new Chart(canvas, {
      data: { labels: batiments, datasets: jeux },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { color: encre }, grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { color: encre, callback: function (v) { return v + " %"; } },
            grid: { color: grille }
          }
        },
        plugins: {
          legend: { position: "bottom", labels: { color: encre, usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const d = ctx.dataset.details && ctx.dataset.details[ctx.dataIndex];
                if (!d) return ctx.dataset.label + " : " + ctx.parsed.y + " %";
                const lignes = [
                  ctx.dataset.label + " : " + Math.round(d.taux) + " % du seuil en moyenne (moy. " +
                    d.moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " " + d.unite + ")",
                  d.n + (d.n > 1 ? " mesures" : " mesure") + ", dont " + d.nbAlertes +
                    (d.nbAlertes > 1 ? " en alerte" : " en alerte")
                ];
                if (d.nbAlertes > 0) lignes.push("pire mesure : " + Math.round(d.pire) + " % du seuil");
                return lignes;
              }
            }
          }
        }
      }
    });
    return true;
  }

  EcoCampus.Graphique = { dessiner: dessiner, detruire: detruire };
})(window);