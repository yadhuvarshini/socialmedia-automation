# 🚨 CRITICAL: Developer Console Configuration

Using **HTTPS** on `localhost:5173` changes your callback URLs. You MUST update your developer consoles with these EXACT values.

## 1. LinkedIn Developer Portal
**URL**: [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
1. Select your app
2. Go to **Auth** tab
3. Under **OAuth 2.0 settings** -> **Authorized redirect URLs for your app**, add:

```
https://localhost:5173/api/auth/linkedin/callback
https://localhost:5173/api/auth/integrations/linkedin/callback
```
*(Remove any `http://` or port `4000` versions)*

---

## 2. Facebook for Developers (for Facebook & Threads)
**URL**: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
1. Select your app
2. Go to **Facebook Login** -> **Settings**
3. Under **Valid OAuth Redirect URIs**, add:

```
https://localhost:5173/api/auth/facebook/callback
https://localhost:5173/api/auth/integrations/facebook/callback
https://localhost:5173/api/auth/integrations/threads/callback
```
*(Remove any `http://` or port `4000` versions)*

---

## 3. Twitter Developer Portal
**URL**: [https://developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
1. Select your Project & App
2. Click **Edit** next to **User authentication settings**
3. Under **Callback URI / Redirect URL**, add:

```
https://localhost:5173/api/auth/twitter/callback
https://localhost:5173/api/auth/integrations/twitter/callback
```

---

## ⚠️ Important Notes

1. **HTTPS is Required**: Since your app is running on `https://localhost:5173`, all redirects MUST use `https`.
2. **Restart Backend**: I have updated your `.env` file. The backend should auto-restart, but if it doesn't work, verify the `.env` file has `FRONTEND_URL=https://localhost:5173`.
3. **Common Error**: "Redirect URI mismatch" means the URL in the browser address bar (initiated by the code) doesn't EXACTLY match one of the URLs in the list above.

## ✅ How to Verify
1. Go to `https://localhost:5173/home`
2. Click "Connect" on LinkedIn/Facebook/Threads
3. Check the URL in the popup/redirect
4. It should look like `...redirect_uri=https%3A%2F%2Flocalhost%3A5173%2Fapi%2Fauth...`
