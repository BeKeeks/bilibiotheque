// Configuration de l'URL de l'API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://anime-bibliotheque-backend.onrender.com'; // Remplacer par ton URL de backend

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = '';

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      errorMessage.textContent = data.message || 'Erreur de connexion.';
      return;
    }
    // Stocker le token JWT
    localStorage.setItem('token', data.token);
    // Rediriger vers la page principale
    window.location.href = 'index.html';
  } catch (err) {
    errorMessage.textContent = 'Erreur réseau ou serveur.';
  }
}); 