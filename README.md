# 🎌 Bibliothèque d'Animés

Une application web pour gérer ta liste d'animés avec authentification et sauvegarde cloud.

## 🚀 Déploiement

### Prérequis
- Un compte GitHub
- Un compte Netlify (gratuit)
- Un compte Render (gratuit)
- Un compte MongoDB Atlas (gratuit)

---

## 📋 Étapes de déploiement

### 1. Préparer le projet

1. **Pousse ton code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ton-username/anime-bibliotheque.git
   git push -u origin main
   ```

### 2. Configurer MongoDB Atlas

1. Va sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crée un compte gratuit
3. Crée un nouveau cluster (gratuit)
4. Dans "Database Access", crée un utilisateur avec mot de passe
5. Dans "Network Access", autorise l'accès depuis partout (0.0.0.0/0)
6. Clique sur "Connect" et copie l'URL de connexion

### 3. Déployer le Backend sur Render

1. Va sur [Render](https://render.com)
2. Connecte-toi avec GitHub
3. Clique sur "New Web Service"
4. Connecte ton repo GitHub
5. Configure le service :
   - **Name** : `anime-bibliotheque-backend`
   - **Root Directory** : `backend`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`

6. **Variables d'environnement** :
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/anime_bibliotheque
   JWT_SECRET=ton-secret-super-securise
   NODE_ENV=production
   ```

7. Clique sur "Create Web Service"
8. Copie l'URL générée (ex: `https://anime-bibliotheque-backend.onrender.com`)

### 4. Déployer le Frontend sur Netlify

1. Va sur [Netlify](https://netlify.com)
2. Connecte-toi avec GitHub
3. Clique sur "New site from Git"
4. Sélectionne ton repo
5. Configure le déploiement :
   - **Base directory** : (laisse vide)
   - **Build command** : (laisse vide)
   - **Publish directory** : (laisse vide)

6. Clique sur "Deploy site"
7. Copie l'URL générée (ex: `https://anime-bibliotheque.netlify.app`)

### 5. Configurer les URLs

1. **Dans le frontend** (fichiers `login.js`, `register.js`, `script.js`) :
   Remplace `https://ton-backend.onrender.com` par ton URL Render

2. **Dans le backend** (variable d'environnement sur Render) :
   Ajoute : `FRONTEND_URL=https://ton-site.netlify.app`

### 6. Tester

1. Va sur ton site Netlify
2. Crée un compte
3. Connecte-toi
4. Ajoute des animés à ta liste

---

## 🔧 Développement local

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
Ouvre `index.html` dans ton navigateur

---

## 📱 Accès mobile

Une fois déployé, tu peux accéder à ton site depuis n'importe quel appareil en allant sur l'URL Netlify !

---

## 🛠️ Technologies utilisées

- **Frontend** : HTML, CSS, JavaScript vanilla
- **Backend** : Node.js, Express
- **Base de données** : MongoDB
- **Authentification** : JWT
- **Hébergement** : Netlify (frontend), Render (backend)

---

## 🔒 Sécurité

- Mots de passe hachés avec bcrypt
- Authentification JWT
- CORS configuré
- Validation des données

---

## 📞 Support

Si tu rencontres des problèmes :
1. Vérifie que toutes les variables d'environnement sont configurées
2. Vérifie les logs sur Render
3. Vérifie la console du navigateur pour les erreurs 