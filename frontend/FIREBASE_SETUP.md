# Firebase Authentication Setup

The frontend uses Firebase Authentication with email/password accounts and a real email verification link. Firebase does not provide native Gmail OTP codes; the verification step is a secure link sent to the user's Gmail inbox.

## 1. Create a Firebase project

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a project, or open an existing project.
3. In **Project settings**, add a **Web app**.
4. Copy the web app configuration values.

## 2. Enable authentication

1. Open **Build > Authentication**.
2. Select **Get started**.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Save the provider.

For production, add your deployed frontend hostname under **Authentication > Settings > Authorized domains**. `localhost` is normally available for local development.

## 3. Configure the frontend

Copy `.env.example` to `.env.local` in this directory and replace each value with the matching Firebase web app value:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Do not commit `.env.local`. Vite exposes `VITE_*` values to the browser, so these values are not server secrets. Firebase security is enforced by Authentication and Firestore/Storage rules, not by hiding the web config.

## 4. Run and test

From `frontend/`:

```bash
npm run dev
```

Test the flow:

1. Open `/signup`.
2. Create an account with a real Gmail address.
3. Open the Firebase verification link from Gmail.
4. Return to the app and select **I verified my email**.
5. Choose a role on onboarding to enter the workspace.
6. Sign out and sign back in with the verified account.
7. Use **Forgot password?** to test Firebase reset emails.

The app currently shows a verification-link flow rather than a six-digit code because Firebase Authentication does not natively send Gmail OTP codes. A true numeric email OTP requires a trusted backend email service and one-time-code storage/rate limiting.
