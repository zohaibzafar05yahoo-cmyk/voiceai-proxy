const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Your ElevenLabs API key lives HERE — safe on the server, never visible to customers
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'YOUR_API_KEY_HERE';

// Allow your Netlify website to call this server
app.use(cors({
  origin: '*' // Replace * with your Netlify URL for extra security e.g. 'https://yoursite.netlify.app'
}));

app.use(express.json());

// Health check — visit your server URL to confirm it's running
app.get('/', (req, res) => {
  res.json({ status: 'VoiceAI Studio proxy is running ✅' });
});

// Get available voices from the account
app.get('/voices', async (req, res) => {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.detail?.message || 'Failed to fetch voices' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Generate voiceover — receives text + voice_id, returns audio
app.post('/generate', async (req, res) => {
  const { text, voice_id, stability = 0.5, similarity_boost = 0.75 } = req.body;

  if (!text || !voice_id) {
    return res.status(400).json({ error: 'Missing text or voice_id' });
  }
  if (text.length > 2500) {
    return res.status(400).json({ error: 'Text too long. Max 2500 characters.' });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability, similarity_boost }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.detail?.message || 'ElevenLabs error' });
    }

    // Stream the audio back to the frontend
    res.set('Content-Type', 'audio/mpeg');
    response.body.pipe(res);

  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ VoiceAI proxy running on port ${PORT}`);
});
