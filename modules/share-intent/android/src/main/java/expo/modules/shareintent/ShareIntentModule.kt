package expo.modules.shareintent

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Exposes text shared to Bite from other apps (ACTION_SEND text/plain).
class ShareIntentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShareIntent")

    Events("onShare")

    // Cold start: the share arrives as the launch intent.
    Function("getInitialShare") {
      consume(appContext.currentActivity?.intent)
    }

    // Warm start: MainActivity is singleTask, so the share arrives here.
    OnNewIntent { intent ->
      consume(intent)?.let { sendEvent("onShare", mapOf("text" to it)) }
    }
  }

  // Reads the shared text once and clears it so a JS reload doesn't replay it.
  private fun consume(intent: Intent?): String? {
    if (intent?.action != Intent.ACTION_SEND) return null
    if (intent.type?.startsWith("text/") != true) return null
    val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
    intent.removeExtra(Intent.EXTRA_SUBJECT)
    intent.removeExtra(Intent.EXTRA_TEXT)
    intent.action = Intent.ACTION_MAIN
    val parts = listOfNotNull(subject, text).map { it.trim() }.filter { it.isNotEmpty() }.distinct()
    return if (parts.isEmpty()) null else parts.joinToString("\n")
  }
}
