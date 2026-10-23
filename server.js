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

    // 1. GERADOR DE IMAGENS AUTOMÁTICO (Pollinations AI)
    const lowerMsg = (message || '').toLowerCase();
    const isImageRequest = lowerMsg.includes('crie uma imagem') || 
                           lowerMsg.includes('cria uma imagem') || 
                           lowerMsg.includes('gere uma imagem') || 
                           lowerMsg.includes('gerar imagem') || 
                           lowerMsg.includes('desenhe') || 
                           lowerMsg.includes('faça uma imagem');

    if (isImageRequest) {
      const cleanPrompt = message
        .replace(/(crie|cria|gere|gerar|desenhe|faça)\s+(uma\s+)?imagem\s+(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();

      const encodedPrompt = encodeURIComponent(cleanPrompt || "anime duck");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para ti!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CONSTRUÇÃO DO CONTEÚDO
    let contents = [];

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

    // 3. CONFIGURAÇÃO DA IA (Evita conflito de tools com imagens)
    const config = {
      systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma precisa, direta e amigável. Se houver uma imagem anexa, analisa-a e descreve-a com detalhe."
    };

    // Ativa a busca no Google APENAS quando não houver imagem anexa (evita o erro 'Tool choice is none')
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
