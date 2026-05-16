package com.wexo.app;

import android.app.Activity;
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
        
        // Allow the activity to show over the lock screen and turn the screen on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

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
                    // Logic to accept the call handled via JS or native bridge
                    // Since the native TelecomManager UI handles the actual call acceptance,
                    // this activity usually triggers the same flow.
                    plugin.onNativeCallAnswered(name != null ? name : "Appel en cours");
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

    @Override
    public void onBackPressed() {
        // Disable back button to force user to choose accept or decline
    }
}
