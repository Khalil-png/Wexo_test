package com.wexo.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.content.Intent;

public class IncomingCallActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configuration pour l'affichage au-dessus de l'écran de verrouillage
        handleLockScreenVisibility();

        setContentView(R.layout.activity_incoming_call);

        TextView callerNameText = findViewById(R.id.caller_name);
        Button btnAccept = findViewById(R.id.btn_accept);
        Button btnDecline = findViewById(R.id.btn_decline);

        String name = getIntent().getStringExtra("callerName");
        if (name != null) {
            callerNameText.setText(name);
        }

        btnAccept.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                WexoCallPlugin plugin = WexoCallPlugin.getInstance();
                if (plugin != null) {
                    plugin.onNativeCallAnswered(name != null ? name : "Wexo Call");
                }
                finish();
            }
        });

        btnDecline.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                WexoCallPlugin plugin = WexoCallPlugin.getInstance();
                if (plugin != null) {
                    plugin.onNativeCallRejected();
                }
                finish();
            }
        });
    }

    private void handleLockScreenVisibility() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON);
        }
    }

    @Override
    public void onBackPressed() {
        // Interdire le bouton retour pour forcer le choix
    }
}
