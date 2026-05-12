import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/generate', async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = (process.env.POLLINATIONS_API_KEY || "").replace(/['"]+/g, '').trim();
      
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { 
              role: 'system', 
              content: 'Anda adalah ahli gizi profesional. Berikan respon dalam format Markdown. Selalu sertakan ringkasan nutrisi di akhir dalam format JSON di dalam blok teks ---NUTRITION_JSON--- {...} ---END---.' 
            },
            { 
              role: 'user', 
              content: prompt + '\n\nJangan lupa sertakan blok NUTRITION_JSON di akhir dengan struktur: {"calories": number, "protein": number, "carbs": number, "fat": number, "micronutrients": {"vitamin_a_mcg": number, "vitamin_c_mg": number, "calcium_mg": number, "iron_mg": number}}' 
            }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pollinations API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const fullText = data.choices?.[0]?.message?.content || "";



      // Extract JSON nutrition data
      const jsonMatch = fullText.match(/---NUTRITION_JSON---([\s\S]*?)---END---/);
      let nutrition = null;
      let cleanMarkdown = fullText;

      if (jsonMatch) {
        try {
          nutrition = JSON.parse(jsonMatch[1].trim());
          cleanMarkdown = fullText.replace(/---NUTRITION_JSON---[\s\S]*?---END---/, '').trim();
        } catch (e) {
          console.error("Failed to parse nutrition JSON from Pollinations", e);
        }
      }

      // Extract title/recipe name
      const nameMatch = cleanMarkdown.match(/(?:Nama Resep|Resep|Menu)[:\-\*]?\s*([^\n]+)/i);
      const recipeName = nameMatch ? nameMatch[1].trim().replace(/\*/g, '') : "Rencana Nutrisi Life";

      res.json({
        recipe_markdown: cleanMarkdown,
        recipe_name: recipeName,
        nutrition: nutrition
      });

    } catch (error: any) {
      console.error('Generation Error:', error);
      res.status(500).json({ error: error.message || 'Error generation' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
