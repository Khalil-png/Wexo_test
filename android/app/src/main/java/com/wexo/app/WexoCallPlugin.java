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
    private WexoConnection currentConnection;

    public static WexoCallPlugin getInstance() {
        return instance;
    }

    public void setCurrentConnection(WexoConnection connection) {
        this.currentConnection = connection;
    }

    @Override
    public void load() {
        instance = this;
        registerPhoneAccount();
    }

    @PluginMethod
    public void checkAndRequestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = {
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_PHONE_NUMBERS,
                Manifest.permission.MANAGE_OWN_CALLS,
                Manifest.permission.RECORD_AUDIO
            };
            requestPermissions(call);
        } else {
            call.resolve();
        }
    }

    private void registerPhoneAccount() {
        Context context = getContext();
        TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
        if (telecomManager == null) return;

        ComponentName componentName = new ComponentName(context, WexoConnectionService.class);
        phoneAccountHandle = new PhoneAccountHandle(componentName, "WexoCallAccount");

        PhoneAccount phoneAccount = PhoneAccount.builder(phoneAccountHandle, "Wexo")
                .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
                .build();

        telecomManager.registerPhoneAccount(phoneAccount);
        Log.d(TAG, "PhoneAccount registered");
    }

    private static final int NOTIFICATION_ID = 2026;
    private static final String CHANNEL_ID = "wexo_calls_channel";

    public void onNativeCallAnswered(String name) {
        cancelNotification();
        if (currentConnection != null) {
            currentConnection.setActive();
        }
        startForegroundService(name, false);
        JSObject ret = new JSObject();
        ret.put("action", "answer");
        ret.put("callId", currentCallId);
        notifyListeners("onCallAction", ret);
    }

    public void onNativeCallRejected() {
        cancelNotification();
        if (currentConnection != null) {
            currentConnection.setDisconnected(new android.telecom.DisconnectCause(android.telecom.DisconnectCause.REJECTED));
            currentConnection.destroy();
            currentConnection = null;
        }
        stopForegroundService();
        JSObject ret = new JSObject();
        ret.put("action", "reject");
        notifyListeners("onCallAction", ret);
    }

    private void cancelNotification() {
        NotificationManager notificationManager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }

    @PluginMethod
    public void answerCall(PluginCall call) {
        if (currentConnection != null) {
            currentConnection.onAnswer();
            call.resolve();
        } else {
            call.reject("No active connection to answer");
        }
    }

    @PluginMethod
    public void rejectCall(PluginCall call) {
        if (currentConnection != null) {
            currentConnection.onReject();
            call.resolve();
        } else {
            call.reject("No active connection to reject");
        }
    }

    public void onNativeCallDisconnected() {
        stopForegroundService();
        JSObject ret = new JSObject();
        ret.put("action", "disconnect");
        notifyListeners("onCallAction", ret);
    }

    public void startForegroundService(String callerName, boolean isIncoming) {
        Context context = getContext();
        Intent intent = new Intent(context, CallForegroundService.class);
        intent.putExtra("callerName", callerName);
        if (isIncoming) {
            intent.setAction(CallForegroundService.ACTION_START_INCOMING);
        }
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

            // Démarrer le service de premier plan pour l'appel entrant (Notification + Plein écran)
            startForegroundService(name, true);

            Bundle extras = new Bundle();
            Uri uri = Uri.fromParts("tel", number, null);
            
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
            
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle);
            
            Bundle outgoingExtras = new Bundle();
            outgoingExtras.putString("caller_name", name);
            extras.putBundle(TelecomManager.EXTRA_OUTGOING_CALL_EXTRAS, outgoingExtras);

            // Pour un appel sortant, on démarre le service en mode "ongoing" immédiatement
            startForegroundService(name, false);
            
            telecomManager.placeCall(uri, extras);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error placing outgoing call", e);
            call.reject(e.getMessage());
        }
    }
}
