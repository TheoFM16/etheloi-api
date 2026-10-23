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
    const palavrasChave = ['cria', 'crie', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto'];
    const querImagem = palavrasChave.some(p => lowerMsg.includes(p)) && (lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato'));

    if (querImagem && !image) {
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

    // 2. CONSTRUÇÃO DO HISTÓRICO E MENSAGENS
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

    // 3. CONFIGURAÇÃO SEGURA (Sem forçar ferramenta que dê conflito)
    const config = {
      systemInstruction: "Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma direta, clara e detalhada. Se te perguntarem sobre o SCP-787, responde com base nos relatórios da Fundação SCP (avião Boeing 747-200 Safe encontrado com 515 cadáveres)."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: config
    });

    const textoFinal = response.text || "Opa, ocorreu uma instabilidade. Pode repetir, mestre?";
    res.json({ reply: textoFinal });

  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
