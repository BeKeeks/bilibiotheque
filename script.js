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
    "KonoSuba": 3,
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
    "Giji Harem Season 4": 4,
    // Nouvelles saisons ajoutées
    "Tokyo Revengers": 3,
    "Tokyo Manji Revengers": 3,
    "Kono Subarashii Sekai ni Shukufuku wo!": 3,
    "Kono Subarashii Sekai ni Shukufuku o": 3,
    "Rent a Girlfriend": 4,
    "Kanojo, Okarishimasu": 4,
    "Horimiya": 2,
    "Hori-san to Miyamura-kun": 2,
    "The Great Cleric": 2,
    "Shijou Saikyou no Daimaou, Murabito A ni Tensei suru": 2
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
  const sortie = document.getElementById("sortie") ? document.getElementById("sortie").value.trim() : "";
  if (!title) return;
  const anime = {
    title,
    lastEpisode,
    episode,
    watchDate,
    status,
    sortie: status === 'saison à venir' ? sortie : '',
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
    if (document.getElementById("sortie")) document.getElementById("sortie").value = "";
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
async function renderAnimeList(animeList) {
  const tbody = document.querySelector("#animeTable tbody");
  tbody.innerHTML = "";
  
  for (const anime of animeList) {
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
    
    // Traduction automatique du titre
    let displayTitle = await translateAnimeTitle(anime.title);

    // Afficher la sortie prévue si renseignée
    let sortieCell = anime.sortie && anime.status === 'saison à venir' ? anime.sortie : '';

    tr.innerHTML = `
      <td style="width: 200px;">
        <div style="text-align: center;">
          <div style="font-weight: bold; margin-bottom: 8px;">${displayTitle}</div>
          ${anime.image ? `<img src="${anime.image}" alt="${anime.title}" style="width: 120px; height: 180px; object-fit: cover; border-radius: 8px; box-shadow: 0 3px 12px rgba(0,0,0,0.3);" onerror="this.style.display='none'">` : ''}
        </div>
      </td>
      <td>
        ${anime.lastEpisode || "-"}
        ${anime.episode ? `<div style='font-size:0.95em; color:#555;'>Épisode : ${anime.episode}</div>` : ''}
      </td>
      <td>${formattedDate}</td>
      <td>${formatStatus(anime.status)}</td>
      <td>${sortieCell}</td>
      <td style="text-align: center;">
        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
          <button onclick="editAnime('${anime._id}')" style="background: #6c757d; color: white; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-size: 1rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">✏️</button>
          <button onclick="deleteAnime('${anime._id}')" style="background: #42a5f5; color: white; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-size: 1rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
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
        comparison = compareDates(aValue, bValue, currentSortDirection);
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

function compareDates(a, b, direction) {
  // Convertir en timestamp ou null si vide/mal formaté
  function parseDate(str) {
    const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    // yyyy-mm-dd pour Date
    return new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`).getTime();
  }
  const aTime = parseDate(a);
  const bTime = parseDate(b);

  // Les deux vides
  if (aTime === null && bTime === null) return 0;
  // a vide
  if (aTime === null) return direction === 1 ? -1 : 1;
  // b vide
  if (bTime === null) return direction === 1 ? 1 : -1;
  // Les deux valides
  if (aTime < bTime) return -1;
  if (aTime > bTime) return 1;
  return 0;
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

// Fonction pour traduire automatiquement les titres japonais
async function translateAnimeTitle(japaneseTitle) {
  // Dictionnaire de traductions existantes
  const translations = {
    "Enen no Shouboutai": "Fire Force",
    "Boku no Hero Academia": "My Hero Academia",
    "Shingeki no Kyojin": "Attack on Titan",
    "Kimetsu no Yaiba": "Demon Slayer",
    "Nanatsu no Taizai": "The Seven Deadly Sins",
    "Tate no Yuusha no Nariagari": "The Rising of the Shield Hero",
    "Tensei shitara Slime Datta Ken": "That Time I Got Reincarnated as a Slime",
    "Kono Subarashii Sekai ni Shukufuku wo!": "KonoSuba",
    "Kono Subarashii Sekai ni Shukufuku o": "KonoSuba",
    "No Game No Life": "No Game No Life",
    "Log Horizon": "Log Horizon",
    "Accel World": "Accel World",
    "Guilty Crown": "Guilty Crown",
    "Angel Beats!": "Angel Beats!",
    "Charlotte": "Charlotte",
    "Plastic Memories": "Plastic Memories",
    "Shigatsu wa Kimi no Uso": "Your Lie in April",
    "Anohana": "Anohana",
    "Ano Hi Mita Hana no Namae wo Bokutachi wa Mada Shiranai": "Anohana",
    "Clannad": "Clannad",
    "Kanon": "Kanon",
    "Air": "Air",
    "Little Busters!": "Little Busters!",
    "Rewrite": "Rewrite",
    "Suzumiya Haruhi no Yuuutsu": "The Melancholy of Haruhi Suzumiya",
    "Lucky Star": "Lucky Star",
    "K-On!": "K-On!",
    "Tamako Market": "Tamako Market",
    "Hibike! Euphonium": "Hibike! Euphonium",
    "Koe no Katachi": "A Silent Voice",
    "Kimi no Na wa": "Your Name",
    "Tenki no Ko": "Weathering with You",
    "Kotonoha no Niwa": "Garden of Words",
    "Byousoku 5 Centimeter": "5 Centimeters per Second",
    "Kumo no Mukou, Yakusoku no Basho": "The Place Promised in Our Early Days",
    "Hoshi wo Ou Kodomo": "Children Who Chase Lost Voices",
    "Kaze Tachinu": "The Wind Rises",
    "Sen to Chihiro no Kamikakushi": "Spirited Away",
    "Tonari no Totoro": "My Neighbor Totoro",
    "Mononoke Hime": "Princess Mononoke",
    "Howl no Ugoku Shiro": "Howl's Moving Castle",
    "Tenkuu no Shiro Laputa": "Castle in the Sky",
    "Kaze no Tani no Nausicaa": "Nausicaä of the Valley of the Wind",
    "Majo no Takkyuubin": "Kiki's Delivery Service",
    "Kurenai no Buta": "Porco Rosso",
    "Neko no Ongaeshi": "The Cat Returns",
    "Gake no Ue no Ponyo": "Ponyo",
    "Karigurashi no Arrietty": "Arrietty",
    "Kokuriko-zaka kara": "From Up on Poppy Hill",
    "Kaguya-hime no Monogatari": "The Tale of the Princess Kaguya",
    "Omoide no Marnie": "When Marnie Was There",
    "Reddo Taato": "The Red Turtle",
    "Aya to Majo": "Earwig and the Witch",
    "Kimitachi wa Dou Ikiru ka": "How Do You Live?",
    "Giji Harem": "Pseudo Harem",
    "Pseudo Harem": "Pseudo Harem",
    "Rent a Girlfriend": "Rent a Girlfriend",
    "Kanojo, Okarishimasu": "Rent a Girlfriend",
    "The Great Cleric": "The Great Cleric",
    "Shijou Saikyou no Daimaou, Murabito A ni Tensei suru": "The Great Cleric"
  };

  // Vérifier d'abord dans notre dictionnaire
  if (translations[japaneseTitle]) {
    return translations[japaneseTitle];
  }

  // Si pas trouvé, essayer de récupérer via l'API Jikan (tous les titres)
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(japaneseTitle)}&limit=1`);
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const anime = data.data[0];
        // Prendre le titre anglais si dispo, sinon le titre principal, sinon le titre japonais
        if (anime.title_english && anime.title_english !== "null" && anime.title_english !== "") {
          return anime.title_english;
        }
        if (anime.title && anime.title !== "null" && anime.title !== "") {
          return anime.title;
        }
        if (anime.title_japanese && anime.title_japanese !== "null" && anime.title_japanese !== "") {
          return anime.title_japanese;
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de la traduction:", error);
  }

  // Si aucune traduction trouvée, retourner le titre original
  return japaneseTitle;
}

async function getAnimeReleaseInfo(title) {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const anime = data.data[0];
        // Date précise
        if (anime.aired && anime.aired.from) {
          const date = new Date(anime.aired.from);
          if (!isNaN(date.getTime())) {
            return `Sortie prévue le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
          }
        }
        // Saison/année
        if (anime.season && anime.year) {
          const saison = anime.season.charAt(0).toUpperCase() + anime.season.slice(1);
          return `Sortie prévue : ${saison} ${anime.year}`;
        }
        // Année seule
        if (anime.year) {
          return `Sortie prévue : ${anime.year}`;
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de la date de sortie:", error);
  }
  return "Inconnue";
}

// Fonction pour modifier un animé
window.editAnime = async function(animeId) {
  // Trouver l'animé à modifier
  const anime = animeListCache.find(a => a._id === animeId);
  if (!anime) {
    alert('Animé non trouvé');
    return;
  }

  // Créer la boîte de dialogue de modification
  const editDialog = document.createElement("div");
  editDialog.className = "edit-dialog";
  editDialog.style.cssText = `
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
    max-width: 500px;
    width: 90%;
  `;

  // Créer les options de saison
  let seasonOptions = '';
  for (let i = 1; i <= 25; i++) {
    const selected = anime.lastEpisode === `Saison ${i}` ? 'selected' : '';
    seasonOptions += `<option value="Saison ${i}" ${selected}>Saison ${i}</option>`;
  }

  // Champ sortie prévu (affiché seulement si "saison à venir")
  const sortieField = `
    <div id="editSortieContainer" style="display: ${anime.status === 'saison à venir' ? '' : 'none'}; margin-top: 0.5rem;">
      <label for="editSortie" style="font-size: 0.95em;">Sortie prévue :</label>
      <input type="text" id="editSortie" value="${anime.sortie || ''}" style="width: 100%; border: 1px solid #ccc; border-radius: 6px;" placeholder="ex: Automne 2026 ou 12/10/2024">
    </div>
  `;

  dialogContent.innerHTML = `
    <h3 style="margin-bottom: 1.5rem; color: #333;">Modifier "${anime.title}"</h3>
    <form id="editForm" style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <label for="editSeason" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Saison :</label>
        <select id="editSeason" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
          ${seasonOptions}
        </select>
      </div>
      <div>
        <label for="editEpisode" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Épisode :</label>
        <input type="number" id="editEpisode" value="${anime.episode || ''}" min="1" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
      </div>
      <div>
        <label for="editDate" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Date de visionnage :</label>
        <input type="date" id="editDate" value="${anime.watchDate || ''}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
      </div>
      <div>
        <label for="editStatus" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Statut :</label>
        <select id="editStatus" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
          <option value="fini" ${anime.status === 'fini' ? 'selected' : ''}>Terminé</option>
          <option value="saison à venir" ${anime.status === 'saison à venir' ? 'selected' : ''}>Saison à venir</option>
          <option value="pas d'info" ${anime.status === 'pas d\'info' ? 'selected' : ''}>Pas d'information</option>
        </select>
      </div>
      ${sortieField}
      <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
        <button type="submit" style="padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">Sauvegarder</button>
        <button type="button" id="cancelEdit" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">Annuler</button>
      </div>
    </form>
  `;

  editDialog.appendChild(dialogContent);
  document.body.appendChild(editDialog);

  // Afficher/masquer le champ sortie selon le statut
  document.getElementById("editStatus").addEventListener('change', function() {
    const sortieContainer = document.getElementById('editSortieContainer');
    if (this.value === 'saison à venir') {
      sortieContainer.style.display = '';
    } else {
      sortieContainer.style.display = 'none';
      document.getElementById('editSortie').value = '';
    }
  });

  // Gestionnaire pour le formulaire de modification
  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const updatedAnime = {
      title: anime.title,
      lastEpisode: document.getElementById("editSeason").value,
      episode: parseInt(document.getElementById("editEpisode").value, 10) || null,
      watchDate: document.getElementById("editDate").value,
      status: document.getElementById("editStatus").value,
      sortie: document.getElementById("editStatus").value === 'saison à venir' ? document.getElementById("editSortie").value.trim() : '',
      image: anime.image
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/animes/${animeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(updatedAnime)
      });

      if (!response.ok) {
        handleAuthError({ status: response.status });
        alert('Erreur lors de la modification.');
        return;
      }

      loadAnimeList();
      document.body.removeChild(editDialog);
    } catch (err) {
      alert('Erreur réseau.');
    }
  });

  // Gestionnaire pour le bouton Annuler
  document.getElementById("cancelEdit").addEventListener("click", () => {
    document.body.removeChild(editDialog);
  });

  // Fermer en cliquant en dehors de la boîte de dialogue
  editDialog.addEventListener("click", (e) => {
    if (e.target === editDialog) {
      document.body.removeChild(editDialog);
    }
  });
};
