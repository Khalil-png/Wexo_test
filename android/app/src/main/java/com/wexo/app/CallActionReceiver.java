package com.wexo.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d("CallActionReceiver", "Action received: " + action);

        if ("ACTION_HANGUP".equals(action)) {
            // Stop the foreground service
            Intent serviceIntent = new Intent(context, CallForegroundService.class);
            serviceIntent.setAction(CallForegroundService.ACTION_STOP_SERVICE);
            context.startService(serviceIntent);

            // Notify the native plugin to notify JS
            WexoCallPlugin plugin = WexoCallPlugin.getInstance();
            if (plugin != null) {
                plugin.onNativeCallDisconnected();
            }
        }
    }
}
