import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. INTERCEPTADOR OBRIGATÓRIO DE GERAÇÃO DE IMAGEM
    const palavrasChave = ['cria', 'crie', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto'];
    const querImagem = palavrasChave.some(p => lowerMsg.includes(p));

    if (querImagem && !image) {
      // Limpa os comandos para deixar só o assunto (ex: "pato")
      let promptLimpo = message
        .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();

      if (!promptLimpo) promptLimpo = message;

      const encodedPrompt = encodeURIComponent(promptLimpo);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para ti!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. PROCESSAMENTO NORMAL DE CHAT E ANÁLISE DE IMAGEM
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

    const config = {
      systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português. Se houver uma imagem anexa, analisa o que está nela em detalhe."
    };

    if (!image) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: currentParts }],
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
  console.log(`Servidor rodando na porta ${PORT}`);
});
