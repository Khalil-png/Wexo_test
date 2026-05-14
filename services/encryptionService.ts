import CryptoJS from 'crypto-js';

// NOTE: Dans une application de production réelle, cette clé ne devrait pas être en dur.
// Elle pourrait être générée par utilisateur, dérivée d'un mot de passe, ou récupérée via un processus d'échange de clés sécurisé.
const ENCRYPTION_SECRET = "wexo-secure-vault-2024-khalil-benromdhane";

/**
 * Chiffre une chaîne de caractères en AES
 */
export const encryptMessage = (text: string): string => {
  if (!text) return text;
  // On ajoute un préfixe pour identifier les messages chiffrés
  return "ENC:" + CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
};

/**
 * Déchiffre une chaîne de caractères AES
 */
export const decryptMessage = (encryptedText: string): string => {
  if (!encryptedText || !encryptedText.startsWith("ENC:")) return encryptedText;
  
  try {
    const rawData = encryptedText.substring(4); // On enlève le préfixe "ENC:"
    const bytes = CryptoJS.AES.decrypt(rawData, ENCRYPTION_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) return rawData; // Retourne le texte chiffré brut (caractères aléatoires) si échec
    return decrypted;
  } catch (error) {
    console.error("Erreur de déchiffrement:", error);
    return encryptedText.substring(4); // Idem ici
  }
};
