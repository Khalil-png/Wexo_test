addEventListener('checkStatus', async (event) => {
  console.log('Background check: Checking for calls and notifications...');
  // Note: Ce script tourne périodiquement même quand l'app est fermée
  // Il est recommandé d'utiliser Firebase Cloud Messaging pour une réactivité instantanée
  
  // Exemple de notification locale si on détecte quelque chose (pseudo-code)
  // await self.notifications.schedule({
  //   title: 'Nouveau message',
  //   body: 'Vous avez reçu un nouveau message sur Wexo',
  //   id: 1
  // });
});
