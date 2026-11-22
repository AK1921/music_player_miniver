# NEXORA – Personal Cloud Media Ecosystem & Web Studio

> **High-Performance Cross-Platform Personal Media Management Platform & Web Studio**  
> Powered by React Native (Expo SDK 58), TypeScript, Node.js Native Web Studio, Supabase, PostgreSQL (100% RLS Enforced), Hardware Biometrics, and Client-Side Zero-Knowledge Encryption.

---

## ⚡ Quick Start: Running the Applications

### 🌐 1. Run the Web Application
To run the full-featured desktop Web Studio with local offline media library, YouTube music feed, VLC-style video theater, Picture-in-Picture (PiP), Google Translation studio, smart calculator, and private vault:

```bash
# Install dependencies
npm install

# Start the Web Studio server (Port 3000)
npm run web:app
```
Open your browser at **[http://localhost:3000](http://localhost:3000)**.

> **Tip:** You can also use `npm run web:serve`. Both commands launch the native zero-dependency HTTP server (`web/server.js`) with live search proxy, translation services, and local file streaming.

---

### 📱 2. Run the Android Mobile Application
To run the Android app locally in Expo Go or an Android Emulator:

```bash
# Start the Metro Bundler & Expo dev server
npx expo start
```
- Press **`a`** in the terminal to launch on a connected Android device or Android Emulator.
- Or scan the QR code using the **Expo Go** app on your Android phone.

---

### 📦 3. Build Android Standalone APK (Preview / Installable Build)
To generate an installable standalone APK for direct installation on any Android phone without needing Expo Go or a computer:

```bash
# Generate standalone installable Android APK with EAS
npx eas-cli build -p android --profile preview
```

To build a production Android App Bundle (.aab) for Google Play Store release:
```bash
npx eas-cli build -p android --profile production
```

---

## 🚀 Deploying Web Studio to Vercel

The project is pre-configured with `vercel.json` and Serverless API functions in `/api` (`/api/youtube-search`, `/api/translate`) to deploy directly to Vercel:

1. **Deploy via Vercel CLI**:
   ```bash
   npx vercel --prod
   ```
2. **Or import via GitHub**:
   - Push this repository to your GitHub account (`https://github.com/AK1921/<repo-name>`).
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your GitHub repository.
   - Root directory: `./` (Vercel automatically detects `vercel.json` and routes `/` to `/web/index.html`).
   - Click **Deploy**.

---

## 🌟 Key Features & Architecture

### 🌐 Web Studio (`/web`)
1. **Local Media & Folders**:
   - Dual view modes: High-density Grid and Detailed List.
   - Bulk song & video upload with client-side metadata and cover art generation.
   - Persistent bottom audio player with duration tracking, play/pause, next/previous, and waveform visualizer.
   - VLC-style dedicated video cinema theater with Picture-in-Picture (PiP) floating mini-player.
2. **Online YouTube Music & Video Hub**:
   - Live YouTube search scraper (`/api/youtube-search`) with multi-tier fallback.
   - Verified 45+ track curated catalog across Pop, Rock, Chill, Bollywood, Tollywood, and EDM.
   - Instant Picture-in-Picture (PiP) player with direct 1-click dismiss (`X`).
3. **AK Private Vault**:
   - Client-side encryption for files, images, and documents.
   - Biometric touch sensor / Master PIN gate (Default recovery: `2003` or `arif`).
4. **Google Translate Studio**:
   - Two-way voice and text conversation mode between Indian and Global languages.
   - Instant speech synthesizer and speech recognition.
5. **Smart Calculator**:
   - Scientific and financial calculator with high-contrast OLED and light theme support.
6. **Cross-Device Cloud Sync**:
   - Supabase PostgreSQL synchronization for custom playlists, favorites, and settings.

---

### 📱 Android Mobile Application (`/src`)
1. **Mobile-First Music Hub** (`src/app/(tabs)/music.tsx`):
   - **Online (YouTube) Tab**: Live search, mood chips (Trending, Pop, Rock, Lofi, Indian, Workout), HD thumbnails, and instant playback via embedded YouTube IFrame API (`baseUrl: 'https://www.youtube.com'`).
   - **Local Music**: Background audio streaming (`expo-audio` with Media3 lock screen notifications).
   - **Videos**: Built-in video player.
   - **Playlists**: Full custom playlist creation, adding online/offline tracks, and batch playback.
2. **File Explorer & Vault** (`src/app/(tabs)/files.tsx` & `vault.tsx`):
   - Clean 3-dots action sheet for folder management, cover changing, and bulk soft-delete.
   - Native Hardware Biometrics (Fingerprint / Face ID via `expo-local-authentication`).
3. **Reactive UI & Themes**:
   - Light Studio themes (Frost Opal, Nordic Slate, Champagne Ivory, Mint Emerald, Sakura Rose) & Gen-Z OLED Dark palettes.

---

## 🧪 Verification & Typechecking

Run TypeScript strict typecheck:
```bash
npx tsc --noEmit
```

Run Expo Doctor diagnostic check:
```bash
npx expo-doctor
```

---

## 📄 License
MIT License. Built for personal cloud media independence.
