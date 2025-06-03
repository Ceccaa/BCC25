// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios'); // Aggiungi questa riga

const app = express();
const port = 3000;

// Instanzio il client OpenAI
const openAI = new OpenAI({ apiKey: process.env.CHATGPT_KEY });

// Configurazione D-ID
const DID_API_URL = 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;
const DID_AVATAR_ID = process.env.DID_AVATAR_ID || 'alex_v2'; // Sostituisci con il tuo avatar se necessario

// Middleware
app.use(express.json({ limit: '10mb' })); // aumentiamo il body limit perché passiamo immagini in base64
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Cartella statica per i file in /public (index.ejs fa riferimento a “/assets/…”)
app.use(express.static(path.join(__dirname, 'public')));

// Imposto EJS come template engine e cartella “templates”
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Rotta GET per la pagina principale
app.get('/', (req, res) => {
  res.render('index');
});

// Rotta POST '/ask': ricevo { imageData } dal client
app.post('/ask', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Verifica che sia una stringa base64 valida di immagine
    const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    const mimeType = match[1];
    const base64Image = match[2];

    // Solo alcuni tipi di immagini sono accettati
    const allowedTypes = ['jpeg', 'jpg', 'png', 'webp'];
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    const response = await openAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: "Analizza l'immagine e identifica il soggetto principale. Se non è chiaro, ipotizza il soggetto più probabile. Determina il materiale predominante dell’oggetto. In base a questo, indica in quale bidone della raccolta differenziata deve essere smaltito, scegliendo solo tra: PLASTICA, VETRO, CARTA, ORGANICO, INDIFFERENZIATA. Rispondi in modo conciso, indicando solo: Il soggetto identificato, Il materiale principale, Il bidone corretto. Se il materiale non è identificabile con certezza, rispondi ‘INDIFFERENZIATA’. RISPONDI IN MANIERA DISCORSIVA E NATURALE, NON A PUNTI, MA RIMANI COMUNQUE SINTETICO."
            },
            { 
              type: 'image_url',
              image_url: {
                url: `data:image/${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 50,
    });

    const answer = response.choices?.[0]?.message?.content?.trim() || "l'oggetto va riciclato nell'INDIFFERENZIATA";
    res.json({ answer });

  } catch (err) {
    console.error('OpenAI Error:', err);
    res.status(500).json({ 
      error: 'Error contacting AI',
      details: err.message || 'Unknown error'
    });
  }
});

// Nuova rotta per generare video D-ID
app.post('/generate-did-video', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const response = await axios.post(
      `${DID_API_URL}/talks`,
      {
        script: {
          type: 'text',
          input: text,
          provider: { type: 'microsoft', voice_id: 'it-IT-ElsaNeural' }
        },
        source: {
          type: "avatar",
          id: DID_AVATAR_ID
        },
        config: { fluent: true, pad_audio: 0.0 }
      },
      {
        headers: {
          Authorization: `Basic ${DID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const talkId = response.data.id;
    res.json({ talkId });

  } catch (error) {
    console.error('D-ID API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error generating D-ID video', 
      details: error.response?.data || error.message 
    });
  }
});

// Rotta per ottenere lo stato del video
app.get('/talk-status/:talkId', async (req, res) => {
  try {
    const { talkId } = req.params;
    const response = await axios.get(`${DID_API_URL}/talks/${talkId}`, {
      headers: { Authorization: `Basic ${DID_API_KEY}` }
    });

    res.json(response.data);

  } catch (error) {
    console.error('D-ID Status Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error getting talk status', 
      details: error.response?.data || error.message 
    });
  }
});

// Funzione per controllare lo stato del video con polling
async function checkTalkStatus(talkId, retries = 30, interval = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`/talk-status/${talkId}`);
      if (!response.ok) throw new Error('Errore nella richiesta dello stato');
      const data = await response.json();

      // Stato completato
      if (data.result_url) {
        return data.result_url;
      }

      // Stato errore
      if (data.status === 'error' || data.error) {
        throw new Error(data.error || 'Errore nella generazione del video');
      }
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
    // Attendi prima del prossimo tentativo
    await new Promise(res => setTimeout(res, interval));
  }
  throw new Error('Timeout: il video non è stato generato in tempo');
}

// Avvio il server
app.listen(port, () => {
  console.log(`Server avviato su http://localhost:${port}`);
});

async function speakWithDID(message) {
  const videoElement = document.getElementById('avatarVideo');
  const idleImage = document.getElementById('idleImage');
  try {
    // Mostra il video e nascondi l'immagine
    videoElement.style.display = 'block';
    idleImage.style.display = 'none';

    // Richiesta per generare il video D-ID
    const response = await fetch('/generate-did-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });

    if (!response.ok) {
      throw new Error('Errore nella generazione del video');
    }

    const { talkId } = await response.json();

    // Funzione di polling per ottenere l'URL del video
    async function checkTalkStatusClient(talkId, retries = 30, interval = 2000) {
      for (let attempt = 0; attempt < retries; attempt++) {
        const statusRes = await fetch(`/talk-status/${talkId}`);
        if (!statusRes.ok) throw new Error('Errore nella richiesta dello stato');
        const data = await statusRes.json();
        if (data.result_url) return data.result_url;
        if (data.status === 'error' || data.error) {
          throw new Error(data.error || 'Errore nella generazione del video');
        }
        await new Promise(res => setTimeout(res, interval));
      }
      throw new Error('Timeout: il video non è stato generato in tempo');
    }

    const videoUrl = await checkTalkStatusClient(talkId);

    // Imposta e riproduci il video
    videoElement.src = videoUrl;
    videoElement.volume = 1;
    videoElement.loop = false;

    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Errore riproduzione:", error);
        alert("Per attivare l'audio, clicca sul video!");
      });
    }

    // Quando il video termina, torna all'immagine idle
    videoElement.onended = () => {
      videoElement.style.display = 'none';
      idleImage.style.display = 'block';
      videoElement.removeAttribute('src');
      videoElement.load();
    };

  } catch (error) {
    console.error("Errore D-ID:", error);
    alert("Errore nell'animazione dell'avatar: " + error.message);
    // Ripristina stato iniziale
    if (videoElement && idleImage) {
      videoElement.style.display = 'none';
      idleImage.style.display = 'block';
    }
  }
}
