import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a graduation photo by adding a gown and cap to the student's image.
 * @param base64Image The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export async function generateGraduationPhoto(base64Image: string, mimeType: string): Promise<string> {
  try {
    const textPrompt = `Edite esta foto de um estudante. Adicione uma beca de formatura preta com uma faixa azul. Adicione também um capelo (chapéu de formatura) preto na cabeça. O estilo deve ser realista, mantendo o rosto original. MUITO IMPORTANTE: Substitua o fundo original da foto por um fundo de escadaria escura e elegante, com um visual sofisticado, como o de uma universidade ou prédio formal. Não adicione nenhum texto à imagem. Retorne apenas a imagem finalizada.`;

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

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];

    if (firstPart && firstPart.inlineData) {
      return firstPart.inlineData.data;
    } else {
      throw new Error("A API não retornou uma imagem válida.");
    }
  } catch (error) {
    console.error("Erro na chamada da API Gemini:", error);
    throw new Error("Não foi possível gerar a imagem. Verifique o console para mais detalhes.");
  }
}