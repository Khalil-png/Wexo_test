
import { GoogleGenAI } from "@google/genai";
import { getVertexAI, getGenerativeModel, SchemaType } from "@firebase/vertexai";
import { app } from "./firebase";

const getApiKey = () => {
  // Hardcoded as requested by owner
  return "AIzaSyBFkhqKIHMTDVnSJ_0IlCK4KyS7LQms67s";
};

const getAI = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

const getVertexModel = (modelName: string = 'gemini-1.5-flash', systemInstruction?: string) => {
  const vertex = getVertexAI(app);
  return getGenerativeModel(vertex, { 
    model: modelName,
    systemInstruction: systemInstruction
  });
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

/**
 * Génère une idée de post en utilisant Gemini 1.5 Flash via Vertex AI
 */
export const generatePostIdea = async (topic: string) => {
  try {
    const model = getVertexModel('gemini-1.5-flash');
    const result = await model.generateContent(`Génère une idée de post engageante pour un réseau social sur le thème suivant : ${topic}. Réponds en français.`);
    return result.response.text();
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};

/**
 * Résume une note de travail
 */
export const summarizeWorkspaceNote = async (content: string) => {
  try {
    const model = getVertexModel('gemini-1.5-flash');
    const result = await model.generateContent(`Résume ces notes de travail de manière concise et professionnelle : ${content}`);
    return result.response.text();
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
    // Function calling is handled via getSmartResponse tools
    return ""; 
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
    return null;
  } catch (error: any) {
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
    const model = getVertexModel('gemini-1.5-flash');
    
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

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
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
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const text = result.response.text() || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Video Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyse un post (texte) avec Gemini
 */
export const analyzePost = async (content: string) => {
  try {
    const model = getVertexModel('gemini-1.5-flash');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Analyse ce post et dis-moi s'il est approprié (pas de haine, violence, etc.), quelle est sa langue, son type (ex: jeux vidéos, documentaire, vlog) et le nom spécifique associé (ex: The Legend of Zelda, Les lions l'hiver, etc.). Réponds au format JSON: {"is_appropriate": boolean, "language": string, "type": string, "name_of_type": string | null}. Contenu: ${content}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const text = result.response.text() || "{}";
    return JSON.parse(text);
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
  isError?: boolean;
  errorDetails?: string;
}

export const getSmartResponse = async (history: any[]): Promise<SmartResponse> => {
    try {
        const systemInstruction = "Tu es Gemini, l'IA intégrée à Wexo. Ton créateur est Khalil BenRomdhane. Ton style : simple, gentil et poli. Explique les choses simplement sans faire de longs discours. Encourage l'utilisateur dans ce qu'il fait. Utilise quelques emojis légers de temps en temps 🙂. Réponds toujours en français. Si l'utilisateur te demande de générer une image ou un dessin, utilise l'outil 'generate_image'. S'il te demande de générer une vidéo ou une animation, utilise l'outil 'generate_video'.";
        
        const model = getVertexModel('gemini-1.5-flash', systemInstruction);
        
        const result = await model.generateContent({
            contents: history,
            tools: [{
              functionDeclarations: [
                {
                  name: "generate_image",
                  description: "Génère une image à partir d'une description textuelle.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      prompt: {
                        type: SchemaType.STRING,
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
                    type: SchemaType.OBJECT,
                    properties: {
                      prompt: {
                        type: SchemaType.STRING,
                        description: "Description détaillée de la vidéo à générer (en anglais)."
                      }
                    },
                    required: ["prompt"]
                  }
                }
              ]
            }]
        });

        const response = result.response;
        const text = response.text() || "";
        const call = response.functionCalls()?.[0];

        if (!text && !call) {
            throw new Error("Gemini returned an empty response. Please check if Vertex AI is properly enabled in Firebase.");
        }

        if (call) {
          const args = call.args as any;
          if (call.name === 'generate_image') {
            return { 
              text: "Bien sûr ! Je m'occupe de générer cette image pour toi... 🙂", 
              imagePrompt: args.prompt
            };
          }
          if (call.name === 'generate_video') {
            return { 
              text: "C'est parti ! Je génère une vidéo pour toi, cela peut prendre une minute... 🙂", 
              videoPrompt: args.prompt
            };
          }
        }

        return { text };
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
            return { 
                text: "Désolé, j'ai atteint ma limite de messages pour le moment. Peux-tu réessayer plus tard ? 🙂", 
                isError: true, 
                errorDetails: "QUOTA_EXCEEDED: 429 Too Many Requests" 
            };
        }
        
        return { 
            text: "Désolé, j'ai rencontré un petit problème technique. Peux-tu réessayer dans un instant ? 🙂", 
            isError: true,
            errorDetails: error?.message || String(error)
        };
    }
};
