
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * getSmartResponse avec gestion des erreurs de quota
 */
export const getSmartResponse = async (history: any[]) => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: history,
            config: {
                systemInstruction: "Tu es Gemini, l'IA intégrée à Wexo. Ton créateur est Khalil BenRomdhanne. Ton style : simple, gentil et poli. Explique les choses simplement sans faire de longs discours. Sois un peu fun mais reste naturel, pas de 'cringe'. Encourage l'utilisateur dans ce qu'il fait. Utilise quelques emojis légers de temps en temps 🙂. Réponds toujours en français."
            }
        });
        return response.text;
    } catch (error: any) {
        // Détection de l'erreur 429 (Rate Limit / Quota)
        if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
            return "Oups ! Je reçois un peu trop de messages en ce moment et j'ai besoin de reprendre mon souffle. 🧘‍♂️ Attends une petite minute avant de me reparler, je serai de nouveau prête à t'aider ! 🙂";
        }
        console.error("Gemini API Error:", error);
        return "Désolé, j'ai rencontré un petit problème technique. Peux-tu réessayer dans un instant ? 🙂";
    }
};
