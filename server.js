const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// ✅ CORS fix — allow all origins
app.use(cors());
app.options('*', cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'VoiceAI Studio proxy is running ✅' });
});

// Get voices
app.get('/voices', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.detail?.message || 'Failed' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Generate voiceover
app.post('/generate', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  const { text, voice_id, stability = 0.5, similarity_boost = 0.75 } = req.body;
  if (!text || !voice_id) return res.status(400).json({ error: 'Missing text or voice_id' });
  if (text.length > 2500) return res.status(400).json({ error: 'Text too long. Max 2500 chars.' });
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability, similarity_boost } })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.detail?.message || 'ElevenLabs error' });
    }
    res.set('Content-Type', 'audio/mpeg');
    res.set('Access-Control-Allow-Origin', '*');
    response.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`✅ VoiceAI proxy running on port ${PORT}`));
