import CryptoJS from 'crypto-js';

// NOTE: Dans une application de production réelle, cette clé ne devrait pas être en dur.
// Elle pourrait être générée par utilisateur, dérivée d'un mot de passe, ou récupérée via un processus d'échange de clés sécurisé.
const ENCRYPTION_SECRET = "wexo-secure-vault-2024-khalil-benromdhane";

/**
 * Chiffre une chaîne de caractères en AES
 */
export const encryptMessage = (text: string): string => {
  if (!text) return text;
  // On retourne directement le résultat AES (qui ressemble à des caractères aléatoires base64)
  return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
};

/**
 * Déchiffre une chaîne de caractères AES
 */
export const decryptMessage = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  
  // Si le message commence par "ENC:", on l'enlève pour la compatibilité avec les anciens messages
  let dataToDecrypt = encryptedText;
  if (encryptedText.startsWith("ENC:")) {
    dataToDecrypt = encryptedText.substring(4);
  }

  try {
    const bytes = CryptoJS.AES.decrypt(dataToDecrypt, ENCRYPTION_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // Si la sortie est vide, cela signifie probablement que ce n'était pas un message chiffré valide (ou mauvaise clé)
    if (!decrypted) return encryptedText; 
    return decrypted;
  } catch (error) {
    // Si erreur, c'est probablement du texte brut non chiffré
    return encryptedText;
  }
};
