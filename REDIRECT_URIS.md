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

### A. Facebook Login Settings (ONLY for Facebook)
1. Select your app -> **Facebook Login for Business** -> **Settings**
2. Ensure **"Client OAuth Login"** and **"Web OAuth Login"** are **ON**.
3. Under **Valid OAuth Redirect URIs**, add ONLY these:
```
https://localhost:5173/api/auth/facebook/callback
https://localhost:5173/api/auth/integrations/facebook/callback
```
> [!IMPORTANT]
> Ensure "integrations" is all **lowercase**. Your screenshot showed a capital "I" which will cause errors.

### B. Threads Settings (REQUIRED for Threads)
Threads has its own separate whitelist. Adding it to Facebook Login will NOT work for Threads.
1. Select your app -> **Use cases** (left sidebar).
2. Find **Access the Threads API** and click **Customize** or **Edit**.
3. Look for the **Settings** sub-tab or a field for **Valid OAuth Redirect URIs**.
4. Add:
```
https://localhost:5173/api/auth/integrations/threads/callback
```
*(Tip: If it still fails, try adding a version with a trailing slash: `.../callback/`)*

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

---

## 4. JavaScript SDK Domains (If Required)
If you see an error about **"JSSDK Host domain urls cannot contain any query, path or fragment information"**, it means you are putting a full URL into a field that expects only the **Origin**.

**Correct Format**:
```
https://localhost:5173
```
*(Note: NO trailing slash `/`, NO path `/api/...`)*

**Instructions:**
- **LinkedIn**: "JavaScript SDK" -> "Valid SDK Domains": Add `https://localhost:5173`
- **Facebook**: "App Domains": Add `localhost` (and `https://localhost:5173` if allowed)

**Note**: Since your app uses **server-side OAuth**, you typically **DO NOT** need to configure the JavaScript SDK domains unless you are adding specific client-side features. The **Redirect URIs** (Section 1 & 2) are the most important.

---

## 5. Reddit Developer Portal
**URL**: [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)

> [!IMPORTANT]
> Do NOT use **Devvit**. Devvit is for building apps *inside* Reddit. Use the standard link above for OAuth.

1. Scroll to the bottom and click **"are you a developer? create an app..."**
2. Fill in the details:
   - **name**: Blazly
   - **App type**: Select **web app**
   - **description**: Social media automation
   - **redirect uri**: `https://localhost:5173/api/auth/integrations/reddit/callback`
3. Click **create app**.

**Your Credentials**:
- **Client ID**: The string of characters right under the app name (e.g., `zXyAbC123...`).
- **Secret**: Labeled as "secret".

Update these in your `backend/.env` as `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.

---

## 6. Instagram (Meta) Developer Portal
**URL**: [https://developers.facebook.com/apps](https://developers.facebook.com/apps)

### A. Finding Instagram Permissions
In the new "Use Case" dashboard, Instagram is often hidden.
1. Select your app -> **Use cases** (left sidebar).
2. If you don't see "Instagram", look for **"Other"** and click **Customize**.
3. Search for or select these permissions:
   - `instagram_business_basic`
   - `instagram_business_content_publishing`
   - `pages_show_list` (Required to find the linked Instagram Business account)
   - `pages_read_engagement` (Dependency for Instagram Graph API)

### B. Valid OAuth Redirect URIs
Instagram uses the same whitelist as Facebook Login.
1. Select your app -> **Facebook Login for Business** -> **Settings**.
2. Ensure this URI is added (Lowercase "i"):
```
https://localhost:5173/api/auth/integrations/instagram/callback
```

> [!IMPORTANT]
> **Business Account Required**: Your Instagram account MUST be a **Business** or **Creator** account and must be **linked to a Facebook Page** for the Graph API to work.
