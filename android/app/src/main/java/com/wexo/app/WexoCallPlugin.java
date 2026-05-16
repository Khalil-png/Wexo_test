package com.wexo.app;

import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;
import android.content.Intent;
import android.os.Build;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "WexoCallNative",
    permissions = {
        @Permission(
            alias = "phone",
            strings = {
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_PHONE_NUMBERS,
                Manifest.permission.MANAGE_OWN_CALLS
            }
        )
    }
)
public class WexoCallPlugin extends Plugin {

    private static final String TAG = "WexoCallPlugin";
    private PhoneAccountHandle phoneAccountHandle;
    private static WexoCallPlugin instance;
    private String currentCallId;

    public static WexoCallPlugin getInstance() {
        return instance;
    }

    @Override
    public void load() {
        instance = this;
        registerPhoneAccount();
    }

    private void registerPhoneAccount() {
        Context context = getContext();
        TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
        ComponentName componentName = new ComponentName(context, WexoConnectionService.class);
        
        phoneAccountHandle = new PhoneAccountHandle(componentName, "WexoCallAccount");

        PhoneAccount phoneAccount = PhoneAccount.builder(phoneAccountHandle, "Wexo")
                .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
                .build();

        telecomManager.registerPhoneAccount(phoneAccount);
        Log.d(TAG, "PhoneAccount registered");
    }

    public void onNativeCallAnswered(String name) {
        startForegroundService(name);
        JSObject ret = new JSObject();
        ret.put("action", "answer");
        ret.put("callId", currentCallId);
        notifyListeners("onCallAction", ret);
    }

    public void onNativeCallRejected() {
        stopForegroundService();
        JSObject ret = new JSObject();
        ret.put("action", "reject");
        notifyListeners("onCallAction", ret);
    }

    public void onNativeCallDisconnected() {
        stopForegroundService();
        JSObject ret = new JSObject();
        ret.put("action", "disconnect");
        notifyListeners("onCallAction", ret);
    }

    public void startForegroundService(String callerName) {
        Context context = getContext();
        Intent intent = new Intent(context, CallForegroundService.class);
        intent.putExtra("callerName", callerName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public void stopForegroundService() {
        Context context = getContext();
        Intent intent = new Intent(context, CallForegroundService.class);
        intent.setAction(CallForegroundService.ACTION_STOP_SERVICE);
        context.startService(intent);
    }

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String name = call.getString("name", "Inconnu");
        String number = call.getString("number", "0000");
        String callId = call.getString("callId", "");
        this.currentCallId = callId;

        try {
            Context context = getContext();
            TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);

            // Create notification channel
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                NotificationChannel channel = new NotificationChannel("wexo_calls_channel", "Appels entrants", NotificationManager.IMPORTANCE_HIGH);
                channel.setImportance(NotificationManager.IMPORTANCE_HIGH);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                }
            }

            // Full-screen intent
            Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
            fullScreenIntent.putExtra("callerName", name);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                    context, 0, fullScreenIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "wexo_calls_channel")
                    .setSmallIcon(android.R.drawable.ic_menu_call)
                    .setContentTitle(name)
                    .setContentText("Appel entrant...")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setAutoCancel(false)
                    .setOngoing(true)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setFullScreenIntent(fullScreenPendingIntent, true);

            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.notify(2026, builder.build());
            }

            Bundle extras = new Bundle();
            Uri uri = Uri.fromParts("tel", number, null);
            
            // CRUCIAL: Passer le PhoneAccountHandle dans les extras
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle);
            extras.putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, uri);
            
            Bundle incomingCallExtras = new Bundle();
            incomingCallExtras.putString("caller_name", name);
            extras.putBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, incomingCallExtras);

            telecomManager.addNewIncomingCall(phoneAccountHandle, extras);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error adding incoming call", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void startOutgoingCall(PluginCall call) {
        String name = call.getString("name", "Inconnu");
        String number = call.getString("number", "0000");

        try {
            Context context = getContext();
            TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            
            Bundle extras = new Bundle();
            Uri uri = Uri.fromParts("tel", number, null);
            
            // CRUCIAL: Associer l'appel sortant à notre compte
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle);
            
            Bundle outgoingExtras = new Bundle();
            outgoingExtras.putString("caller_name", name);
            extras.putBundle(TelecomManager.EXTRA_OUTGOING_CALL_EXTRAS, outgoingExtras);
            
            telecomManager.placeCall(uri, extras);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error placing outgoing call", e);
            call.reject(e.getMessage());
        }
    }
}
