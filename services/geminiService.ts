
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // If not in environment, check if user provided one in secrets or hasSelectedApiKey
    // For now, we'll assume it's in process.env.GEMINI_API_KEY as per skill
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Checks if a paid API key has been selected for higher tier models.
 */
export const checkApiKey = async () => {
  if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return true; 
};

/**
 * Opens the API key selection dialog.
 */
export const openKeySelector = async () => {
  if (typeof (window as any).aistudio?.openSelectKey === 'function') {
    await (window as any).aistudio.openSelectKey();
    // After selection, we usually proceed
  }
};

/**
 * Génère une idée de post
 */
export const generatePostIdea = async (topic: string) => {
  const prompt = `Génère une idée de post engageante pour un réseau social sur le thème suivant : ${topic}. Réponds en français.`;
  
  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
    });
    return result.text;
  } catch (error: any) {
    console.error("Generate Post Idea Error:", error);
    if (error?.message?.includes('429')) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};

/**
 * Résume une note de travail
 */
export const summarizeWorkspaceNote = async (content: string) => {
  const prompt = `Résume ces notes de travail de manière concise et professionnelle : ${content}`;
  
  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
    });
    return result.text;
  } catch (error: any) {
    console.error("Summarize Note Error:", error);
    if (error?.message?.includes('429')) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};

/**
 * Génère une image avec Gemini
 */
export const generateImage = async (prompt: string) => {
    try {
      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: { parts: [{ text: prompt }] }
      });
      
      for (const part of (result as any).candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return "";
    } catch (error) {
      console.error("Generate Image Error:", error);
      throw error;
    }
};

/**
 * Génère une vidéo avec Gemini (Veo)
 */
export const generateVideo = async (prompt: string) => {
    try {
      const ai = getAI();
      let operation = await (ai.models as any).generateVideos({
        model: 'veo-2.0-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // Polling for completion would normally happen in the component or via a handler
      // This is a simplified service call.
      return operation;
    } catch (error) {
      console.error("Generate Video Error:", error);
      throw error;
    }
};

export interface VideoAnalysis {
  type: string;
  name_of_type?: string | null;
  is_appropriate: boolean;
  language: string;
  thumbnail_timestamp: number;
  transcription?: { start: number, end: number, text: string }[] | null;
}

/**
 * Analyse une vidéo
 */
export const analyzeVideo = async (videoBlob: Blob): Promise<VideoAnalysis> => {
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(videoBlob);
    });
    const base64Data = await base64Promise;

    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType: videoBlob.type } },
          { text: `Analyse cette vidéo et fournis les informations suivantes au format JSON :
            {
              "type": "le type de vidéo (ex: jeux vidéos, vlog, documentaire, etc.)",
              "name_of_type": "le nom du type (ex: The Legend of Zelda, Les lions l'hiver, etc.) si c'en est un, sinon null",
              "is_appropriate": boolean,
              "language": "la langue parlée",
              "thumbnail_timestamp": number,
              "transcription": [{"start": number, "end": number, "text": string}]
            }` 
          }
        ]
      }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            name_of_type: { type: Type.STRING, nullable: true } as any,
            is_appropriate: { type: Type.BOOLEAN },
            language: { type: Type.STRING },
            thumbnail_timestamp: { type: Type.NUMBER },
            transcription: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.NUMBER },
                  end: { type: Type.NUMBER },
                  text: { type: Type.STRING }
                },
                required: ["start", "end", "text"]
              }
            }
          },
          required: ["type", "name_of_type", "is_appropriate", "language", "thumbnail_timestamp", "transcription"]
        }
      }
    });
    return JSON.parse(result.text || "{}");
  } catch (error: any) {
    console.error("Video Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyse un post
 */
export const analyzePost = async (content: string) => {
  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyse ce post et dis-moi s'il est approprié, quelle est sa langue, son type et le nom spécifique. Réponds au format JSON: {"is_appropriate": boolean, "language": string, "type": string, "name_of_type": string | null}. Contenu: ${content}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_appropriate: { type: Type.BOOLEAN },
            language: { type: Type.STRING },
            type: { type: Type.STRING },
            name_of_type: { type: Type.STRING, nullable: true } as any
          },
          required: ["is_appropriate", "language", "type", "name_of_type"]
        }
      }
    });
    return result.text ? JSON.parse(result.text) : {};
  } catch (error: any) {
    console.error("Post Analysis Error:", error);
    throw error;
  }
};

export interface SmartResponse {
  text: string;
  imagePrompt?: string;
  videoPrompt?: string;
  isError?: boolean;
  errorDetails?: string;
}

export const getSmartResponse = async (history: any[]): Promise<SmartResponse> => {
    try {
        const systemInstruction = "Tu es Gemini, l'IA intégrée à Wexo. Ton créateur est Khalil BenRomdhane. Ton style : simple, gentil et poli. Explique les choses simplement. Encourage l'utilisateur. Utilise des emojis 🙂. Réponds toujours en français. Pour les images, utilise 'generate_image'. Pour les vidéos, utilise 'generate_video'.";
        
        const ai = getAI();
        const result = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: history.map(h => ({
            role: (h.role === 'model' ? 'model' : 'user') as "user" | "model",
            parts: h.parts.map((p: any) => {
              if (p.inlineData) return { inlineData: p.inlineData };
              return { text: p.text || "" };
            })
          })),
          config: {
            systemInstruction: systemInstruction,
            tools: [{
              functionDeclarations: [
                {
                  name: "generate_image",
                  description: "Génère une image.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING, description: "Description détaillée." }
                    },
                    required: ["prompt"]
                  }
                },
                {
                  name: "generate_video",
                  description: "Génère une vidéo.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING, description: "Description détaillée." }
                    },
                    required: ["prompt"]
                  }
                }
              ]
            }] as any
          }
        });
        
        const responseText = result.text || "";
        const functionCall = result.functionCalls ? result.functionCalls[0] : null;

        if (!responseText && !functionCall) {
            throw new Error("Réponse vide de Gemini.");
        }

        if (functionCall) {
          const args = functionCall.args as any;
          if (functionCall.name === 'generate_image') {
            return { text: "Bien sûr ! Je m'occupe de générer cette image pour toi... 🙂", imagePrompt: args.prompt };
          }
          if (functionCall.name === 'generate_video') {
            return { text: "C'est parti ! Je génère une vidéo pour toi... 🙂", videoPrompt: args.prompt };
          }
        }

        return { text: responseText };
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('429')) {
            return { text: "Désolé, j'ai atteint ma limite de messages. Réessaye plus tard ! 🙂", isError: true, errorDetails: "QUOTA_EXCEEDED" };
        }
        return { text: "Désolé, j'ai eu un petit problème technique. Peux-tu réessayer dans un instant ? 🙂", isError: true, errorDetails: errorMessage };
    }
};
