# Timelo - Freelancer Timesheet & Invoice App

> **TRACK. INVOICE. GET PAID.**

Timelo is a privacy-first cross-platform mobile application (iOS & Android) built with Expo, React Native, TypeScript, `expo-sqlite`, Zustand, `expo-print`, and RevenueCat (`react-native-purchases`).

---

## Core Features

- ⏱ **One-Tap Timer**: Timestamp-driven active timer that survives app closes and restarts without running background battery drains.
- 📅 **Timesheet Management**: View time logs grouped by client and week with billed vs unbilled status badges.
- 🧾 **Invoice Builder**: Auto-pull unbilled time entries into line items, format hourly rates, tax/VAT %, due dates, and payment instructions (Bank, Wise, PayPal).
- 📄 **PDF Generation & Native Share**: Instant PDF rendering via `expo-print` and native OS Share Sheet integration.
- 👑 **Pro Tier Subscriptions**: In-app purchases via RevenueCat ($5.99/mo or $39/year) unlocking unlimited clients/invoices, custom business logo upload, clean PDFs, and CSV exports.

---

## Tech Stack

- **Framework**: Expo ~54.0.0, React Native 0.76.7, TypeScript
- **Storage**: `expo-sqlite` (Local encrypted SQLite database)
- **State**: Zustand
- **PDF & Sharing**: `expo-print`, `expo-sharing`
- **Subscriptions**: RevenueCat (`react-native-purchases`)
- **Logo Picker**: `expo-image-picker`
- **Notifications**: `expo-notifications`

---

## Setup & Running

```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run typecheck

# Start Metro bundler
npm start

# Run Native Dev Builds
npm run android
npm run ios
```

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
