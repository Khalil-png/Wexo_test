addEventListener('checkStatus', async (event) => {
  console.log('[BackgroundRunner] Checking for notifications...');

  try {
    // 1. Get auth info from Preferences
    const { value } = await Capacitor.Plugins.Preferences.get({ key: 'pb_auth' });
    if (!value) {
      console.log('[BackgroundRunner] No auth found, skipping check.');
      return;
    }

    const auth = JSON.parse(value);
    const { token, model } = auth;
    
    if (!token || !model?.id) {
       console.log('[BackgroundRunner] Invalid auth data.');
       return;
    }

    // 2. Fetch pending notifications from PocketBase
    // Correct URL handling (using fallback if needed)
    const pbUrl = 'https://carnote.synology.me:9443';
    const filter = encodeURIComponent(`user_id="${model.id}" && status="pending"`);
    const url = `${pbUrl}/api/collections/notifications/records?filter=${filter}&sort=-created&limit=5`;

    const response = await fetch(url, {
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      console.log('[BackgroundRunner] Failed to fetch notifications:', response.status);
      return;
    }

    const data = await response.json();
    const notifications = data.items || [];

    if (notifications.length === 0) {
      console.log('[BackgroundRunner] No new notifications.');
      return;
    }

    console.log(`[BackgroundRunner] Found ${notifications.length} new notifications!`);

    // 3. Schedule local notifications for each new item
    for (const notif of notifications) {
      await Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            title: notif.title || 'Wexo Social',
            body: notif.content || 'Nouvelle notification',
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            channelId: notif.type === 'message' ? 'messages' : 'default',
            extra: {
              notifId: notif.id,
              type: notif.type,
              senderId: notif.sender_id
            }
          }
        ]
      });

      // 4. Mark as delivered so we don't notify again in the next cycle
      const updateUrl = `${pbUrl}/api/collections/notifications/records/${notif.id}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
      });
    }

    console.log('[BackgroundRunner] Check complete, notifications scheduled.');
  } catch (err) {
    console.error('[BackgroundRunner] Error in background check:', err);
  }
});
