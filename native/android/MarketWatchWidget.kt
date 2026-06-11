package vn.marketwatch.app.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import android.content.Context
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.NumberFormat
import java.util.Locale

/**
 * Glance home-screen widget cho MarketWatch.
 * Gọi https://marketwatch.vn/api/public/widget-snapshot, cache JSON trong
 * Preferences, render danh sách giá Vàng / BTC / ETH / USD.
 */

private val GOLD = Color(0xFFC9A84C)
private val UP   = Color(0xFF4AB377)
private val DOWN = Color(0xFFE85D3A)
private val BG   = Color(0xFF0D0D0D)
private val FG   = Color(0xFFF5F0DF)

private val SNAPSHOT_KEY = stringPreferencesKey("widget_snapshot_json")

data class Item(val code: String, val price: Double, val unit: String, val changePct: Double?)

class MarketWatchWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: androidx.glance.appwidget.GlanceId) {
        // Fetch + persist trước khi render để tránh flash
        val snap = withContext(Dispatchers.IO) { fetchSnapshot() }
        if (snap != null) {
            androidx.glance.appwidget.updateAppWidgetState(context, id) { prefs ->
                prefs[SNAPSHOT_KEY] = snap
            }
        }

        provideContent {
            val raw = currentState<Preferences>()[SNAPSHOT_KEY]
            val items = parseItems(raw)
            WidgetUI(items)
        }
    }

    @Composable
    private fun WidgetUI(items: List<Item>) {
        Column(
            modifier = GlanceModifier.fillMaxSize().background(BG).padding(12.dp),
        ) {
            Text(
                "MarketWatch",
                style = TextStyle(
                    color = ColorProvider(GOLD),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Spacer(GlanceModifier.height(6.dp))
            items.take(4).forEach { it -> Row(it) }
            if (items.isEmpty()) {
                Text(
                    "Đang cập nhật…",
                    style = TextStyle(color = ColorProvider(FG), fontSize = 12.sp),
                )
            }
        }
    }

    @Composable
    private fun Row(item: Item) {
        Row(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 2.dp)) {
            Text(
                item.code,
                modifier = GlanceModifier.defaultWeight(),
                style = TextStyle(color = ColorProvider(GOLD), fontSize = 11.sp, fontWeight = FontWeight.Medium),
            )
            Text(
                formatPrice(item),
                style = TextStyle(color = ColorProvider(FG), fontSize = 12.sp, fontWeight = FontWeight.Medium),
            )
            Spacer(GlanceModifier.width(6.dp))
            val pct = item.changePct
            if (pct != null) {
                Text(
                    String.format(if (pct >= 0) "+%.2f%%" else "%.2f%%", pct),
                    style = TextStyle(
                        color = ColorProvider(if (pct >= 0) UP else DOWN),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                )
            }
        }
    }

    private fun formatPrice(it: Item): String {
        return if (it.unit.contains("VND")) {
            NumberFormat.getInstance(Locale("vi", "VN")).format(it.price.toLong())
        } else {
            String.format(Locale.US, "%.2f", it.price)
        }
    }
}

private fun fetchSnapshot(): String? {
    return try {
        val conn = (URL("https://marketwatch.vn/api/public/widget-snapshot")
            .openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("Accept", "application/json")
        }
        if (conn.responseCode == 200) conn.inputStream.bufferedReader().use { it.readText() }
        else null
    } catch (_: Throwable) { null }
}

private fun parseItems(raw: String?): List<Item> {
    if (raw.isNullOrBlank()) return emptyList()
    return try {
        val arr = JSONObject(raw).getJSONArray("items")
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Item(
                code = o.optString("code"),
                price = o.optDouble("price", 0.0),
                unit = o.optString("unit", ""),
                changePct = if (o.isNull("changePct")) null else o.optDouble("changePct"),
            )
        }
    } catch (_: Throwable) { emptyList() }
}