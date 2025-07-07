// Configuration de l'URL de l'API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://anime-bibliotheque-backend.onrender.com'; // Remplacer par ton URL de backend

// Chargement initial depuis le backend
let animeListCache = [];

// Utilitaire pour obtenir le token
function getToken() {
  return localStorage.getItem('token');
}

// Utilitaire pour gérer les erreurs d'authentification
function handleAuthError(err) {
  if (err && (err.status === 401 || err.status === 403)) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
}

// Chargement initial
// On attend le DOM et on charge la liste depuis l'API
document.addEventListener("DOMContentLoaded", () => {
  loadAnimeList();

  document.getElementById("animeForm").addEventListener("submit", addAnime);
  document.getElementById("exportButton").addEventListener("click", exportAnimeList);
  
  // Initialisation de l'autocomplétion
  initAutocomplete();
  
  // Ajouter l'événement directement sur le bouton
  document.getElementById("submitButton").addEventListener("click", addAnime);
});

// Variables pour l'autocomplétion
let searchTimeout;
let currentSearchResults = [];

function initAutocomplete() {
  const titleInput = document.getElementById("title");
  const resultsContainer = document.getElementById("autocompleteResults");

  titleInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    // Effacer le timeout précédent
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Masquer les résultats si la requête est vide
    if (query.length < 2) {
      resultsContainer.style.display = "none";
      // Supprimer le menu déroulant des saisons si le champ est vide
      resetSeasonField();
      return;
    }

    // Attendre 300ms avant de faire la recherche (debounce)
    searchTimeout = setTimeout(() => {
      searchAnime(query);
    }, 300);
  });

  // Masquer les résultats quand on clique ailleurs
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-container")) {
      resultsContainer.style.display = "none";
    }
  });
}

function resetSeasonField() {
  // Supprimer le select des saisons s'il existe
  const seasonSelect = document.getElementById("seasonSelect");
  if (seasonSelect) {
    seasonSelect.remove();
  }
  
  // Remettre le champ texte par défaut s'il n'existe pas
  if (!document.getElementById("lastEpisode")) {
    const lastEpisodeCell = document.querySelector("td:nth-child(2)");
    const input = document.createElement("input");
    input.type = "text";
    input.id = "lastEpisode";
    input.placeholder = "Saison";
    input.readOnly = true;
    input.style.backgroundColor = "#f8f9fa";
    input.style.cursor = "not-allowed";
    input.style.minWidth = "120px";
    input.style.width = "120px";
    lastEpisodeCell.appendChild(input);
  }
}

async function searchAnime(query) {
  const resultsContainer = document.getElementById("autocompleteResults");
  const titleInput = document.getElementById("title");
  
  try {
    // Positionner le menu AVANT de l'afficher
    const inputRect = titleInput.getBoundingClientRect();
    resultsContainer.style.left = inputRect.left + 'px';
    resultsContainer.style.top = (inputRect.bottom + 5) + 'px';
    resultsContainer.style.width = inputRect.width + 'px';
    
    // Afficher le loading
    resultsContainer.innerHTML = '<div class="loading">Recherche en cours...</div>';
    resultsContainer.style.display = "block";

    // Appel à l'API Jikan
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10&sfw`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    currentSearchResults = data.data || [];

    // Afficher les résultats
    displaySearchResults(currentSearchResults);

  } catch (error) {
    console.error("Erreur de recherche:", error);
    resultsContainer.innerHTML = `<div class="loading">Erreur: ${error.message}</div>`;
  }
}

function displaySearchResults(results) {
  const resultsContainer = document.getElementById("autocompleteResults");
  const titleInput = document.getElementById("title");
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="loading">Aucun résultat trouvé</div>';
    return;
  }

  const resultsHTML = results.map(anime => {
    const title = anime.title;
    const year = anime.year || 'N/A';
    const type = anime.type || 'N/A';
    const coverImage = anime.images?.jpg?.image_url || '';
    
    // Échapper les caractères spéciaux pour éviter les erreurs JavaScript
    const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
      <div class="autocomplete-item" onclick="selectAnime('${safeTitle}')">
        <img src="${coverImage}" alt="${title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA0MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
        <div class="autocomplete-item-info">
          <div class="autocomplete-item-title">${title}</div>
          <div class="autocomplete-item-type">${type} • ${year}</div>
        </div>
      </div>
    `;
  }).join("");

  resultsContainer.innerHTML = resultsHTML;
  
  // Le menu est déjà positionné et affiché, pas besoin de le repositionner
  // resultsContainer.style.display = "block";
}

async function getSeasonCount(animeId, animeTitle) {
  console.log("Recherche de saisons pour:", animeTitle, "ID:", animeId);
  
  // Base de données locale pour les animés populaires avec plusieurs saisons
  const popularAnimeSeasons = {
    "Naruto": 2,
    "Naruto Shippuden": 21,
    "One Piece": 20,
    "Dragon Ball": 4,
    "Dragon Ball Z": 9,
    "Dragon Ball Super": 5,
    "My Hero Academia": 6,
    "Boku no Hero Academia": 6,
    "Attack on Titan": 4,
    "Shingeki no Kyojin": 4,
    "Demon Slayer": 4,
    "Kimetsu no Yaiba": 4,
    "Jujutsu Kaisen": 3,
    "Black Clover": 4,
    "Fairy Tail": 3,
    "Bleach": 16,
    "Hunter x Hunter": 6,
    "Fullmetal Alchemist": 2,
    "Fullmetal Alchemist: Brotherhood": 1,
    "Death Note": 1,
    "Code Geass": 2,
    "Steins;Gate": 2,
    "Re:Zero": 3,
    "Overlord": 4,
    "Sword Art Online": 4,
    "The Seven Deadly Sins": 5,
    "Nanatsu no Taizai": 5,
    "Tokyo Ghoul": 4,
    "Parasyte": 1,
    "Mob Psycho 100": 3,
    "One Punch Man": 2,
    "The Promised Neverland": 2,
    "Dr. Stone": 3,
    "Fire Force": 2,
    "Vinland Saga": 2,
    "The Rising of the Shield Hero": 3,
    "That Time I Got Reincarnated as a Slime": 3,
    "KonoSuba": 2,
    "No Game No Life": 1,
    "Log Horizon": 2,
    "Accel World": 1,
    "Guilty Crown": 1,
    "Angel Beats!": 1,
    "Charlotte": 1,
    "Plastic Memories": 1,
    "Your Lie in April": 1,
    "Anohana": 1,
    "Clannad": 2,
    "Kanon": 1,
    "Air": 1,
    "Little Busters!": 2,
    "Rewrite": 2,
    "The Melancholy of Haruhi Suzumiya": 2,
    "Lucky Star": 1,
    "K-On!": 2,
    "Tamako Market": 1,
    "Hibike! Euphonium": 2,
    "A Silent Voice": 1,
    "Your Name": 1,
    "Weathering with You": 1,
    "Garden of Words": 1,
    "5 Centimeters per Second": 1,
    "The Place Promised in Our Early Days": 1,
    "Children Who Chase Lost Voices": 1,
    "The Wind Rises": 1,
    "Spirited Away": 1,
    "My Neighbor Totoro": 1,
    "Princess Mononoke": 1,
    "Howl's Moving Castle": 1,
    "Castle in the Sky": 1,
    "Nausicaä of the Valley of the Wind": 1,
    "Kiki's Delivery Service": 1,
    "Porco Rosso": 1,
    "The Cat Returns": 1,
    "Ponyo": 1,
    "Arrietty": 1,
    "From Up on Poppy Hill": 1,
    "The Tale of the Princess Kaguya": 1,
    "When Marnie Was There": 1,
    "The Red Turtle": 1,
    "Earwig and the Witch": 1,
    "How Do You Live?": 1,
    "Giji Harem": 1,
    "The Fake Harem": 1,
    "Giji Harem Season 2": 2,
    "Giji Harem Season 1": 1,
    "Giji Harem Season 3": 3,
    "Giji Harem Season 4": 4
  };

  // Vérifier d'abord dans notre base de données locale
  console.log("Recherche pour:", animeTitle);
  for (const [title, seasons] of Object.entries(popularAnimeSeasons)) {
    // Recherche plus flexible : vérifier si le titre contient la clé ou vice versa
    const animeTitleLower = animeTitle.toLowerCase();
    const titleLower = title.toLowerCase();
    
    console.log("Comparaison:", animeTitleLower, "avec", titleLower);
    
    if (animeTitleLower.includes(titleLower) || 
        titleLower.includes(animeTitleLower) ||
        animeTitleLower === titleLower) {
      console.log("Trouvé dans la base locale:", title, "->", seasons, "saisons");
      return seasons;
    }
  }
  
  console.log("Pas trouvé dans la base locale, utilisation de l'API Jikan");

  try {
    // Si pas trouvé dans la base locale, essayer l'API Jikan
    const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/relations`);
    
    if (!response.ok) {
      console.log("Erreur API Jikan:", response.status);
      return 1;
    }
    
    const data = await response.json();
    if (!data.data) {
      console.log("Pas de données de relations");
      return 1;
    }
    
    // Compter les relations de type "Sequel" + 1 (la saison actuelle)
    let seasonCount = 1;
    
    for (const relation of data.data) {
      if (relation.relation === "Sequel") {
        seasonCount++;
        console.log("Relation Sequel trouvée:", relation.entry.title);
      }
    }
    
    console.log("Nombre total de saisons détecté:", seasonCount);
    return seasonCount;
  } catch (error) {
    console.error("Erreur lors de la récupération des saisons:", error);
    return 1;
  }
}

window.selectAnime = async function(title) {
  const anime = currentSearchResults.find(a => a.title === title);
  document.getElementById("title").value = title;
  document.getElementById("autocompleteResults").style.display = "none";

  // Stocker l'image de l'animé sélectionné
  if (anime && anime.images && anime.images.jpg && anime.images.jpg.image_url) {
    window.selectedAnimeImage = anime.images.jpg.image_url;
  } else {
    window.selectedAnimeImage = null;
  }

  // Gestion du champ saison
  const lastEpisodeCell = document.getElementById("lastEpisode").parentElement;
  let selectId = "seasonSelect";
  
  // On efface le select s'il existe déjà
  if (document.getElementById(selectId)) {
    document.getElementById(selectId).remove();
  }
  
  // On remet le champ texte par défaut
  if (!document.getElementById("lastEpisode")) {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "lastEpisode";
    input.placeholder = "Saison X - Ep X";
    lastEpisodeCell.appendChild(input);
  }

  if (anime && anime.mal_id) {
    // On récupère le nombre de saisons
    const seasonCount = await getSeasonCount(anime.mal_id, anime.title);
    
    console.log("Nombre de saisons trouvé:", seasonCount, "pour", anime.title);
    
    // Créer un menu déroulant même pour 1 saison (pour la cohérence)
    if (seasonCount >= 1) {
      // On remplace le champ texte par un select
      const input = document.getElementById("lastEpisode");
      if (input) input.remove();
      
      const select = document.createElement("select");
      select.id = selectId;
      select.name = "seasonSelect";
      select.style.minWidth = "120px";
      select.style.width = "120px";
      
      // Ajouter les options "Saison 1", "Saison 2", etc.
      for (let i = 1; i <= seasonCount; i++) {
        const opt = document.createElement("option");
        opt.value = `Saison ${i}`;
        opt.textContent = `Saison ${i}`;
        select.appendChild(opt);
      }
      
      lastEpisodeCell.appendChild(select);
    }
  }
}

// Adapter addAnime pour POSTer vers l'API
async function addAnime(e) {
  if (e && e.preventDefault) e.preventDefault();
  const title = document.getElementById("title").value.trim();
  let lastEpisode = "";
  if (document.getElementById("seasonSelect")) {
    lastEpisode = document.getElementById("seasonSelect").value;
  } else if (document.getElementById("lastEpisode")) {
    lastEpisode = document.getElementById("lastEpisode").value.trim();
  }
  const episode = parseInt(document.getElementById("episode").value, 10) || null;
  const watchDate = document.getElementById("watchDate").value;
  const status = document.getElementById("status").value;
  if (!title) return;
  const anime = {
    title,
    lastEpisode,
    episode,
    watchDate,
    status,
    image: window.selectedAnimeImage || null
  };
  try {
    const response = await fetch(`${API_BASE_URL}/api/animes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify(anime)
    });
    if (!response.ok) {
      handleAuthError({ status: response.status });
      alert('Erreur lors de l\'ajout.');
      return;
    }
    // Réinitialiser les champs
    window.selectedAnimeImage = null;
    document.getElementById("title").value = "";
    document.getElementById("watchDate").value = "";
    document.getElementById("status").value = "fini";
    document.getElementById("episode").value = "";
    if (document.getElementById("seasonSelect")) {
      document.getElementById("seasonSelect").remove();
      const lastEpisodeCell = document.querySelector("td:nth-child(2)");
      const input = document.createElement("input");
      input.type = "text";
      input.id = "lastEpisode";
      input.placeholder = "Saison";
      input.readOnly = true;
      input.style.backgroundColor = "#f8f9fa";
      input.style.cursor = "not-allowed";
      input.style.minWidth = "120px";
      input.style.width = "120px";
      lastEpisodeCell.appendChild(input);
    } else if (document.getElementById("lastEpisode")) {
      document.getElementById("lastEpisode").value = "";
    }
    document.getElementById("autocompleteResults").style.display = "none";
    loadAnimeList();
  } catch (err) {
    alert('Erreur réseau.');
  }
}

// Remplacer loadAnimeList pour charger depuis l'API
async function loadAnimeList() {
  const tbody = document.querySelector("#animeTable tbody");
  tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Chargement...</td></tr>";
  try {
    const response = await fetch(`${API_BASE_URL}/api/animes`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    });
    if (!response.ok) {
      handleAuthError({ status: response.status });
      tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:#d32f2f;'>Erreur de chargement</td></tr>";
      return;
    }
    const animeList = await response.json();
    animeListCache = animeList;
    renderAnimeList(animeList);
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:#d32f2f;'>Erreur réseau</td></tr>";
  }
}

// Nouvelle fonction pour afficher la liste (extrait de l'ancienne loadAnimeList)
function renderAnimeList(animeList) {
  const tbody = document.querySelector("#animeTable tbody");
  tbody.innerHTML = "";
  animeList.forEach((anime, index) => {
    const tr = document.createElement("tr");
    let formattedDate = "-";
    if (anime.watchDate) {
      const date = new Date(anime.watchDate);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
    let displayTitle = anime.title;
    const japaneseToEnglish = {/* ... même objet ... */};
    if (japaneseToEnglish[anime.title]) {
      displayTitle = japaneseToEnglish[anime.title];
    }
    tr.innerHTML = `
      <td>
        <div style="text-align: center;">
          <div style="font-weight: bold; margin-bottom: 8px;">${displayTitle}</div>
          ${anime.image ? `<img src="${anime.image}" alt="${anime.title}" style="width: 100px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 3px 12px rgba(0,0,0,0.3);" onerror="this.style.display='none'">` : ''}
        </div>
      </td>
      <td>
        ${anime.lastEpisode || "-"}
        ${anime.episode ? `<div style='font-size:0.95em; color:#555;'>Épisode : ${anime.episode}</div>` : ''}
      </td>
      <td>${formattedDate}</td>
      <td>${formatStatus(anime.status)}</td>
      <td>🔍</td>
      <td><button onclick="deleteAnime('${anime._id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Adapter deleteAnime pour DELETE via l'API
window.deleteAnime = async function(animeId) {
  // Vérifier s'il y a déjà une boîte de dialogue ouverte
  if (document.querySelector('.confirm-dialog')) {
    return;
  }

  // Trouver l'animé à supprimer pour afficher son nom
  const anime = animeListCache.find(a => a._id === animeId);

  // Créer la boîte de dialogue de confirmation
  const confirmDialog = document.createElement("div");
  confirmDialog.className = "confirm-dialog";
  confirmDialog.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex; justify-content: center; align-items: center;
    z-index: 10000;
  `;

  const dialogContent = document.createElement("div");
  dialogContent.style.cssText = `
    background-color: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 400px;
    width: 90%;
  `;

  dialogContent.innerHTML = `
    <h3 style="margin-bottom: 1rem; color: #333;">Confirmation de suppression</h3>
    <p style="margin-bottom: 1.5rem; color: #666;">Êtes-vous sûr de vouloir supprimer "${anime ? anime.title : ''}" de votre bibliothèque ?</p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <button id="confirmYes" style="padding: 10px 20px; background-color: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background-color 0.3s ease;">Oui, supprimer</button>
      <button id="confirmNo" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background-color 0.3s ease;">Non, annuler</button>
    </div>
  `;

  confirmDialog.appendChild(dialogContent);
  document.body.appendChild(confirmDialog);

  // Ajout des listeners après l'insertion dans le DOM
  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  if (yesBtn) {
    yesBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/animes/${animeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        });
        if (!response.ok) {
          handleAuthError({ status: response.status });
          alert('Erreur lors de la suppression.');
        }
        loadAnimeList();
        document.body.removeChild(confirmDialog);
      } catch (err) {
        alert('Erreur réseau.');
      }
    });
  }

  if (noBtn) {
    noBtn.addEventListener("click", () => {
      document.body.removeChild(confirmDialog);
    });
  }

  // Fermer en cliquant en dehors de la boîte de dialogue
  confirmDialog.addEventListener("click", (e) => {
    if (e.target === confirmDialog) {
      document.body.removeChild(confirmDialog);
    }
  });
};

// Désactiver l'export/import (optionnel, ou tu peux les adapter pour utiliser l'API si besoin)
function exportAnimeList() {
  alert('La sauvegarde/export se fait désormais automatiquement sur votre compte.');
}

document.getElementById("importButton").addEventListener("click", () => {
  const fileInput = document.getElementById("importFile");
  const file = fileInput.files[0];
  if (!file) {
    alert("Sélectionne un fichier JSON d'abord.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (!Array.isArray(importedData)) throw new Error("Format invalide");

      // Remplace la bibliothèque actuelle
      localStorage.setItem("animeList", JSON.stringify(importedData));
      loadAnimeList();
      alert("Import réussi !");
    } catch (err) {
      alert("Le fichier n'est pas valide.");
    }
  };
  reader.readAsText(file);
});

// Variables pour le tri
let currentSortColumn = -1;
let currentSortDirection = 1; // 1 pour ascendant, -1 pour descendant

function sortTable(columnIndex) {
  const table = document.getElementById("animeTable");
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  
  // Changer la direction si on clique sur la même colonne
  if (currentSortColumn === columnIndex) {
    currentSortDirection *= -1;
  } else {
    currentSortDirection = 1;
    currentSortColumn = columnIndex;
  }
  
  // Mettre à jour les flèches dans les en-têtes
  updateSortArrows(columnIndex, currentSortDirection);
  
  // Trier les lignes
  rows.sort((a, b) => {
    const aValue = a.cells[columnIndex].textContent.trim();
    const bValue = b.cells[columnIndex].textContent.trim();
    
    let comparison = 0;
    
    switch (columnIndex) {
      case 0: // Nom - tri alphabétique
        comparison = aValue.localeCompare(bValue, 'fr', {sensitivity: 'base'});
        break;
      case 1: // Saison - tri numérique puis alphabétique
        comparison = compareSeasons(aValue, bValue);
        break;
      case 2: // Date - tri chronologique
        comparison = compareDates(aValue, bValue);
        break;
      case 3: // Statut - tri alphabétique
        comparison = aValue.localeCompare(bValue, 'fr', {sensitivity: 'base'});
        break;
      default:
        comparison = aValue.localeCompare(bValue, 'fr', {sensitivity: 'base'});
    }
    
    return comparison * currentSortDirection;
  });
  
  // Réorganiser les lignes dans le tableau
  rows.forEach(row => tbody.appendChild(row));
}

function compareSeasons(a, b) {
  // Extraire les numéros de saison et d'épisode
  const aMatch = a.match(/Saison\s*(\d+)/i);
  const bMatch = b.match(/Saison\s*(\d+)/i);
  
  if (aMatch && bMatch) {
    const aSeason = parseInt(aMatch[1]);
    const bSeason = parseInt(bMatch[1]);
    
    if (aSeason !== bSeason) {
      return aSeason - bSeason;
    }
  }
  
  // Si pas de numéro de saison ou même saison, tri alphabétique
  return a.localeCompare(b, 'fr', {sensitivity: 'base'});
}

function compareDates(a, b) {
  // Gérer le cas où une des valeurs est "-"
  if (a === "-" && b === "-") return 0;
  if (a === "-") return 1; // Les dates vides vont à la fin
  if (b === "-") return -1;
  
  // Parser le format français JJ/MM/AAAA
  const aMatch = a.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const bMatch = b.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  
  if (aMatch && bMatch) {
    const aDay = parseInt(aMatch[1]);
    const aMonth = parseInt(aMatch[2]);
    const aYear = parseInt(aMatch[3]);
    
    const bDay = parseInt(bMatch[1]);
    const bMonth = parseInt(bMatch[2]);
    const bYear = parseInt(bMatch[3]);
    
    // Comparer année, puis mois, puis jour
    if (aYear !== bYear) return aYear - bYear;
    if (aMonth !== bMonth) return aMonth - bMonth;
    return aDay - bDay;
  }
  
  // Si le format ne correspond pas, tri alphabétique
  return a.localeCompare(b, 'fr', {sensitivity: 'base'});
}

function updateSortArrows(columnIndex, direction) {
  const headers = document.querySelectorAll("#animeTable th");
  
  headers.forEach((header, index) => {
    if (index < 4) { // Seulement les colonnes triables
      const text = header.textContent.replace(/[↑↓↕]/, '').trim();
      if (index === columnIndex) {
        header.textContent = `${text} ${direction === 1 ? '↑' : '↓'}`;
      } else {
        header.textContent = `${text} ↕`;
      }
    }
  });
}

function formatStatus(status) {
  switch (status) {
    case 'fini':
      return 'Terminé';
    case 'saison à venir':
      return 'Saison à venir';
    case 'pas d\'info':
      return 'Pas d\'information';
    default:
      return status;
  }
}
