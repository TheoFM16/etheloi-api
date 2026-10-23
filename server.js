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

    // Formata o histórico antigo apenas como texto simples
    if (history && Array.isArray(history)) {
      history.forEach(item => {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content || '' }]
        });
      });
    }

    // Parte atual (Texto + Imagem se houver)
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

    contents.push({
      role: 'user',
      parts: currentParts
    });

    // Chamada oficial da API do Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }], // Busca na web integrada
        systemInstruction: "Você é o Etheloi, uma IA criada pelo Theo. Seja direto, amigável e ajude com tecnologia e jogos."
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