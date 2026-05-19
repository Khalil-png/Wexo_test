package com.wexo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

public class CallForegroundService extends Service {
    private static final String CHANNEL_ID = "wexo_calls_channel_v2";
    public static final String ACTION_STOP_SERVICE = "STOP_SERVICE";
    public static final String ACTION_START_INCOMING = "START_INCOMING";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_SERVICE.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String callerName = intent != null ? intent.getStringExtra("callerName") : "Inconnu";
        boolean isIncoming = intent != null && ACTION_START_INCOMING.equals(intent.getAction());
        
        createNotificationChannel();

        // Intent pour ouvrir l'activité plein écran
        Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 0, fullScreenIntent, 
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Intent pour le bouton Raccrocher (Broadcast)
        Intent hangupIntent = new Intent(this, CallActionReceiver.class);
        hangupIntent.setAction("ACTION_HANGUP");
        PendingIntent hangupPendingIntent = PendingIntent.getBroadcast(
                this, 0, hangupIntent, 
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Intent pour Répondre (si c'est un appel entrant dans la notification)
        Intent answerIntent = new Intent(this, MainActivity.class); // Ou un receiver spécifique
        PendingIntent answerPendingIntent = PendingIntent.getActivity(
                this, 1, answerIntent, 
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Person person = new Person.Builder()
                .setName(callerName)
                .setImportant(true)
                .build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(callerName)
                .setContentText(isIncoming ? "Appel entrant..." : "Appel en cours...")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setOngoing(true);

        if (isIncoming) {
            builder.setStyle(NotificationCompat.CallStyle.forIncomingCall(person, hangupPendingIntent, answerPendingIntent));
        } else {
            builder.setStyle(NotificationCompat.CallStyle.forOngoingCall(person, hangupPendingIntent));
        }

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(101, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
        } else {
            startForeground(101, notification);
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Appels Wexo",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(null, null); // Géré par le système ou TelecomManager
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
