package com.test

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val intent = Intent(this, MainActivity::class.java)
        // Preserve deep link intent data
        if (getIntent().data != null) {
            intent.data = getIntent().data
        }
        if (getIntent().extras != null) {
            intent.putExtras(getIntent().extras!!)
        }
        intent.flags = getIntent().flags
        startActivity(intent)

        finish()
    }
}
