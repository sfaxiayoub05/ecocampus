/* Catalogue des questions locales et fonctions de réponse de Watti.
   Les valeurs sont toujours lues depuis data.json : aucun chiffre n'est fixé ici. */

(function () {
    "use strict";

    const BATIMENTS = [
        { nom: "Bibliothèque", aliases: ["bibliotheque", "bibliotheque universitaire"] },
        { nom: "Laboratoire Info", aliases: ["laboratoire info", "laboratoire informatique", "laboratoire", "labo"] },
        { nom: "Résidence", aliases: ["residence", "foyer", "internat"] },
        { nom: "Administration", aliases: ["administration", "admin"] },
        { nom: "Salles de cours", aliases: ["salles de cours", "salle de cours", "salles cours", "cours"] }
    ];

    const RESSOURCES = [
        { nom: "electricite", affichage: "électricité", aliases: ["electricite", "electrique", "electric", "kwh"] },
        { nom: "eau", affichage: "eau", aliases: ["eau", "m3"] },
        { nom: "chauffage", affichage: "chauffage", aliases: ["chauffage", "thermique"] }
    ];

    // Les formulations servent à reconnaître les demandes directes et à guider Groq.
    const QUESTIONS_LOCALES = [
        { id: "TOTAL_ALERTES", description: "Nombre total d'alertes sur le campus.", exemples: ["Combien d'alertes existe-t-il ?", "Quel est le nombre d'alertes ?", "Combien d'alertes sur le campus ?"] },
        { id: "TOTAL_MESURES", description: "Nombre total de mesures enregistrées.", exemples: ["Combien de mesures ont été enregistrées ?", "Quel est le nombre de mesures ?", "Combien de relevés existe-t-il ?"] },
        { id: "LISTE_BATIMENTS", description: "Liste des bâtiments présents dans les statistiques.", exemples: ["Quels sont les bâtiments du campus ?", "Donne-moi la liste des bâtiments."] },
        { id: "STATISTIQUES_CAMPUS", description: "Afficher les statistiques de toutes les ressources et de tous les bâtiments.", exemples: ["Donne-moi les statistiques du campus.", "Affiche toutes les statistiques.", "Résumé des consommations du campus."] },
        { id: "STATISTIQUES_BATIMENT", description: "Afficher toutes les statistiques d'un bâtiment donné.", parametres: ["building"], exemples: ["Donne-moi les statistiques de la bibliothèque.", "Affiche les données de la résidence."] },
        { id: "TOTAL_ALERTES_BATIMENT", description: "Nombre d'alertes d'un bâtiment donné.", parametres: ["building"], exemples: ["Combien d'alertes dans la bibliothèque ?", "La résidence a combien d'alertes ?"] },
        { id: "BATIMENTS_AVEC_ALERTES", description: "Lister les bâtiments qui ont au moins une alerte.", exemples: ["Quels bâtiments ont enregistré des alertes ?", "Quel bâtiment a des alertes ?"] },
        { id: "BATIMENTS_SANS_ALERTES", description: "Lister les bâtiments sans alerte.", exemples: ["Quels bâtiments n'ont aucune alerte ?", "Quels bâtiments sont sans alertes ?"] },
        { id: "RESSOURCES_BATIMENT", description: "Lister les ressources présentes pour un bâtiment.", parametres: ["building"], exemples: ["Quelles ressources consomme la bibliothèque ?", "Quelles ressources sont suivies dans la résidence ?"] },
        { id: "TOTAL_RESSOURCE_BATIMENT", description: "Total d'une ressource pour un bâtiment.", parametres: ["building", "resource"], exemples: ["Combien d'électricité consomme la bibliothèque ?", "Quel est le total d'eau de la résidence ?"] },
        { id: "MOYENNE_RESSOURCE_BATIMENT", description: "Moyenne d'une ressource pour un bâtiment.", parametres: ["building", "resource"], exemples: ["Quelle est la consommation moyenne d'eau de la résidence ?", "Quelle est la moyenne électrique de la bibliothèque ?"] },
        { id: "ALERTES_RESSOURCE_BATIMENT", description: "Nombre d'alertes pour une ressource dans un bâtiment.", parametres: ["building", "resource"], exemples: ["Combien d'alertes d'électricité dans la bibliothèque ?", "La résidence a combien d'alertes de chauffage ?"] },
        { id: "TOTAL_RESSOURCE_CAMPUS", description: "Somme des totaux d'une ressource pour tous les bâtiments.", parametres: ["resource"], exemples: ["Quelle est la consommation totale d'électricité ?", "Combien d'eau consomme le campus ?", "Total du chauffage sur le campus."] },
        { id: "MOYENNE_RESSOURCE_CAMPUS", description: "Moyenne des valeurs moyenne disponibles pour une ressource sur les bâtiments. Préciser qu'il s'agit d'une moyenne des moyennes par bâtiment.", parametres: ["resource"], exemples: ["Quelle est la consommation moyenne d'eau du campus ?", "Quelle est la moyenne électrique générale ?"] },
        { id: "BATIMENT_MAX_RESSOURCE", description: "Bâtiment ayant le total le plus élevé pour une ressource.", parametres: ["resource"], exemples: ["Quel bâtiment consomme le plus d'électricité ?", "Quel bâtiment utilise le plus d'eau ?"] },
        { id: "BATIMENT_MIN_RESSOURCE", description: "Bâtiment ayant le total le plus faible pour une ressource.", parametres: ["resource"], exemples: ["Quel bâtiment consomme le moins d'électricité ?", "Quel bâtiment utilise le moins d'eau ?"] },
        { id: "CLASSEMENT_RESSOURCE", description: "Classer les bâtiments par total décroissant pour une ressource.", parametres: ["resource"], exemples: ["Classe les bâtiments selon leur consommation électrique.", "Donne le classement de consommation d'eau."] },
        { id: "LISTE_BATIMENTS_RESSOURCE", description: "Lister les bâtiments ayant une statistique pour une ressource.", parametres: ["resource"], exemples: ["Quels bâtiments consomment de l'eau ?", "Dans quels bâtiments suit-on le chauffage ?"] },
        { id: "MAX_ALERTES_BATIMENT", description: "Bâtiment qui possède le plus grand nombre d'alertes.", exemples: ["Quel bâtiment a le plus d'alertes ?", "Quel bâtiment est le plus concerné par les alertes ?"] }
    ];

    function normaliserTexte(texte) {
        return String(texte || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, " ")
            .replace(/[^a-z0-9\s.-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function obtenirStats(ecoData) {
        return Array.isArray(ecoData && ecoData.statistiques) ? ecoData.statistiques : [];
    }

    function trouverBatiment(question) {
        const q = normaliserTexte(question);
        return BATIMENTS.find(b => b.aliases.some(a => q.includes(normaliserTexte(a)))) || null;
    }

    function trouverRessource(question) {
        const q = normaliserTexte(question);
        return RESSOURCES.find(r => r.aliases.some(a => q.includes(normaliserTexte(a)))) || null;
    }

    function nomBatimentDansStat(stat) {
        return String(stat && stat.batiment || "").trim();
    }

    function statsDuBatiment(stats, building) {
        const aliases = building.aliases.map(normaliserTexte);
        return stats.filter(s => {
            const nom = normaliserTexte(s.batiment);
            return aliases.some(a => nom.includes(a) || a.includes(nom));
        });
    }

    function statsDeRessource(stats, resource) {
        return stats.filter(s => normaliserTexte(s.ressource).includes(resource.nom));
    }

    function somme(stats, champ) {
        return stats.reduce((total, s) => total + (Number(s[champ]) || 0), 0);
    }

    function formatNombre(n) {
        return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    }

    function formatStat(stat) {
        const unite = stat.unite || "";
        return `• **${stat.ressource}** : Total = ${formatNombre(stat.total)} ${unite}, Moyenne = ${formatNombre(stat.moyenne)} ${unite}, Alertes = ${Number(stat.nb_alertes) || 0}`;
    }

    function totalAlertesBatiment(statsBat) {
        return somme(statsBat, "nb_alertes");
    }

    function repondre(intent, params, ecoData) {
        const stats = obtenirStats(ecoData);
        const meta = ecoData.meta || {};
        const building = params && params.building
            ? BATIMENTS.find(b => b.aliases.includes(normaliserTexte(params.building)) || normaliserTexte(b.nom) === normaliserTexte(params.building))
            : null;
        const resource = params && params.resource
            ? RESSOURCES.find(r => r.nom === normaliserTexte(params.resource) || r.aliases.includes(normaliserTexte(params.resource)))
            : null;

        if (!stats.length) return "Les statistiques du campus ne sont pas disponibles dans les données chargées.";

        switch (intent) {
            case "TOTAL_ALERTES":
                return `Le campus compte **${formatNombre(meta.nb_alertes ?? somme(stats, "nb_alertes"))} alerte(s)** sur un total de **${formatNombre(meta.nb_mesures ?? "non précisé")} mesure(s)**.`;

            case "TOTAL_MESURES":
                return meta.nb_mesures !== undefined
                    ? `Le campus compte **${formatNombre(meta.nb_mesures)} mesure(s)** enregistrée(s).`
                    : "Le nombre total de mesures n'est pas indiqué dans les données.";

            case "LISTE_BATIMENTS": {
                const noms = [...new Set(stats.map(nomBatimentDansStat).filter(Boolean))];
                return noms.length ? `Les bâtiments présents dans les statistiques sont :\n${noms.map(n => `• **${n}**`).join("\n")}` : "Aucun bâtiment n'est indiqué dans les statistiques.";
            }

            case "STATISTIQUES_CAMPUS":
                return `Voici les statistiques disponibles sur le campus :\n${stats.map(s => `**${s.batiment}**\n${formatStat(s)}`).join("\n")}`;

            case "STATISTIQUES_BATIMENT": {
                if (!building) return "Je n'ai pas identifié le bâtiment. Peux-tu préciser son nom ?";
                const rows = statsDuBatiment(stats, building);
                return rows.length
                    ? `Voici les statistiques du bâtiment **${building.nom}** :\n${rows.map(formatStat).join("\n")}`
                    : `Je ne trouve pas de statistiques pour **${building.nom}**.`;
            }

            case "TOTAL_ALERTES_BATIMENT": {
                if (!building) return "Je n'ai pas identifié le bâtiment. Peux-tu préciser son nom ?";
                const rows = statsDuBatiment(stats, building);
                return rows.length ? `Le bâtiment **${building.nom}** a enregistré **${formatNombre(totalAlertesBatiment(rows))} alerte(s)**.` : `Aucune statistique n'est disponible pour **${building.nom}**.`;
            }

            case "BATIMENTS_AVEC_ALERTES":
            case "BATIMENTS_SANS_ALERTES": {
                const grouped = [...new Set(stats.map(nomBatimentDansStat).filter(Boolean))].map(nom => ({
                    nom,
                    alertes: totalAlertesBatiment(stats.filter(s => normaliserTexte(s.batiment) === normaliserTexte(nom)))
                }));
                const selection = grouped.filter(b => intent === "BATIMENTS_AVEC_ALERTES" ? b.alertes > 0 : b.alertes === 0);
                return selection.length
                    ? `${intent === "BATIMENTS_AVEC_ALERTES" ? "Les bâtiments ayant enregistré des alertes" : "Les bâtiments sans alerte"} sont :\n${selection.map(b => `• **${b.nom}** (${b.alertes} alerte(s))`).join("\n")}`
                    : (intent === "BATIMENTS_AVEC_ALERTES" ? "Aucun bâtiment n'a enregistré d'alerte." : "Tous les bâtiments ont enregistré au moins une alerte.");
            }

            case "RESSOURCES_BATIMENT": {
                if (!building) return "Je n'ai pas identifié le bâtiment. Peux-tu préciser son nom ?";
                const rows = statsDuBatiment(stats, building);
                const noms = [...new Set(rows.map(s => s.ressource).filter(Boolean))];
                return noms.length ? `Les ressources suivies pour **${building.nom}** sont : ${noms.map(n => `**${n}**`).join(", ")}.` : `Aucune ressource n'est indiquée pour **${building.nom}**.`;
            }

            case "TOTAL_RESSOURCE_BATIMENT":
            case "MOYENNE_RESSOURCE_BATIMENT":
            case "ALERTES_RESSOURCE_BATIMENT": {
                if (!building || !resource) return "Je n'ai pas identifié le bâtiment ou la ressource. Peux-tu préciser ta question ?";
                const rows = statsDeRessource(statsDuBatiment(stats, building), resource);
                if (!rows.length) return `Aucune donnée sur ${resource.affichage} n'est disponible pour **${building.nom}**.`;
                const row = rows[0];
                if (intent === "TOTAL_RESSOURCE_BATIMENT") return `La consommation totale de ${resource.affichage} de **${building.nom}** est de **${formatNombre(row.total)} ${row.unite || ""}**.`;
                if (intent === "MOYENNE_RESSOURCE_BATIMENT") return `La consommation moyenne de ${resource.affichage} de **${building.nom}** est de **${formatNombre(row.moyenne)} ${row.unite || ""}**.`;
                return `Le nombre d'alertes de ${resource.affichage} pour **${building.nom}** est de **${formatNombre(row.nb_alertes)}**.`;
            }

            case "TOTAL_RESSOURCE_CAMPUS":
            case "MOYENNE_RESSOURCE_CAMPUS":
            case "BATIMENT_MAX_RESSOURCE":
            case "BATIMENT_MIN_RESSOURCE":
            case "CLASSEMENT_RESSOURCE":
            case "LISTE_BATIMENTS_RESSOURCE": {
                if (!resource) return "Je n'ai pas identifié la ressource. Parles-tu d'électricité, d'eau ou de chauffage ?";
                const rows = statsDeRessource(stats, resource);
                if (!rows.length) return `Aucune donnée sur ${resource.affichage} n'est disponible.`;
                const unite = rows[0].unite || "";

                if (intent === "TOTAL_RESSOURCE_CAMPUS") {
                    return `La consommation totale de ${resource.affichage} sur le campus est de **${formatNombre(somme(rows, "total"))} ${unite}**.`;
                }
                if (intent === "MOYENNE_RESSOURCE_CAMPUS") {
                    const moyenne = somme(rows, "moyenne") / rows.length;
                    return `La moyenne des moyennes par bâtiment pour ${resource.affichage} est de **${formatNombre(moyenne)} ${unite}** (calculée sur ${rows.length} bâtiment(s)).`;
                }
                if (intent === "LISTE_BATIMENTS_RESSOURCE") {
                    const noms = [...new Set(rows.map(nomBatimentDansStat).filter(Boolean))];
                    return `Les bâtiments ayant des données pour ${resource.affichage} sont : ${noms.map(n => `**${n}**`).join(", ")}.`;
                }

                const classement = [...rows].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
                if (intent === "BATIMENT_MAX_RESSOURCE") {
                    const top = classement[0];
                    return `Le bâtiment qui consomme le plus de ${resource.affichage} est **${top.batiment}**, avec **${formatNombre(top.total)} ${unite}**.`;
                }
                if (intent === "BATIMENT_MIN_RESSOURCE") {
                    const last = classement[classement.length - 1];
                    return `Le bâtiment qui consomme le moins de ${resource.affichage} est **${last.batiment}**, avec **${formatNombre(last.total)} ${unite}**.`;
                }
                return `Classement des bâtiments selon leur consommation de ${resource.affichage} :\n${classement.map((s, i) => `${i + 1}. **${s.batiment}** : ${formatNombre(s.total)} ${unite}`).join("\n")}`;
            }

            case "MAX_ALERTES_BATIMENT": {
                const grouped = [...new Set(stats.map(nomBatimentDansStat).filter(Boolean))].map(nom => ({
                    nom,
                    alertes: totalAlertesBatiment(stats.filter(s => normaliserTexte(s.batiment) === normaliserTexte(nom)))
                })).sort((a, b) => b.alertes - a.alertes);
                if (!grouped.length) return "Aucune donnée sur les alertes n'est disponible.";
                return `Le bâtiment ayant le plus d'alertes est **${grouped[0].nom}**, avec **${grouped[0].alertes} alerte(s)**.`;
            }

            default:
                return null;
        }
    }

    function detecterQuestionLocale(question) {
        const q = normaliserTexte(question);
        const building = trouverBatiment(q);
        const resource = trouverRessource(q);
        const has = (...mots) => mots.some(m => q.includes(m));

        // Les demandes d'explication, de cause ou de conseil doivent être
        // traitées par Groq, et non par une simple réponse statistique.
        const demandeAnalyse = has(
            "pourquoi", "pour quelle raison", "explique", "expliquer",
            "comment", "quelle est la cause", "quelles sont les causes",
            "cause", "causes", "solution", "solutions", "conseil",
            "conseils", "recommandation", "recommandations", "astuce",
            "astuces", "propose", "proposer", "suggere", "suggerer",
            "ameliorer", "reduire", "diminuer", "economiser",

            // Questions sur les risques et les conséquences
            "risque", "risques", "danger", "dangers",
            "impact", "impacts", "consequence", "consequences",
            "effet", "effets", "excessif", "excessive",
            "excessifs", "excessives"
        );

        if (demandeAnalyse) return null;

        // Questions générales sur les alertes et les mesures du campus.
        if (has("combien", "nombre") && has("alerte", "alertes") && !building) {
            return { intent: "TOTAL_ALERTES", params: {} };
        }
        if (has("combien", "nombre") && has("mesure", "mesures", "releve", "releves")) {
            return { intent: "TOTAL_MESURES", params: {} };
        }

        // Questions sur les bâtiments ayant ou n'ayant pas d'alertes.
        if (has("aucune alerte", "aucune alertes", "sans alerte", "sans alertes", "pas d alerte", "pas alerte")) {
            return { intent: "BATIMENTS_SANS_ALERTES", params: {} };
        }
        if (has("quel batiment", "quels batiments", "batiments") &&
            has("plus d alerte", "plus alerte", "le plus alerte", "maximum d alertes")) {
            return { intent: "MAX_ALERTES_BATIMENT", params: {} };
        }
        if (has("quel batiment", "quels batiments", "batiments qui", "batiments ayant") &&
            has("alerte", "alertes")) {
            return { intent: "BATIMENTS_AVEC_ALERTES", params: {} };
        }

        // Questions concernant un bâtiment précis.
        if (building && has("statistique", "statistiques", "donnees", "donnee")) {
            return { intent: "STATISTIQUES_BATIMENT", params: { building: building.aliases[0] } };
        }

        if (building && has("alerte", "alertes")) {
            if (resource) {
                return {
                    intent: "ALERTES_RESSOURCE_BATIMENT",
                    params: { building: building.aliases[0], resource: resource.nom }
                };
            }
            if (has("combien", "nombre", "total", "nombre d")) {
                return { intent: "TOTAL_ALERTES_BATIMENT", params: { building: building.aliases[0] } };
            }
        }

        if (building && has("ressource", "ressources")) {
            return { intent: "RESSOURCES_BATIMENT", params: { building: building.aliases[0] } };
        }

        if (resource && building) {
            if (has("moyenne", "moyen")) {
                return {
                    intent: "MOYENNE_RESSOURCE_BATIMENT",
                    params: { building: building.aliases[0], resource: resource.nom }
                };
            }
            if (has("alerte", "alertes")) {
                return {
                    intent: "ALERTES_RESSOURCE_BATIMENT",
                    params: { building: building.aliases[0], resource: resource.nom }
                };
            }
            if (has("consommation", "consomme", "consommer", "total", "combien", "quantite")) {
                return {
                    intent: "TOTAL_RESSOURCE_BATIMENT",
                    params: { building: building.aliases[0], resource: resource.nom }
                };
            }
        }

        // Questions concernant une ressource à l'échelle du campus.
        if (resource && !building) {
            if (has("classement", "classe", "classer", "ordre")) {
                return { intent: "CLASSEMENT_RESSOURCE", params: { resource: resource.nom } };
            }
            if (has("plus", "maximum", "max") && has("batiment", "consomme", "consommateur")) {
                return { intent: "BATIMENT_MAX_RESSOURCE", params: { resource: resource.nom } };
            }
            if (has("moins", "minimum", "min") && has("batiment", "consomme", "consommateur")) {
                return { intent: "BATIMENT_MIN_RESSOURCE", params: { resource: resource.nom } };
            }
            if (has("quels batiments", "quels sont les batiments", "dans quels batiments")) {
                return { intent: "LISTE_BATIMENTS_RESSOURCE", params: { resource: resource.nom } };
            }
            if (has("moyenne", "moyen")) {
                return { intent: "MOYENNE_RESSOURCE_CAMPUS", params: { resource: resource.nom } };
            }
            if (has("consommation", "consomme", "consommer", "total", "combien", "quantite")) {
                return { intent: "TOTAL_RESSOURCE_CAMPUS", params: { resource: resource.nom } };
            }
        }

        // Questions générales sur les bâtiments et les statistiques.
        if (has("liste des batiments", "quels sont les batiments", "quels batiments", "les batiments du campus")) {
            return { intent: "LISTE_BATIMENTS", params: {} };
        }
        if (has("statistique", "statistiques", "consommation du campus", "consommations du campus")) {
            return { intent: "STATISTIQUES_CAMPUS", params: {} };
        }

        // Une formulation non reconnue sera analysée par Groq.
        return null;
    }

    window.WattiLocal = {
        QUESTIONS_LOCALES,
        normaliserTexte,
        detecterQuestionLocale,
        repondre,
        obtenirCatalogue: () => QUESTIONS_LOCALES
    };
})();