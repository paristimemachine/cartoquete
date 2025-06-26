import { AppState } from './state.js';
import { renderResults } from './renderer.js';
import { loadAndDisplayExternalFavorites } from './searchGallica.js';

const favBtn = document.getElementById('filter-favorites');
if (!favBtn) {
  console.warn('#filter-favorites introuvable');
} else {

  favBtn.classList.add('star-top');

  const updateStar = () => {
    favBtn.textContent = AppState.showFavorites ? '★' : '☆';
    favBtn.title = AppState.showFavorites ? 'Voir tous' : 'Voir favoris';
  };
  updateStar();

  favBtn.addEventListener('click', async () => {
    AppState.showFavorites = !AppState.showFavorites;
    favBtn.classList.toggle('active', AppState.showFavorites);
    updateStar();
    
    // Si on affiche les favoris et qu'il y a des favoris externes, les charger
    if (AppState.showFavorites && AppState.externe_favoris.size > 0) {
      await loadAndDisplayExternalFavorites();
    }
    
    renderResults();

  });
}

export async function ajouterFavori(ark, source = "Gallica") {

  console.log("Ajout du favori :", ark, source);

  const token = localStorage.getItem("ptm_token");
  if (!token) return;

  // Tu peux récupérer les données actuelles d'abord :
  const res = await fetch("https://api.ptm.huma-num.fr/auth/data", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const fullData = await res.json();

  const favoris = fullData?.cartoquete?.favoris || [];

  // Ajout du nouveau favori
  favoris.push({ ark, source });

  const payload = {
    ...fullData,
    cartoquete: {
      ...fullData.cartoquete,
      favoris: favoris
    }
  };

  await fetch("https://api.ptm.huma-num.fr/auth/data", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log("Favori ajouté :", ark);
}

export async function supprimerFavori(ark) {
  const token = localStorage.getItem("ptm_token");
  if (!token) return;

  // Récupère les données existantes
  const res = await fetch("https://api.ptm.huma-num.fr/auth/data", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const fullData = await res.json();

  const favoris = fullData?.cartoquete?.favoris || [];

  // Filtrage du favori à supprimer
  const favorisFiltrés = favoris.filter(fav => fav.ark !== ark);

  const payload = {
    ...fullData,
    cartoquete: {
      ...fullData.cartoquete,
      favoris: favorisFiltrés
    }
  };

  // Envoi de la mise à jour au backend
  await fetch("https://api.ptm.huma-num.fr/auth/data", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log(`Favori supprimé : ${ark}`);
}
