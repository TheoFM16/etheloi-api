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

    // Se o usuário pedir explicitamente para criar/desenhar uma imagem
    const lowerMsg = (message || '').toLowerCase();
    const isImageRequest = lowerMsg.includes('crie uma imagem') || 
                           lowerMsg.includes('gere uma imagem') || 
                           lowerMsg.includes('desenhe') || 
                           lowerMsg.includes('faça uma imagem') ||
                           lowerMsg.includes('cria uma imagem');

    if (isImageRequest) {
      // Extrai a descrição pedida
      const cleanPrompt = message
        .replace(/(crie|gere|desenhe|faça)\s+(uma\s+)?imagem\s+(de|do|da|sobre)?/gi, '')
        .trim();

      const encodedPrompt = encodeURIComponent(cleanPrompt || "fantasy landscape");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para você!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    let contents = [];

    // Formata o histórico de mensagens antigas
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

    // Processa a imagem enviada na mensagem atual
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma precisa, direta e amigável.
REGRA DE BUSCA: Quando for perguntado sobre fatos reais, jogos, times de futebol, títulos ou notícias, pesquise sempre no Google Search antes de responder.
REGRA DE IMAGENS: Se o usuário te enviar uma imagem anexa na mensagem atual, analisa a imagem detalhadamente e responde às perguntas sobre ela.`
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
