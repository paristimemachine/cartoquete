import { AppState } from './state.js';
import { getRecordKey } from './utils.js';
import { renderResults } from './renderer.js';
import { ajouterFavori, supprimerFavori } from './favorites.js';

let _searchTerm = '';
let _nextRecordPosition = 1;
let _loading = false;

/**
 * Génère l'URL d'une vignette via IIIF v3
 */
function getGallicaThumbnailUrl(identifier) {
  return `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${identifier}/f1/full/500,/0/default.jpg`;
}

/**
 * Génère l'URL haute résolution via IIIF v3
 */
function getGallicaHighresUrl(identifier) {
  return `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${identifier}/f1/full/max/0/default.webp`;
}

/**
 * Génère l'URL de l'API de présentation IIIF v3
 */
function getGallicaInfoUrl(identifier) {
  return `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${identifier}/f1/info.json`;
}

/**
 * Parcourt un JSON pour extraire toutes les valeurs de la clé spécifiée
 */
function findAll(obj, key, res = []) {
  if (Array.isArray(obj)) {
    obj.forEach(o => findAll(o, key, res));
  } else if (obj && typeof obj === 'object') {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      res.push(obj[key]);
    }
    Object.values(obj).forEach(v => findAll(v, key, res));
  }
  return res;
}

/**
 * Affiche une modale pour la vue haute résolution
 */
function showModal({ title, highres, uri, key, record }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'modal-close';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.padding = '8px 12px';
  closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  closeBtn.style.color = 'white';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', () => document.body.removeChild(backdrop));
  modal.appendChild(closeBtn);

  // étoile favoris
  const modalStar = document.createElement('span');
  modalStar.className = 'modal-star';
  modalStar.textContent = AppState.favoris.has(key) ? '★' : '☆';
  modalStar.addEventListener('click', e => {
    e.stopPropagation();
    if (AppState.favoris.has(key)) {
      AppState.favoris.delete(key);
      AppState.favoriteRecords.delete(key);
      supprimerFavori(key);
      console.log('Suppression favori Gallica:', key);
    } else {
      AppState.favoris.add(key);
      AppState.favoriteRecords.set(key, { source: 'Gallica', record });
      console.log('Ajout favori Gallica:', key);
      ajouterFavori(key, 'Gallica');
    }
    modalStar.textContent = AppState.favoris.has(key) ? '★' : '☆';
  });
  modal.appendChild(modalStar);

  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'modal-image-wrapper';

  const img = document.createElement('img');
  // Utiliser l'URL IIIF v3 haute résolution pour l'affichage dans la modale
  const displayUrl = uri ? getGallicaHighresUrl(uri) : (highres || getGallicaHighresUrl(uri));
  img.src = displayUrl;
  img.alt = title;
  imgWrapper.appendChild(img);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'modal-buttons';

  // Bouton Notice Gallica
  const noticeBtn = document.createElement('a');
  noticeBtn.className = 'modal-notice-btn';
  noticeBtn.href = `https://gallica.bnf.fr/ark:/12148/${uri}`;
  noticeBtn.target = '_blank';
  noticeBtn.textContent = 'Notice';
  btnContainer.appendChild(noticeBtn);

  // Bouton Télécharger avec menu déroulant
  const dlContainer = document.createElement('div');
  dlContainer.className = 'modal-download-container';
  dlContainer.style.position = 'relative';
  dlContainer.style.display = 'inline-block';

  const dlBtn = document.createElement('button');
  dlBtn.textContent = 'Télécharger ▼';
  dlBtn.className = 'modal-download-btn';
  dlBtn.style.cursor = 'pointer';

  // Menu déroulant
  const dlMenu = document.createElement('div');
  dlMenu.className = 'modal-download-menu';
  dlMenu.style.display = 'none';
  dlMenu.style.position = 'absolute';
  dlMenu.style.background = '#fff';
  dlMenu.style.border = '1px solid #ccc';
  dlMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  dlMenu.style.zIndex = '10';
  dlMenu.style.minWidth = '160px';

  // Option Haute Résolution
  const dlHighres = document.createElement('a');
  // URL haute résolution pour téléchargement via IIIF v3
  const highresDownloadUrl = uri ? getGallicaHighresUrl(uri) : highres;
  dlHighres.href = highresDownloadUrl;
  dlHighres.download = title;
  dlHighres.target = '_blank';
  dlHighres.textContent = 'Haute résolution';
  dlHighres.style.display = 'block';
  dlHighres.style.padding = '8px 16px';
  dlHighres.style.textDecoration = 'none';
  dlHighres.style.color = '#333';
  dlHighres.addEventListener('mouseover', () => dlHighres.style.background = '#f0f0f0');
  dlHighres.addEventListener('mouseout', () => dlHighres.style.background = '');

  // Option Full HD via IIIF v3
  let fullHdUrl = '#';
  if (uri) {
    // Construire l'URL IIIF v3 Full HD (résolution maximale sans conversion webp)
    fullHdUrl = `https://openapi.bnf.fr/iiif/image/v3/ark:/12148/${uri}/f1/full/max/0/default.jpg`;
  }
  const dlFullhd = document.createElement('a');
  dlFullhd.href = fullHdUrl;
  dlFullhd.download = title + '_fullhd';
  dlFullhd.target = '_blank';
  dlFullhd.textContent = 'Full HD';
  dlFullhd.style.display = 'block';
  dlFullhd.style.padding = '8px 16px';
  dlFullhd.style.textDecoration = 'none';
  dlFullhd.style.color = '#333';
  dlFullhd.addEventListener('mouseover', () => dlFullhd.style.background = '#f0f0f0');
  dlFullhd.addEventListener('mouseout', () => dlFullhd.style.background = '');

  dlMenu.appendChild(dlHighres);
  dlMenu.appendChild(dlFullhd);

  dlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dlMenu.style.display = dlMenu.style.display === 'none' ? 'block' : 'none';
  });

  // Fermer le menu si clic ailleurs
  document.addEventListener('click', () => {
    dlMenu.style.display = 'none';
  });

  dlContainer.appendChild(dlBtn);
  dlContainer.appendChild(dlMenu);
  btnContainer.appendChild(dlContainer);

  if (uri) {
    const geo = document.createElement('a');
    geo.href = `https://app.ptm.huma-num.fr/galligeo/ggo.html?ark=${encodeURIComponent(uri)}`;
    geo.target = '_blank';
    geo.textContent = 'Géoréférencer';
    btnContainer.appendChild(geo);
  }

  imgWrapper.appendChild(btnContainer);
  modal.appendChild(imgWrapper);

  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  modal.appendChild(titleEl);



  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

/**
 * Crée et insère une carte pour un enregistrement Gallica
 */
export function createCardFromRecord(record, container) {
  // Normaliser extraRecordData (tableau ou objet)
  const rawExtra = record['srw:extraRecordData'];
  const extra = Array.isArray(rawExtra) ? rawExtra[0] : (rawExtra || {});
  // Utiliser la nouvelle API IIIF v3 pour les vignettes
  const uri = extra.uri;
  const thumb = uri ? getGallicaThumbnailUrl(uri) : (extra.lowres || extra.highres || 'img/placeholder.svg');
  const key = getRecordKey('Gallica', record);

  // Créer la card
  const card = document.createElement('div');
  card.className = 'card';
  
  const imgCont = document.createElement('div');
  imgCont.className = 'image-container';

  // Image principale
  const img = document.createElement('img');
  img.src = thumb;
  img.alt = '';
  imgCont.appendChild(img);

  // Logo Gallica
  const logo = document.createElement('img');
  logo.src = 'img/logo_gallica.png';
  logo.className = 'logo-overlay';
  imgCont.appendChild(logo);

  // Étoile favoris
  const star = document.createElement('span');
  star.className = 'star-overlay';
  star.textContent = AppState.favoris.has(key) ? '★' : '☆';
  star.addEventListener('click', e => {
    e.stopPropagation();
    if (AppState.favoris.has(key)) {
      AppState.favoris.delete(key);
      AppState.favoriteRecords.delete(key);
      supprimerFavori(key);
      console.log('Suppression favori Gallica:', key);
    } else {
      AppState.favoris.add(key);
      AppState.favoriteRecords.set(key, { source: 'Gallica', record });
      console.log('Ajout favori Gallica:', key);
      ajouterFavori(key, 'Gallica');
    }
    star.textContent = AppState.favoris.has(key) ? '★' : '☆';
  });
  imgCont.appendChild(star);

  card.appendChild(imgCont);

  // Titre
  const titleNode = record['srw:recordData']?.['oai_dc:dc']?.['dc:title'];
  let title = '';
  if (typeof titleNode === 'string') title = titleNode;
  else if (titleNode && typeof titleNode === 'object') {
    title = Object.values(titleNode)
      .filter(v => typeof v === 'string')
      .join(' ');
  }
  if (title.length > 70) title = title.slice(0, 70) + ' [...]';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  card.appendChild(h3);

  imgCont.addEventListener('click', () => showModal({ 
    title, 
    highres: extra.highres, 
    uri: extra.uri,
    key,
    record
  }));
  
  container.appendChild(card);
}

/**
 * Recherche Gallica initiale
 */
export async function searchGallica(term) {
  _searchTerm = term;
  _nextRecordPosition = 1;     // init offset à 1 et non à 0
  _loading = false;
  AppState.records = [];
  
  const url = `https://api.ptm.huma-num.fr/metacarte/search/gallica/?query=${encodeURIComponent(term)}`;
  
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const total = parseInt(findAll(data, 'srw:numberOfRecords')[0], 10) || 0;
    AppState.objectsCount.Gallica = total;
    document.getElementById('count_Gallica').textContent = `(${total})`;
    _nextRecordPosition = parseInt(findAll(data, 'srw:nextRecordPosition')[0], 10) || total;

    // Aplatir et filtrer doublons
    let recs = findAll(data, 'srw:record').flat();
    const existing = new Set();
    const unique = recs.filter(r => {
      const k = getRecordKey('Gallica', r);
      if (existing.has(k)) return false;
      existing.add(k);
      return true;
    });
    
    AppState.records = unique.map(r => ({ source: 'Gallica', record: r }));
    renderResults();
  } catch(err) {
    console.error('Erreur recherche Gallica:', err);
  }
}

/**
 * Chargement pagination
 */
export async function loadMoreGallica() {
  console.log('loadMoreGallica:', _loading, _searchTerm);
  
  if (_loading || !_searchTerm) return;
  
  const gal = AppState.records.filter(i => i.source === 'Gallica');
  if (gal.length >= AppState.objectsCount.Gallica) {
    _loading = false;
    return;
  }
  
  _loading = true;
  
  const url = `https://api.ptm.huma-num.fr/metacarte/search/gallica/?query=${encodeURIComponent(_searchTerm)}&page=${_nextRecordPosition}`;
  
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    let recs = findAll(data, 'srw:record').flat();
    
    console.log('loadMoreGallica:', {length: recs.length});

    //liste des titres
    const titles = recs.map(r => {
      const titleNode = r['srw:recordData']?.['oai_dc:dc']?.['dc:title'];
      let title = '';
      if (typeof titleNode === 'string') title = titleNode;
      else if (titleNode && typeof titleNode === 'object') {
        title = Object.values(titleNode)
          .filter(v => typeof v === 'string')
          .join(' ');
      }
      return title;
    }
    );
    console.log('loadMoreGallica:', titles);
    
    if (recs.length === 0) {
      _loading = false;
      return;
    }
    
    _nextRecordPosition = parseInt(findAll(data, 'srw:nextRecordPosition')[0], 10)
                          || (_nextRecordPosition + recs.length);
    
    const existing = new Set(AppState.records.map(i => getRecordKey(i.source, i.record)));
    const unique = recs.filter(r => !existing.has(getRecordKey('Gallica', r)));
    
    AppState.records = AppState.records.concat(
      unique.map(r => ({ source: 'Gallica', record: r }))
    );
    
    renderResults();
  } catch(err) {
    console.error('Erreur loadMore:', err);
  } finally {
    _loading = false;
  }
}

/**
 * Récupère les métadonnées d'un document Gallica via OAI
 */
async function fetchGallicaMetadata(ark) {
  try {
    // Utilisation d'un proxy CORS pour contourner les restrictions
    // ATTENTION: Ce proxy public peut avoir des limitations de taux
    const proxyUrl = `https://corsproxy.io/?https://gallica.bnf.fr/services/OAIRecord?ark=${ark}`;
    const response = await fetch(proxyUrl);
    const xmlText = await response.text();
    
    // Parser le XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Extraire le titre
    const titleElement = xmlDoc.querySelector('dc\\:title, title');
    const title = titleElement ? titleElement.textContent : 'Titre non disponible';
    
    return { title };
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    // Fallback: titre par défaut basé sur l'ARK
    return { title: `Document Gallica ${ark}` };
  }
}

/**
 * Crée une carte pour un favori externe (sans les données complètes du record)
 */
export function createCardFromExternalFavorite(ark, source, title, container) {
  const key = ark; // Pour les favoris externes, on utilise directement l'ark comme clé
  
  // Créer la card
  const card = document.createElement('div');
  card.className = 'card';
  
  const imgCont = document.createElement('div');
  imgCont.className = 'image-container';

  // Image principale (thumbnail)
  const img = document.createElement('img');
  img.src = getGallicaThumbnailUrl(ark);
  img.alt = title;
  img.onerror = () => { img.src = 'img/placeholder.svg'; }; // Fallback si l'image ne charge pas
  imgCont.appendChild(img);

  // Logo Gallica
  const logo = document.createElement('img');
  logo.src = 'img/logo_gallica.png';
  logo.className = 'logo-overlay';
  imgCont.appendChild(logo);

  // Étoile favoris (toujours pleine pour les favoris externes)
  const star = document.createElement('span');
  star.className = 'star-overlay';
  star.textContent = '★';
  star.style.cursor = 'pointer';
  star.addEventListener('click', async e => {
    e.stopPropagation();
    // Supprimer des favoris externes
    AppState.externe_favoris.delete(key);
    AppState.externe_favoriteRecords.delete(key);
    
    // Supprimer du serveur
    await supprimerFavori(key);
    console.log('Suppression favori externe Gallica:', key);
    
    // Rafraîchir l'affichage
    renderResults();
  });
  imgCont.appendChild(star);

  card.appendChild(imgCont);

  // Titre
  const displayTitle = title.length > 70 ? title.slice(0, 70) + ' [...]' : title;
  const h3 = document.createElement('h3');
  h3.textContent = displayTitle;
  card.appendChild(h3);

  // Ajouter l'événement de clic sur l'image pour ouvrir la modale
  imgCont.addEventListener('click', () => {
    // Construire l'URL haute résolution via IIIF v3 pour les favoris externes
    const highresUrl = getGallicaHighresUrl(ark);
    
    // Créer un record factice pour la modale
    const mockRecord = {
      'srw:recordData': {
        'oai_dc:dc': {
          'dc:title': title
        }
      },
      'srw:extraRecordData': {
        highres: highresUrl,
        uri: ark
      }
    };
    
    showModal({ 
      title: displayTitle, 
      highres: highresUrl, 
      uri: ark,
      key,
      record: mockRecord
    });
  });
  
  container.appendChild(card);
}

/**
 * Charge et affiche les favoris externes de l'utilisateur
 */
export async function loadAndDisplayExternalFavorites() {
  console.log('Chargement des favoris externes...');
  
  // Vider les données existantes des favoris externes
  AppState.externe_favoriteRecords.clear();
  
  // Traiter chaque favori externe
  const promises = Array.from(AppState.externe_favoris).map(async (ark) => {
    try {
      // Récupérer les métadonnées
      const metadata = await fetchGallicaMetadata(ark);
      
      // Stocker dans AppState
      AppState.externe_favoriteRecords.set(ark, {
        source: 'Gallica',
        record: {
          ark: ark,
          title: metadata.title,
          thumbnailUrl: getGallicaThumbnailUrl(ark)
        }
      });
      
      console.log(`Favori externe chargé: ${ark} - ${metadata.title}`);
    } catch (error) {
      console.error(`Erreur lors du chargement du favori ${ark}:`, error);
      
      // Stocker avec des données minimales en cas d'erreur
      AppState.externe_favoriteRecords.set(ark, {
        source: 'Gallica',
        record: {
          ark: ark,
          title: 'Titre non disponible',
          thumbnailUrl: getGallicaThumbnailUrl(ark)
        }
      });
    }
  });
  
  // Attendre que tous les favoris soient chargés
  await Promise.all(promises);
  
  console.log('Tous les favoris externes ont été chargés');
  
  // Rafraîchir l'affichage si on est en mode favoris
  if (AppState.showFavorites) {
    renderResults();
  }
}