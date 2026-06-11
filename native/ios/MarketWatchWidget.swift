//
//  MarketWatchWidget.swift
//  MarketWatch home-screen widget (iOS WidgetKit)
//
//  Hiển thị giá vàng SJC, BTC, ETH, USD/VND lấy từ
//  https://marketwatch.vn/api/public/widget-snapshot
//

import WidgetKit
import SwiftUI

// MARK: - Model

struct WidgetItem: Decodable, Identifiable {
    let code: String
    let name: String
    let price: Double
    let unit: String
    let changePct: Double?
    var id: String { code }
}

struct WidgetSnapshot: Decodable {
    let updatedAt: String
    let items: [WidgetItem]
}

// MARK: - Timeline Entry

struct MarketEntry: TimelineEntry {
    let date: Date
    let items: [WidgetItem]
    let isPlaceholder: Bool
}

// MARK: - Provider

struct Provider: TimelineProvider {
    private let endpoint = URL(string: "https://marketwatch.vn/api/public/widget-snapshot")!

    func placeholder(in context: Context) -> MarketEntry {
        MarketEntry(date: Date(), items: Self.demoItems, isPlaceholder: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (MarketEntry) -> Void) {
        fetch { snap in
            completion(MarketEntry(date: Date(), items: snap?.items ?? Self.demoItems, isPlaceholder: snap == nil))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MarketEntry>) -> Void) {
        fetch { snap in
            let entry = MarketEntry(date: Date(), items: snap?.items ?? Self.demoItems, isPlaceholder: snap == nil)
            let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetch(_ completion: @escaping (WidgetSnapshot?) -> Void) {
        var req = URLRequest(url: endpoint)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 10
        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
            else { completion(nil); return }
            completion(snap)
        }.resume()
    }

    static let demoItems: [WidgetItem] = [
        WidgetItem(code: "SJC", name: "Vàng SJC", price: 78_500_000, unit: "VND/lượng", changePct: 0.42),
        WidgetItem(code: "BTC", name: "Bitcoin", price: 71234.5, unit: "USD", changePct: -1.2),
        WidgetItem(code: "ETH", name: "Ethereum", price: 3812.1, unit: "USD", changePct: 0.8),
        WidgetItem(code: "USD/VND", name: "Đô la Mỹ", price: 25430, unit: "VND", changePct: 0.05),
    ]
}

// MARK: - Views

struct MarketWatchWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall: SmallView(items: Array(entry.items.prefix(2)))
        default:           MediumView(items: Array(entry.items.prefix(4)))
        }
    }
}

struct SmallView: View {
    let items: [WidgetItem]
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("MarketWatch")
                .font(.caption2.bold())
                .foregroundStyle(Color(red: 0.79, green: 0.66, blue: 0.30))
            ForEach(items) { it in Row(item: it, compact: true) }
            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(Color.black, for: .widget)
    }
}

struct MediumView: View {
    let items: [WidgetItem]
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("MarketWatch")
                    .font(.caption.bold())
                    .foregroundStyle(Color(red: 0.79, green: 0.66, blue: 0.30))
                Spacer()
                Text("marketwatch.vn")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }
            ForEach(items) { it in Row(item: it, compact: false) }
            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(Color.black, for: .widget)
    }
}

struct Row: View {
    let item: WidgetItem
    let compact: Bool

    private var priceText: String {
        if item.unit.contains("VND") {
            let f = NumberFormatter(); f.numberStyle = .decimal; f.groupingSeparator = "."
            return f.string(from: NSNumber(value: item.price)) ?? "\(item.price)"
        }
        return String(format: "%.2f", item.price)
    }

    var body: some View {
        HStack(spacing: 6) {
            Text(item.code)
                .font(.system(size: compact ? 10 : 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color(red: 0.79, green: 0.66, blue: 0.30))
                .frame(width: compact ? 38 : 52, alignment: .leading)
            Text(priceText)
                .font(.system(size: compact ? 12 : 13, weight: .semibold, design: .monospaced))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 4)
            if let pct = item.changePct {
                Text(String(format: "%@%.2f%%", pct >= 0 ? "+" : "", pct))
                    .font(.system(size: compact ? 10 : 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(pct >= 0 ? Color(red: 0.29, green: 0.70, blue: 0.46)
                                              : Color(red: 0.91, green: 0.36, blue: 0.22))
            }
        }
    }
}

// MARK: - Widget

@main
struct MarketWatchWidget: Widget {
    let kind: String = "MarketWatchWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MarketWatchWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MarketWatch")
        .description("Giá vàng SJC, Bitcoin, USD/VND realtime trên màn hình chính.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}