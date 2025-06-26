import { AppState } from './state.js';

document.getElementById("loginButton").addEventListener("click", function () {
    console.log("connexion via ORCID");
    const redirectUrl = "https://dev.ptm.huma-num.fr/cartoquete";  // ou une URL spécifique dans l'app si besoin
    window.location.href = `https://api.ptm.huma-num.fr/auth/login?redirect_url=${encodeURIComponent(redirectUrl)}`;
});

// Vérification de la présence du token dans l'URL 
//document.addEventListener("DOMContentLoaded", function () {
//    const hash = window.location.hash;
//    if (hash.startsWith("#token=")) {
//        const token = hash.slice(7);
//        localStorage.setItem("ptm_token", token);
//        window.history.replaceState(null, null, window.location.pathname);
//        console.log("JWT reçu et stocké !");
//    }
//});

// 1. Extrait le token s'il est dans l'URL
function getTokenFromHash() {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
    const token = hash.slice(7);
    localStorage.setItem("ptm_token", token);
    window.history.replaceState(null, null, window.location.pathname); // Nettoyage
    }
}

// 2. Vérifie le token auprès de /auth/verify
function verifyToken(token) {
    return fetch("https://api.ptm.huma-num.fr/auth/verify", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: token })
    }).then(res => res.json());
}

// 3. Initialise l’état connecté ou pas
async function initAuthUI() {
    getTokenFromHash();
    const token = localStorage.getItem("ptm_token");

    if (!token) return;

    try {
    const result = await verifyToken(token);
        if (result.valid) {
            // Authentifié : affichage du menu utilisateur
            console.log(result);
            document.getElementById("loginButton").style.display = "none";
            document.getElementById("userMenu").style.display = "block";
            document.getElementById("userName").textContent = '';
            document.getElementById("userId").textContent = result.user.name || result.user.sub;

            // Chargement des données utilisateur
            await loadUserData();

        } else {
            console.warn("Token invalide :", result.error);
            localStorage.removeItem("ptm_token");
        }
    } catch (err) {
        console.error("Erreur de vérification :", err);
    }
}

// 4. Déconnexion
document.getElementById("logoutButton").addEventListener("click", function () {
    localStorage.removeItem("ptm_token");
    location.reload(); // Ou tu peux rediriger vers une page d’accueil
});

// 5. Bouton login : redirection ORCID
document.getElementById("loginButton").addEventListener("click", function () {
    const redirectUrl = "https://dev.ptm.huma-num.fr/cartoquete";  // à adapter si besoin
    window.location.href = `https://api.ptm.huma-num.fr/auth/login?redirect_url=${encodeURIComponent(redirectUrl)}`;
});

// 6. Lancement initial
initAuthUI();

async function loadUserData() {
    const token = localStorage.getItem("ptm_token");
    console.log("Chargement des données utilisateur avec token :", token);
    if (!token) return;

    const res = await fetch("https://api.ptm.huma-num.fr/auth/data", {
        headers: {
        "Authorization": `Bearer ${token}`
        }
    });
    const fullData = await res.json();
    const favoris = fullData?.cartoquete?.favoris || [];

    console.log("Favoris chargés :", favoris);

    for (const fav of favoris) {
        if (fav.ark && fav.source) {
            AppState.externe_favoris.add(fav.ark);
            AppState.externe_favoriteRecords.set(fav.ark, { source: fav.source });
        }
    }

}