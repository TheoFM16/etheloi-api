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

    // Palavras que ativam o gerador de imagens
    const palavrasGeração = ['imagem', 'foto', 'desenho', 'ilustração', 'desenhe', 'crie', 'cria', 'gere', 'gerar', 'faça'];
    const querGerarImagem = palavrasGeração.some(palavra => lowerMsg.includes(palavra)) && 
                           (lowerMsg.includes('crie') || lowerMsg.includes('cria') || lowerMsg.includes('gere') || lowerMsg.includes('desenhe') || lowerMsg.includes('faça') || lowerMsg.includes('foto') || lowerMsg.includes('imagem'));

    // 1. GERADOR DE IMAGENS (Pollinations AI)
    if (querGerarImagem && !image) {
      // Limpa o texto para pegar só a descrição (ex: "pato com cabelo de anime")
      const cleanPrompt = message
        .replace(/(crie|cria|gere|gerar|desenhe|faça|mostre)\s+(uma|um)?\s*(foto|imagem|desenho|ilustração)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();

      const promptFinal = cleanPrompt || message;
      const encodedPrompt = encodeURIComponent(promptFinal);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para ti!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CONSTRUÇÃO DO CONTEÚDO PARA A IA
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

    // Recebe a imagem em Base64 enviada pelo frontend
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

    // 3. CONFIGURAÇÃO DA IA
    const config = {
      systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma precisa, direta e amigável. Se houver uma imagem anexa, analisa-a com bastante detalhe e explica o que está nela."
    };

    // Ativa a busca no Google apenas se NÃO houver imagem anexa (evita conflitos de SDK)
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
