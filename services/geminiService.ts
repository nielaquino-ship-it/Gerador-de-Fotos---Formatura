import { GoogleGenAI, Modality } from "@google/genai";

const key = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!key) {
  console.error("ERRO: GEMINI_API_KEY não encontrada. Certifique-se de configurar a chave no arquivo .env");
}

const ai = new GoogleGenAI({ apiKey: key || '' });

/**
 * Generates a graduation photo by adding a gown and cap to the student's image.
 * @param base64Image The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export async function generateGraduationPhoto(base64Image: string, mimeType: string): Promise<string> {
  try {
    const textPrompt = `Edite esta foto de um estudante. Adicione uma beca de formatura preta com uma faixa azul. Adicione também um capelo (chapéu de formatura) preto na cabeça. O estilo deve ser realista, mantendo o rosto original. MUITO IMPORTANTE: Substitua o fundo original da foto por um fundo de escadaria escura e elegante, com um visual sofisticado, como o de uma universidade ou prédio formal. Não adicione nenhum texto à imagem. Retorne apenas a imagem finalizada.`;

    console.log("Iniciando chamada para a API Gemini...");
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: textPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    console.log("Resposta recebida da API Gemini:", response);

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("Nenhum candidato retornado pela API.");
    }

    const parts = candidates[0].content?.parts;
    if (!parts) {
      throw new Error("Resposta da API não contém partes de conteúdo.");
    }

    let imageData: string | null = null;
    let textResponse: string | null = null;

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
      } else if (part.text) {
        textResponse = part.text;
      }
    }

    if (imageData) {
      return imageData;
    } else if (textResponse) {
      console.warn("A IA retornou texto em vez de uma imagem:", textResponse);
      throw new Error(`A IA não gerou a imagem. Resposta: ${textResponse}`);
    } else {
      throw new Error("A API não retornou uma imagem válida nem uma explicação.");
    }
  } catch (error: any) {
    console.error("Erro detalhado na chamada da API Gemini:", error);
    
    // Tenta extrair uma mensagem mais amigável do erro da API
    const errorMessage = error.message || "Erro desconhecido";
    if (errorMessage.includes("API key not valid")) {
      throw new Error("Chave de API inválida. Verifique se copiou corretamente.");
    } else if (errorMessage.includes("Safety talk")) {
      throw new Error("A imagem foi bloqueada pelos filtros de segurança da IA. Tente outra foto.");
    }
    
    throw new Error(`Não foi possível gerar a imagem: ${errorMessage}`);
  }
}