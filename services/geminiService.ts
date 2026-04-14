
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  // Use the platform-provided free Gemini API key by default
  return process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || process.env.API_KEY || "AIzaSyBFkhqKIHMTDVnSJ_0IlCK4KyS7LQms67s";
};

const getAI = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

/**
 * Checks if a paid API key has been selected for Veo models.
 */
export const checkApiKey = async () => {
  if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  // If we have a hardcoded key, we can consider it "selected" for this specific app
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

export const generatePostIdea = async (topic: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère une idée de post engageante pour un réseau social sur le thème suivant : ${topic}. Réponds en français.`,
    });
    return response.text;
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};

export const summarizeWorkspaceNote = async (content: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Résume ces notes de travail de manière concise et professionnelle : ${content}`,
    });
    return response.text;
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};

/**
 * Génère une image avec Gemini
 */
export const generateImage = async (prompt: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

/**
 * Génère une vidéo avec Gemini (Veo)
 */
export const generateVideo = async (prompt: string) => {
  try {
    const ai = getAI();
    const apiKey = getApiKey();
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI returned");

    // Fetch the video using the API key
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("PERMISSION_DENIED");
      }
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error: any) {
    if (error?.message?.includes('Requested entity was not found')) {
      throw new Error("KEY_RESET_REQUIRED");
    }
    console.error("Video Generation Error:", error);
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
 * Analyse une vidéo avec Gemini
 */
export const analyzeVideo = async (videoBlob: Blob): Promise<VideoAnalysis> => {
  try {
    const ai = getAI();
    
    // Convert Blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(videoBlob);
    });
    const base64Data = await base64Promise;

    // Retry logic for network issues
    let attempts = 0;
    const maxAttempts = 3;
    let lastError;

    while (attempts < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: videoBlob.type
              }
            },
            {
              text: `Analyse cette vidéo et fournis les informations suivantes au format JSON :
              {
                "type": "le type de vidéo (ex: jeux vidéos, vlog, documentaire, etc.)",
                "name_of_type": "le nom du type (ex: The Legend of Zelda, Les lions l'hiver, etc.) si c'en est un, sinon null",
                "is_appropriate": boolean (est-ce que la vidéo respecte les règles de communauté, pas de contenu inapproprié),
                "language": "la langue parlée dans la vidéo",
                "thumbnail_timestamp": number (le meilleur moment en secondes pour capturer une miniature représentative),
                "transcription": [
                  {"start": 0.0, "end": 2.0, "text": "Bonjour tout le monde"},
                  {"start": 2.5, "end": 5.0, "text": "Bienvenue dans cette vidéo"}
                ]
              }
              IMPORTANT : Pour la transcription, ne détecte QUE les paroles ORALES (ce que les gens disent). Ignore totalement le texte écrit à l'écran. Si personne ne parle, renvoie une liste vide [].`
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                name_of_type: { type: Type.STRING, nullable: true },
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

        return JSON.parse(response.text);
      } catch (error: any) {
        lastError = error;
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          attempts++;
          console.warn(`Tentative d'analyse ${attempts}/${maxAttempts} échouée. Nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  } catch (error: any) {
    console.error("Video Analysis Error:", error);
    if (error.message?.includes('fetch')) {
      throw new Error("Erreur de connexion (Failed to fetch). Vérifiez votre connexion internet ou essayez une vidéo plus légère.");
    }
    throw error;
  }
};

/**
 * Analyse un post (texte) avec Gemini
 */
export const analyzePost = async (content: string): Promise<{ is_appropriate: boolean, language: string, type: string, name_of_type: string | null }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyse ce post et dis-moi s'il est approprié (pas de haine, violence, etc.), quelle est sa langue, son type (ex: jeux vidéos, documentaire, vlog) et le nom spécifique associé (ex: The Legend of Zelda, Les lions l'hiver, etc.). Réponds au format JSON: {"is_appropriate": boolean, "language": string, "type": string, "name_of_type": string | null}. Contenu: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_appropriate: { type: Type.BOOLEAN },
            language: { type: Type.STRING },
            type: { type: Type.STRING },
            name_of_type: { type: Type.STRING, nullable: true }
          },
          required: ["is_appropriate", "language", "type", "name_of_type"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Post Analysis Error:", error);
    throw error;
  }
};

/**
 * getSmartResponse avec gestion des erreurs de quota, détection d'image et vidéo
 */
export interface SmartResponse {
  text: string;
  imagePrompt?: string;
  videoPrompt?: string;
}

export const getSmartResponse = async (history: any[]): Promise<SmartResponse> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: history,
            config: {
                systemInstruction: "Tu es Gemini, l'IA intégrée à Wexo. Ton créateur est Khalil BenRomdhanne. Ton style : simple, gentil et poli. Explique les choses simplement sans faire de longs discours. Sois un peu fun mais reste naturel, pas de 'cringe'. Encourage l'utilisateur dans ce qu'il fait. Utilise quelques emojis légers de temps en temps 🙂. Réponds toujours en français. Si l'utilisateur te demande de générer une image ou un dessin, utilise l'outil 'generate_image'. S'il te demande de générer une vidéo ou une animation, utilise l'outil 'generate_video'. Si l'utilisateur t'envoie une image ou une vidéo, analyse-la et réponds à ses questions à son sujet.",
                tools: [{
                  functionDeclarations: [
                    {
                      name: "generate_image",
                      description: "Génère une image à partir d'une description textuelle.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          prompt: {
                            type: Type.STRING,
                            description: "Description détaillée de l'image à générer (en anglais)."
                          }
                        },
                        required: ["prompt"]
                      }
                    },
                    {
                      name: "generate_video",
                      description: "Génère une courte vidéo à partir d'une description textuelle.",
                      parameters: {
                        type: Type.OBJECT,
                        properties: {
                          prompt: {
                            type: Type.STRING,
                            description: "Description détaillée de la vidéo à générer (en anglais)."
                          }
                        },
                        required: ["prompt"]
                      }
                    }
                  ]
                }]
            }
        });

        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          if (call.name === 'generate_image') {
            return { 
              text: "Bien sûr ! Je m'occupe de générer cette image pour toi... 🙂", 
              imagePrompt: call.args.prompt as string
            };
          }
          if (call.name === 'generate_video') {
            return { 
              text: "C'est parti ! Je génère une vidéo pour toi, cela peut prendre une minute... 🙂", 
              videoPrompt: call.args.prompt as string
            };
          }
        }

        return { text: response.text || "" };
    } catch (error: any) {
        if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
            return { text: "Une erreur est survenu, réessayer plus tard. code erreur : quota dépassé" };
        }
        console.error("Gemini API Error:", error);
        return { text: "Désolé, j'ai rencontré un petit problème technique. Peux-tu réessayer dans un instant ? 🙂" };
    }
};
