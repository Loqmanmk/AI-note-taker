# FocusNotes mobile app

The Android and iOS app, built with Expo. It records the class as audio, sends it to the FocusNotes server (the web project in the parent folder), and shows the study pack.

## Test it on your phone

1. Install **Expo Go** on your phone from the Play Store or App Store.
2. Connect your phone and your computer to the **same Wi-Fi network**.
3. In one terminal, start the server from the project root:

   ```bash
   npm run dev
   ```

4. In a second terminal, start the mobile app:

   ```bash
   cd mobile
   npm install
   npm start
   ```

5. Scan the QR code shown in the terminal: with the Expo Go app on Android, with the Camera app on iPhone.

The app finds the server by itself: it uses the address of the computer that runs Expo, on port 3000.

## If the app cannot reach the server

- Check both devices are on the same Wi-Fi (not mobile data, not a guest network).
- On Windows, allow Node.js through the firewall on private networks when asked.
- If you start Expo with `--tunnel`, set the server address by hand: copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_API_URL`.

## Structure

```
src/app/          Screens (Expo Router): index.tsx records, class/[id].tsx shows the notes
src/components/   Interface pieces
src/hooks/        useClassRecorder, useClassHistory
src/components/record/   Record button, sound meter, "I'm lost" button
src/components/results/  Class header, section tabs and each tab of the study pack
src/lib/          Server client, storage on the phone, preferences, theme (colours, Manrope font)
../lib/           Data model and logic shared with the web app (imported as @shared/…)
```

## Known limits

- Recording stops if you leave the app or lock the phone; the screen is kept on while recording.
- Past classes are stored on the phone only.
- The server must be running on your computer. To use the app away from it, the server has to be put online first.
