package com.wexo.app;

import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.os.Bundle;
import android.util.Log;

public class WexoConnectionService extends ConnectionService {
    private static final String TAG = "WexoConnectionService";

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.d(TAG, "onCreateIncomingConnection");
        WexoConnection connection = new WexoConnection();
        connection.setAddress(request.getAddress(), TelecomManager.PRESENTATION_ALLOWED);
        connection.setVideoState(request.getVideoState());
        connection.setInitializing();
        
        Bundle extras = request.getExtras();
        if (extras != null) {
            connection.putExtras(extras);
        }

        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            plugin.setCurrentConnection(connection);
        }

        return connection;
    }

    @Override
    public Connection onCreateOutgoingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.d(TAG, "onCreateOutgoingConnection");
        WexoConnection connection = new WexoConnection();
        connection.setAddress(request.getAddress(), TelecomManager.PRESENTATION_ALLOWED);
        connection.setVideoState(request.getVideoState());
        connection.setDialing();
        
        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            plugin.setCurrentConnection(connection);
            String name = "Appel en cours";
            Bundle extras = request.getExtras();
            if (extras != null && extras.getBundle(TelecomManager.EXTRA_OUTGOING_CALL_EXTRAS) != null) {
                 name = extras.getBundle(TelecomManager.EXTRA_OUTGOING_CALL_EXTRAS).getString("caller_name", "Appel en cours");
            }
            plugin.startForegroundService(name);
        }
        
        return connection;
    }

    @Override
    public void onCreateIncomingConnectionFailed(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.e(TAG, "onCreateIncomingConnectionFailed");
    }

    @Override
    public void onCreateOutgoingConnectionFailed(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Log.e(TAG, "onCreateOutgoingConnectionFailed");
    }
}

class WexoConnection extends Connection {
    @Override
    public void onAnswer() {
        Log.d("WexoConnection", "onAnswer");
        setActive();
        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            String name = "Appel en cours";
            Bundle extras = getExtras();
            if (extras != null) {
                Bundle incomingExtras = extras.getBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS);
                if (incomingExtras != null) {
                    name = incomingExtras.getString("caller_name", "Appel en cours");
                } else {
                    name = extras.getString("caller_name", "Appel en cours");
                }
            }
            plugin.onNativeCallAnswered(name);
        }
    }

    @Override
    public void onDisconnect() {
        Log.d("WexoConnection", "onDisconnect");
        setDisconnected(new android.telecom.DisconnectCause(android.telecom.DisconnectCause.LOCAL));
        destroy();
        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            plugin.onNativeCallDisconnected();
        }
    }

    @Override
    public void onAbort() {
        Log.d("WexoConnection", "onAbort");
        setDisconnected(new android.telecom.DisconnectCause(android.telecom.DisconnectCause.CANCELED));
        destroy();
        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            plugin.onNativeCallDisconnected();
        }
    }

    @Override
    public void onReject() {
        Log.d("WexoConnection", "onReject");
        setDisconnected(new android.telecom.DisconnectCause(android.telecom.DisconnectCause.REJECTED));
        destroy();
        WexoCallPlugin plugin = WexoCallPlugin.getInstance();
        if (plugin != null) {
            plugin.onNativeCallRejected();
        }
    }
}
