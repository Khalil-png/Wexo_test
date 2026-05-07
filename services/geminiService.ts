
import { GoogleGenAI, Type } from "@google/genai";

const API_KEYS = {
  analysis: "AIzaSyBFkhqKIHMTDVnSJ_0IlCK4KyS7LQms67s",
  chat: "AIzaSyAs6XB3NsJY0hxCM-XqzScq8zu3tFvXADg"
};

const getAI = (type: 'analysis' | 'chat' = 'analysis') => {
  return new GoogleGenAI({ apiKey: API_KEYS[type] });
};

/**
 * Checks if a paid API key has been selected for Veo models.
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
      model: "models/gemini-1.5-flash",
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
      model: "models/gemini-1.5-flash",
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
    // Géré via function calling dans getSmartResponse
    return ""; 
};

/**
 * Génère une vidéo avec Gemini (Veo)
 */
export const generateVideo = async (prompt: string) => {
    return null;
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
      model: "models/gemini-1.5-flash",
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
      config: { responseMimeType: "application/json" }
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
    const prompt = `Analyse ce post et dis-moi s'il est approprié, quelle est sa langue, son type et le nom spécifique. Réponds au format JSON: {"is_appropriate": boolean, "language": string, "type": string, "name_of_type": string | null}. Contenu: ${content}`;
    
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
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
        
        const ai = getAI('chat');
        const result = await ai.models.generateContent({
          model: "models/gemini-1.5-flash",
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
                    type: Type.OBJECT as any,
                    properties: {
                      prompt: { type: Type.STRING as any, description: "Description détaillée." }
                    },
                    required: ["prompt"]
                  }
                },
                {
                  name: "generate_video",
                  description: "Génère une vidéo.",
                  parameters: {
                    type: Type.OBJECT as any,
                    properties: {
                      prompt: { type: Type.STRING as any, description: "Description détaillée." }
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
        return { text: "Désolé, j'ai eu un petit problème technique. On réessaie ? 🙂", isError: true, errorDetails: errorMessage };
    }
};
