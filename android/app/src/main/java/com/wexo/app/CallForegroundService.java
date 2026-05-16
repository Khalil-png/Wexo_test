package com.wexo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

public class CallForegroundService extends Service {
    private static final String TAG = "CallForegroundService";
    private static final String CHANNEL_ID = "channel_appels_wexo";
    public static final String ACTION_STOP_SERVICE = "STOP_SERVICE";

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
        createNotificationChannel();

        // PendingIntent for clicking notification (opens app)
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 0, fullScreenIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // PendingIntent for Hangup button
        Intent hangupIntent = new Intent(this, CallActionReceiver.class);
        hangupIntent.setAction("ACTION_HANGUP");
        PendingIntent hangupPendingIntent = PendingIntent.getBroadcast(
                this, 0, hangupIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Person caller = new Person.Builder()
                .setName(callerName)
                .setImportant(true)
                .build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_call) // Default system icon
                .setContentTitle(callerName)
                .setContentText("Appel en cours...")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setOngoing(true)
                .setStyle(
                    NotificationCompat.CallStyle.forOngoingCall(caller, hangupPendingIntent)
                );

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
                    "Appels en cours",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notification pour les appels actifs");
            channel.setSound(null, null); // No default notification sound
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
