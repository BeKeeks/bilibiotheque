require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const User = require('./models/user');
const Anime = require('./models/anime');

const app = express();

// Configuration CORS pour la production
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://animotheque.netlify.app',
  credentials: true
}));

app.use(express.json());

// Route de test pour vérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
  res.json({ message: 'Serveur backend fonctionnel !' });
});

// Connexion à MongoDB (Atlas en production, local en développement)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/anime_bibliotheque';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connecté à MongoDB');
}).catch(err => {
  console.error('Erreur de connexion MongoDB:', err);
});

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Inscription
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email déjà utilisé' });
    
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    
    res.status(201).json({ message: 'Compte créé' });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer la liste d'animés de l'utilisateur
app.get('/api/animes', authenticateToken, async (req, res) => {
  try {
    const animes = await Anime.find({ user: req.user.userId });
    res.json(animes);
  } catch (error) {
    console.error('Erreur récupération animes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un animé
app.post('/api/animes', authenticateToken, async (req, res) => {
  try {
    const { title, lastEpisode, watchDate, status, image } = req.body;
    const anime = new Anime({
      user: req.user.userId,
      title,
      lastEpisode,
      watchDate,
      status,
      image
    });
    await anime.save();
    res.status(201).json(anime);
  } catch (error) {
    console.error('Erreur ajout anime:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un animé
app.delete('/api/animes/:id', authenticateToken, async (req, res) => {
  try {
    await Anime.deleteOne({ _id: req.params.id, user: req.user.userId });
    res.json({ message: 'Animé supprimé' });
  } catch (error) {
    console.error('Erreur suppression anime:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Modifier un animé
app.put('/api/animes/:id', authenticateToken, async (req, res) => {
  try {
    const { title, lastEpisode, watchDate, status, image } = req.body;
    const anime = await Anime.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { title, lastEpisode, watchDate, status, image },
      { new: true }
    );
    res.json(anime);
  } catch (error) {
    console.error('Erreur modification anime:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Réinitialisation du mot de passe (sans email)
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email et nouveau mot de passe requis' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Aucun compte avec cet email' });
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur reset password:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'développement'}`);
}); 