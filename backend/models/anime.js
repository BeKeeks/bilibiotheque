const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  lastEpisode: String,
  episode: Number,
  watchDate: String,
  status: String,
  image: String
});

module.exports = mongoose.model('Anime', animeSchema); 