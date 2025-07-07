// Configuration de l'URL de l'API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ton-backend.onrender.com'; // Remplacer par ton URL de backend

document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  errorMessage.textContent = '';
  successMessage.textContent = '';

  if (password !== confirmPassword) {
    errorMessage.textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }
  if (password.length < 6) {
    errorMessage.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      errorMessage.textContent = data.message || 'Erreur lors de l\'inscription.';
      return;
    }
    successMessage.textContent = 'Inscription réussie ! Redirection...';
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (err) {
    errorMessage.textContent = 'Erreur réseau ou serveur.';
  }
}); 