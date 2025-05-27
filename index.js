const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');
const path = require('path');

const port = 3000;
const openAI = new OpenAI({ apiKey: process.env.CHATGPT_KEY });

let messages = [];

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

app.get('/', function (req, res) {
  res.render('index');
});

app.post('/ask', async (req, res) => {
  try {
    const { question, imageData } = req.body;

    if (!question || !imageData) {
      return res.status(400).json({ error: 'Question and image data are required' });
    }

    // Format for GPT-4 vision model
    const response = await openAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            { 
              type: 'image_url', 
              image_url: { 
                url: imageData // base64 string
              } 
            }
          ]
        }
      ],
      max_tokens: 100,
    });

    const answer = response.choices[0].message.content.trim();

    res.json({ answer });

  } catch (err) {
    console.error('OpenAI Error:', err);
    res.status(500).json({ error: 'Error contacting AI' });
  }
});



async function startServer() {
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}

startServer();

