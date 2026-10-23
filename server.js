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
    const lowerMsg = (message || '').toLowerCase();

    // 1. GERADOR DE IMAGENS (Pollinations AI)
    const acoes = ['crie', 'cria', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto'];
    const querCriar = acoes.some(palavra => lowerMsg.includes(palavra)) && (lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato'));

    if (querCriar && !image) {
      const cleanPrompt = message
        .replace(/(crie|cria|gere|gerar|desenhe|faça|faca|mostre|tu consegue criar)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();

      const promptFinal = cleanPrompt || message;
      const encodedPrompt = encodeURIComponent(promptFinal);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para ti!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CONSTRUÇÃO DO CONTEÚDO
    let contents = [];
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

    const config = {
      systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde em Português. Se houver uma imagem anexa, analisa-a em detalhe."
    };

    if (!image) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: config
    });

    res.json({ reply: response.text });

  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});
