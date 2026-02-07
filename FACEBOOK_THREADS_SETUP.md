# Facebook & Threads Integration Setup Guide

## 🔴 Issue: "This app is not currently accessible"

This error means your Facebook app is in **Development Mode**. Here's how to fix it:

### Option 1: Add Test Users (Quick Fix)
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Roles** → **Test Users** or **Roles** → **Roles**
4. Add your Facebook account as a test user or admin
5. Now you can use the app while it's in development mode

### Option 2: Make App Live (Production)
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **App Settings** → **Basic**
4. Scroll down to **App Mode**
5. Toggle from "Development" to "Live"
6. Complete any required verification steps

**Note**: For Threads, you MUST use the same Facebook app credentials.

## ✅ Threads Integration is Already in Frontend

Threads was added in the previous update. To see it:

1. **Refresh your browser** (Ctrl+R or Cmd+R)
2. Go to the home page (`/home`)
3. Look in the sidebar under "Integrations"
4. You should see all 4 platforms:
   - LinkedIn
   - Facebook
   - Twitter
   - **Threads** ← This one!

## 🔧 Environment Variables Check

Make sure your `.env` file has these variables:

### Backend `.env`
```env
# Facebook (also used for Threads)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Threads (uses same Facebook app)
THREADS_APP_ID=your_facebook_app_id
THREADS_APP_SECRET=your_facebook_app_secret
```

**Important**: Threads uses the **same app credentials** as Facebook because Threads is part of Meta.

## 📋 Facebook App Configuration

### Required Settings:
1. **App Type**: Business
2. **Products Added**:
   - Facebook Login
   - Threads API (if available)
3. **Valid OAuth Redirect URIs**:
   ```
   http://localhost:5173/api/auth/facebook/callback
   http://localhost:5173/api/auth/integrations/facebook/callback
   http://localhost:5173/api/auth/integrations/threads/callback
   ```
4. **Permissions Required**:
   - `public_profile`
   - `email`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
   - `threads_basic` (for Threads)
   - `threads_content_publish` (for Threads)

## 🧪 Testing Threads Integration

### Step 1: Verify Backend
```bash
# Check if Threads routes are registered
curl http://localhost:4000/api/health
```

### Step 2: Test Frontend
1. Open browser to `http://localhost:5173`
2. Sign in with any platform (LinkedIn recommended for testing)
3. You should land on `/home`
4. In the sidebar, under "Integrations", you should see:
   ```
   Integrations
   ├─ LinkedIn     [Connected/Connect]
   ├─ Facebook     [Connect]
   ├─ Twitter      [Connect]
   └─ Threads      [Connect]  ← Should be here!
   ```

### Step 3: Connect Threads
1. Click "Connect" button next to Threads
2. You'll be redirected to Threads OAuth
3. Authorize the app
4. You'll be redirected back to `/home?integration=threads&status=connected`
5. Threads should now show as "Connected" with your username

## 🐛 Troubleshooting

### Threads Not Showing in Sidebar?
1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache**: Browser DevTools → Application → Clear Storage
3. **Check browser console**: F12 → Console tab for any errors

### Facebook OAuth Error?
1. **Check app mode**: Development vs Live
2. **Add yourself as test user** if in Development mode
3. **Verify redirect URIs** match exactly
4. **Check app permissions** are approved

### Threads OAuth Error?
1. **Use same Facebook app credentials**
2. **Ensure Threads API is enabled** in Facebook app
3. **Check if your account has Threads** (Instagram required)
4. **Verify scopes**: `threads_basic,threads_content_publish`

## 📱 Threads Requirements

To use Threads integration, users need:
1. **Instagram account** (Threads is linked to Instagram)
2. **Threads app** installed and account created
3. **Facebook app** with Threads API enabled
4. **Business or Creator account** (may be required)

## 🎯 Current Status

### ✅ What's Working:
- Threads backend routes (`/api/auth/integrations/threads`)
- Threads service (`services/threads.js`)
- Threads model (platform enum includes 'threads')
- Threads frontend UI (icon, colors, names)
- Threads in available platforms list

### 🔄 What You Need to Do:
1. **Refresh browser** to see Threads in sidebar
2. **Fix Facebook app mode** (Development → Live or add test users)
3. **Configure Threads API** in Facebook Developer Console
4. **Test the integration** by clicking "Connect" on Threads

## 📸 Expected UI

When you refresh the page, you should see this in the sidebar:

```
┌─────────────────────────┐
│  B  Blazly              │
├─────────────────────────┤
│  🏠 Posts               │
├─────────────────────────┤
│  INTEGRATIONS           │
│                         │
│  [in] LinkedIn          │
│      Connect            │
│                         │
│  [f] Facebook           │
│      Connect            │
│                         │
│  [𝕏] Twitter            │
│      Connect            │
│                         │
│  [@] Threads            │ ← NEW!
│      Connect            │
├─────────────────────────┤
│  👤 Your Name           │
│  Sign out               │
└─────────────────────────┘
```

## 🚀 Quick Start

1. **Refresh browser** → See Threads
2. **Fix Facebook app** → Add test user or go Live
3. **Click Connect** → Test integration
4. **Post to Threads** → Verify it works!

That's it! Threads integration is fully implemented and ready to use. 🎉
