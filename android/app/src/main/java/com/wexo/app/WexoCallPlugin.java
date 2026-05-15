package com.wexo.app;

import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WexoCallNative")
public class WexoCallPlugin extends Plugin {

    private static final String TAG = "WexoCallPlugin";
    private PhoneAccountHandle phoneAccountHandle;

    @Override
    public void load() {
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

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String name = call.getString("name", "Inconnu");
        String number = call.getString("number", "0000");

        try {
            Context context = getContext();
            TelecomManager telecomManager = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);

            Bundle extras = new Bundle();
            Uri uri = Uri.fromParts("tel", number, null);
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
}
