import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, history } = req.body;

    let contents = [];

    // Formata histórico antigo
    if (history && Array.isArray(history)) {
      history.forEach(item => {
        if (item.content) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }]
          });
        }
      });
    }

    // Parte atual
    let currentParts = [];
    if (message) {
      currentParts.push({ text: message });
    }

    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        currentParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    if (currentParts.length > 0) {
      contents.push({
        role: 'user',
        parts: currentParts
      });
    }

    // Força o modelo a usar a busca e ser preciso
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }], // Ativa busca real no Google
        systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma precisa, direta e amigável. REGRA CRÍTICA: Quando for perguntado sobre fatos reais, times de futebol, títulos ou notícias, pesquise sempre no Google Search antes de responder. O Avaí Futebol Clube é um time de Santa Catarina (Florianópolis) e disputa o Campeonato Catarinense."
      }
    });

    res.json({ reply: response.text });

  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
