/**
 * Assistant Watti - EcoCampus
 * Les questions factuelles sont traitées par questionLocal.js.
 * Groq traite les demandes d'analyse, de conseil et les formulations inconnues.
 */

document.addEventListener('DOMContentLoaded', () => {

    const openBtn = document.getElementById('open-watti-btn');
    const closeBtn = document.getElementById('close-watti-btn');
    const chatContainer = document.getElementById('watti-chat-container');
    const sendBtn = document.getElementById('watti-send-btn');
    const inputField = document.getElementById('watti-input');
    const messagesContainer = document.getElementById('watti-messages');

    // Ouvrir et fermer le chatbot
    if (openBtn && chatContainer) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatContainer.classList.toggle('watti-hidden');

            if (!chatContainer.classList.contains('watti-hidden')) {
                inputField?.focus();
            }
        });
    }

    closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        chatContainer?.classList.add('watti-hidden');
    });

    if (sendBtn && inputField) {
        sendBtn.addEventListener('click', handleUserMessage);

        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserMessage();
            }
        });
    }

    // Traitement du message utilisateur
    async function handleUserMessage() {
        const text = inputField?.value.trim();

        if (!text) return;

        appendMessage(text, 'user');
        inputField.value = '';
        sendBtn.disabled = true;

        const loadingId = appendLoadingIndicator();

        try {
            const ecoData = window.ecoData || window.donneesCampus;

            if (!ecoData || !Array.isArray(ecoData.statistiques)) {
                appendMessage(
                    "⚠️ Les données du campus (data.json) ne sont pas encore chargées ou leur format est incorrect.",
                    'bot'
                );
                return;
            }

            // Vérifier le chargement du module local
            if (
                !window.WattiLocal ||
                typeof window.WattiLocal.detecterQuestionLocale !== 'function' ||
                typeof window.WattiLocal.repondre !== 'function' ||
                typeof window.WattiLocal.obtenirCatalogue !== 'function'
            ) {
                appendMessage(
                    "⚠️ Le module questionLocal.js n'est pas chargé correctement. Vérifie son chemin et l'ordre des scripts dans index.html.",
                    'bot'
                );
                return;
            }

            // ÉTAPE 1 : détection locale
            const correspondance =
                window.WattiLocal.detecterQuestionLocale(text);

            if (correspondance) {
                const reponseLocale = window.WattiLocal.repondre(
                    correspondance.intent,
                    correspondance.params || {},
                    ecoData
                );

                if (reponseLocale) {
                    appendMessage(reponseLocale, 'bot');
                    return;
                }
            }

            // ÉTAPE 2 : classification par Groq
            const resultatGroq = await queryGroqAPI(text, ecoData);

            if (!resultatGroq || !resultatGroq.type) {
                appendMessage(
                    "Je n'ai pas réussi à comprendre ta demande. Peux-tu la reformuler ?",
                    'bot'
                );
                return;
            }

            // Question factuelle : calcul local avec data.json
            if (resultatGroq.type === 'LOCAL') {
                const reponseLocale = window.WattiLocal.repondre(
                    resultatGroq.intent,
                    resultatGroq.params || {},
                    ecoData
                );

                appendMessage(
                    reponseLocale ||
                    "Je n'ai pas trouvé les données nécessaires pour répondre à cette question.",
                    'bot'
                );
                return;
            }

            // Question d'analyse ou de recommandation
            if (resultatGroq.type === 'AI') {
                appendMessage(
                    resultatGroq.answer || "Je n'ai pas pu préparer une réponse.",
                    'bot'
                );
                return;
            }

            // Question ambiguë
            if (resultatGroq.type === 'CLARIFY') {
                appendMessage(
                    resultatGroq.answer ||
                    "Peux-tu préciser le bâtiment ou la ressource concernée ?",
                    'bot'
                );
                return;
            }

            // Question hors du domaine EcoCampus
            if (resultatGroq.type === 'OUT_OF_SCOPE') {
                appendMessage(
                    resultatGroq.answer ||
                    "Je suis Watti, l'assistant dédié au suivi énergétique d'EcoCampus. Je peux t'aider sur les bâtiments, l'électricité, l'eau, le chauffage, les mesures et les alertes.",
                    'bot'
                );
                return;
            }

            appendMessage(
                "Je n'ai pas réussi à interpréter la réponse reçue. Essaie de reformuler ta question.",
                'bot'
            );

        } catch (error) {
            console.error("Erreur Watti :", error);
            appendMessage(
                "⚠️ Une erreur est survenue pendant le traitement. Vérifie la connexion, la configuration de Groq et la console du navigateur.",
                'bot'
            );
        } finally {
            removeLoadingIndicator(loadingId);

            if (sendBtn) sendBtn.disabled = false;
            inputField?.focus();
        }
    }

    // Nettoyer une réponse JSON
    function nettoyerJSON(contenu) {
        return String(contenu || '')
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
    }

    // Communication avec Groq
    async function queryGroqAPI(promptUtilisateur, ecoData) {

        if (
            typeof GROQ_CONFIG === 'undefined' ||
            !GROQ_CONFIG.API_KEY ||
            !GROQ_CONFIG.MODEL ||
            !GROQ_CONFIG.API_URL
        ) {
            throw new Error(
                "Configuration Groq absente ou incomplète. Vérifie groqConfig.js."
            );
        }

        const catalogue = window.WattiLocal.obtenirCatalogue().map(item => ({
            id: item.id,
            description: item.description,
            exemples: item.exemples,
            parametres: item.parametres || []
        }));

        const systemPrompt = `
Tu es Watti, l'assistant du projet EcoCampus.

Tu réponds uniquement aux questions concernant les consommations
d'électricité, d'eau et de chauffage, les bâtiments, les mesures
et les alertes du campus.

Tu dois comprendre les questions même si elles contiennent
des fautes de frappe, des fautes d'orthographe ou une formulation familière.

CATALOGUE DES INTENTIONS TRAITABLES LOCALEMENT :
${JSON.stringify(catalogue)}

RÈGLES DE CLASSIFICATION :

1. Si la question demande une information factuelle présente
dans le catalogue, retourne le type LOCAL avec un identifiant exact.

Exemple :
{"type":"LOCAL","intent":"ID_EXACT_DU_CATALOGUE","params":{"building":"Bibliothèque","resource":"electricite"}}

Les paramètres building et resource ne sont nécessaires
que lorsque l'intention les demande.

Bâtiments possibles :
Bibliothèque, Laboratoire Info, Résidence,
Administration, Salles de cours.

Ressources possibles :
electricite, eau, chauffage.

2. Si la question demande une explication, une interprétation,
une comparaison raisonnée, une analyse ou une recommandation,
retourne :

{"type":"AI","answer":"Réponse en français simple et professionnel."}

3. Si la question est trop ambiguë, retourne :

{"type":"CLARIFY","answer":"Une seule question courte pour demander une précision."}

4. Si la question ne concerne pas EcoCampus, retourne :

{"type":"OUT_OF_SCOPE","answer":"Je suis Watti, l'assistant dédié au suivi énergétique d'EcoCampus."}

RÈGLES IMPORTANTES :
- Réponds uniquement avec un objet JSON valide.
- Pour LOCAL, utilise exactement un identifiant du catalogue.
- Ne crée jamais un identifiant d'intention.
- Pour AI, utilise uniquement les données fournies.
- N'invente jamais de chiffres, de mesures, d'alertes ou de seuils.
- Si les données ne permettent pas de répondre, indique cette limite.
- Ne classe pas une question factuelle comme AI si elle correspond au catalogue.
`;

        const modeles = [
            GROQ_CONFIG.MODEL,
            GROQ_CONFIG.FALLBACK_MODEL
        ].filter(Boolean);

        let derniereErreur;

        for (const model of [...new Set(modeles)]) {
            try {
                console.log("Watti - modèle utilisé :", model);

                const response = await fetch(GROQ_CONFIG.API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_CONFIG.API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: systemPrompt
                            },
                            {
                                role: 'user',
                                content:
                                    `Données actuelles du campus :\n${JSON.stringify(ecoData)}\n\n` +
                                    `Question de l'utilisateur : ${promptUtilisateur}`
                            }
                        ],
                        temperature: 0.1,
                        max_completion_tokens: 1200
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error?.message ||
                        `Erreur API Groq (${response.status})`
                    );
                }

                const contenu = data.choices?.[0]?.message?.content;

                if (typeof contenu !== 'string' || !contenu.trim()) {
                    throw new Error("Groq n'a retourné aucun contenu.");
                }

                const resultat = JSON.parse(nettoyerJSON(contenu));

                if (
                    !resultat ||
                    !['LOCAL', 'AI', 'CLARIFY', 'OUT_OF_SCOPE']
                        .includes(resultat.type)
                ) {
                    throw new Error("Format de réponse Groq invalide.");
                }

                console.log(
                    "Watti - classification Groq :",
                    resultat.type
                );

                return resultat;

            } catch (error) {
                derniereErreur = error;
                console.error(
                    `Watti - échec avec le modèle ${model} :`,
                    error
                );
            }
        }

        throw derniereErreur ||
            new Error("Impossible de contacter Groq.");
    }

    // Afficher les messages
    
function appendMessage(text, sender) {
    const messages = document.getElementById("watti-messages");
    const msgDiv = document.createElement("div");

    msgDiv.className = `watti-msg ${sender}`;
    messages.appendChild(msgDiv);

    // Échapper le HTML et conserver le formatage actuel
    function formaterTexte(texte) {
        return texte
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
    }

    // Les messages de l'utilisateur apparaissent immédiatement
    if (sender !== "bot") {
        msgDiv.innerHTML = formaterTexte(text);
        messages.scrollTop = messages.scrollHeight;
        return;
    }

    // Effet de frappe pour les réponses de Watti
    msgDiv.classList.add("typing");

    let index = 0;
    const vitesse = 18;

    function ecrire() {
        index++;

        msgDiv.innerHTML = formaterTexte(text.substring(0, index));

        messages.scrollTop = messages.scrollHeight;

        if (index < text.length) {
            setTimeout(ecrire, vitesse);
        } else {
            msgDiv.classList.remove("typing");
        }
    }

    ecrire();
}


    // Indicateur de chargement
    function appendLoadingIndicator() {
        if (!messagesContainer) return null;

        const loadingId = 'loading-' + Date.now();
        const loadDiv = document.createElement('div');

        loadDiv.classList.add('watti-msg', 'bot', 'loading');
        loadDiv.id = loadingId;
        loadDiv.textContent = 'Watti réfléchit...';

        messagesContainer.appendChild(loadDiv);
        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        return loadingId;
    }

    function removeLoadingIndicator(id) {
        if (!id) return;
        document.getElementById(id)?.remove();
    }

});