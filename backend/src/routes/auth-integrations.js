import { Router } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { Integration } from '../models/Integration.js';
import { requireAuth } from '../middleware/auth.js';
import { getMemberId } from '../services/linkedin.js';
import { verifyFacebookToken, getPages, exchangeToken } from '../services/facebook.js';
import { getRequestToken, getAccessToken, verifyTwitterCredentials } from '../services/twitter.js';
import { exchangeCodeForToken, getThreadsUser } from '../services/threads.js';
import { exchangeCodeForToken as exchangeRedditCode, getRedditUser, getUserSubreddits } from '../services/reddit.js';
import { exchangeCodeForToken as exchangeInstagramCode, exchangeForLongLivedToken, getFacebookUser, getPagesWithInstagram, getInstagramAccount, exchangeInstagramLoginCode } from '../services/instagram.js';

const router = Router();
const { linkedin, frontendUrl } = config;

// All integration routes require authentication
router.use(requireAuth);

// LinkedIn Integration
router.get('/linkedin', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.linkedinOAuthState = state;
  req.session.linkedinUserId = req.user._id; // Use MongoDB _id
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedin.clientId,
    redirect_uri: `${frontendUrl}/api/auth/integrations/linkedin/callback`,
    state,
    scope: linkedin.scope,
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) {
    return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(error_description || error)}`);
  }
  const savedState = req.session?.linkedinOAuthState;
  const savedUserId = req.session?.linkedinUserId;
  if (!savedState || savedState !== state || !savedUserId) {
    return res.status(401).send('Invalid state');
  }
  if (!code) {
    return res.redirect(`${frontendUrl}/integrations?error=missing_code`);
  }
  if (!linkedin.clientSecret) {
    return res.redirect(`${frontendUrl}/home?error=server_config`);
  }
  try {
    const { data } = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: linkedin.clientId,
        client_secret: linkedin.clientSecret,
        redirect_uri: `${frontendUrl}/api/auth/integrations/linkedin/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 5184000;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const member = await getMemberId(accessToken);
    const linkedinId = member?.id ?? null;
    const profile = member?.profile;

    const integrationData = {
      userId: savedUserId,
      platform: 'linkedin',
      platformUserId: linkedinId,
      accessToken,
      refreshToken: data.refresh_token || undefined,
      tokenExpiresAt,
      profile: profile
        ? {
          name: `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.localizedFirstName || 'LinkedIn User',
          username: linkedinId,
          profilePicture: profile.picture || profile.profilePicture?.displayImage,
        }
        : undefined,
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'linkedin' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.linkedinOAuthState;
    delete req.session.linkedinUserId;
    req.session.save(() => {
      res.redirect(`${frontendUrl}/home?integration=linkedin&status=connected`);
    });
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

// Facebook Integration
router.get('/facebook', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.facebookOAuthState = state;
  req.session.facebookUserId = req.user._id;

  const params = new URLSearchParams({
    client_id: config.facebook.appId,
    redirect_uri: `${frontendUrl}/api/auth/integrations/facebook/callback`,
    state,
    scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content',
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
});

router.get('/facebook/callback', async (req, res) => {
  const { code, state, error, error_reason } = req.query;

  if (error) {
    return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(error_reason || error)}`);
  }

  const savedState = req.session?.facebookOAuthState;
  const savedUserId = req.session?.facebookUserId;
  if (!savedState || savedState !== state || !savedUserId) {
    return res.status(401).send('Invalid state');
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/integrations?error=missing_code`);
  }

  try {
    const { data: tokenData } = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.facebook.appId,
        client_secret: config.facebook.appSecret,
        redirect_uri: `${frontendUrl}/api/auth/integrations/facebook/callback`,
        code,
      },
    });

    const shortLivedToken = tokenData.access_token;
    const longLivedResult = await exchangeToken(shortLivedToken);
    const accessToken = longLivedResult.access_token || shortLivedToken;
    const expiresIn = longLivedResult.expires_in || tokenData.expires_in || 5184000;

    const profile = await verifyFacebookToken(accessToken);
    if (!profile) {
      return res.redirect(`${frontendUrl}/home?error=invalid_token`);
    }

    const { id: facebookId, name, picture } = profile;
    const pages = await getPages(accessToken);

    req.session.facebookAccessToken = accessToken;
    req.session.facebookId = facebookId;
    req.session.facebookProfile = { name, picture };
    req.session.facebookPages = pages;
    req.session.facebookTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    req.session.facebookUserId = savedUserId;
    delete req.session.facebookOAuthState;

    req.session.save(() => {
      res.redirect(`${frontendUrl}/integrations/facebook/select-page`);
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

router.get('/facebook/pages', requireAuth, (req, res) => {
  if (!req.session.facebookPages) {
    return res.status(401).json({ error: 'No Facebook session found. Please sign in again.' });
  }
  res.json({ pages: req.session.facebookPages });
});

router.post('/facebook/select-page', requireAuth, async (req, res) => {
  const { pageId } = req.body;
  const savedUserId = req.session?.facebookUserId;

  if (!req.session.facebookAccessToken || !req.session.facebookId || !savedUserId) {
    return res.status(401).json({ error: 'No Facebook session found. Please sign in again.' });
  }

  if (!pageId) {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  const pages = req.session.facebookPages || [];
  const selectedPage = pages.find(p => p.id === pageId);

  if (!selectedPage) {
    return res.status(400).json({ error: 'Page not found' });
  }

  try {
    const { id: facebookId, name, picture } = req.session.facebookProfile;
    const accessToken = req.session.facebookAccessToken;
    const tokenExpiresAt = req.session.facebookTokenExpiresAt;

    const integrationData = {
      userId: savedUserId,
      platform: 'facebook',
      platformUserId: facebookId,
      accessToken,
      tokenExpiresAt,
      facebookPageId: selectedPage.id,
      facebookPageAccessToken: selectedPage.access_token,
      facebookPageName: selectedPage.name,
      profile: {
        name: name || 'Facebook User',
        username: facebookId,
        profilePicture: picture,
      },
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'facebook' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.facebookAccessToken;
    delete req.session.facebookId;
    delete req.session.facebookProfile;
    delete req.session.facebookPages;
    delete req.session.facebookTokenExpiresAt;
    delete req.session.facebookUserId;

    req.session.save(() => {
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('Facebook Page Selection Error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Twitter Integration
router.get('/twitter', async (req, res) => {
  try {
    const state = uuidv4();
    req.session = req.session || {};
    req.session.twitterOAuthState = state;
    req.session.twitterUserId = req.user._id;

    const callbackUrl = `${frontendUrl}/api/auth/integrations/twitter/callback`;
    const result = await getRequestToken(callbackUrl);

    if (result.error) {
      return res.redirect(`${frontendUrl}/integrations?error=${encodeURIComponent(result.error)}`);
    }

    req.session.twitterOAuthTokenSecret = result.oauth_token_secret;
    req.session.save(() => {
      res.redirect(`https://api.x.com/oauth/authorize?oauth_token=${result.oauth_token}`);
    });
  } catch (err) {
    const msg = err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

router.get('/twitter/callback', async (req, res) => {
  const { oauth_token, oauth_verifier, denied } = req.query;

  if (denied) {
    return res.redirect(`${frontendUrl}/home?error=twitter_denied`);
  }

  if (!oauth_token || !oauth_verifier) {
    return res.redirect(`${frontendUrl}/home?error=missing_twitter_params`);
  }

  const oauthTokenSecret = req.session?.twitterOAuthTokenSecret;
  const savedUserId = req.session?.twitterUserId;
  if (!oauthTokenSecret || !savedUserId) {
    return res.redirect(`${frontendUrl}/home?error=invalid_twitter_session`);
  }

  try {
    const result = await getAccessToken(oauth_token, oauth_verifier, oauthTokenSecret);

    if (result.error) {
      return res.redirect(`${frontendUrl}/integrations?error=${encodeURIComponent(result.error)}`);
    }

    const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret, user_id: twitterId, screen_name: username } = result;

    const userInfo = await verifyTwitterCredentials(accessToken, accessTokenSecret);

    if (!userInfo) {
      return res.redirect(`${frontendUrl}/home?error=twitter_verification_failed`);
    }

    const integrationData = {
      userId: savedUserId,
      platform: 'twitter',
      platformUserId: twitterId,
      platformUsername: username,
      accessToken,
      accessTokenSecret,
      profile: {
        name: userInfo.name || username,
        username: username,
        profilePicture: `https://unavatar.io/twitter/${username}`,
      },
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'twitter' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.twitterOAuthState;
    delete req.session.twitterOAuthTokenSecret;
    delete req.session.twitterUserId;

    req.session.save(() => {
      res.redirect(`${frontendUrl}/home?integration=twitter&status=connected`);
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

// Threads Integration
router.get('/threads', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.threadsOAuthState = state;
  req.session.threadsUserId = req.user._id;

  const params = new URLSearchParams({
    client_id: config.threads.appId,
    redirect_uri: `${frontendUrl}/api/auth/integrations/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
    state,
  });

  res.redirect(`https://threads.net/oauth/authorize?${params}`);
});

router.get('/threads/callback', async (req, res) => {
  const { code, state, error, error_reason, error_description } = req.query;

  if (error) {
    return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(error_description || error_reason || error)}`);
  }

  const savedState = req.session?.threadsOAuthState;
  const savedUserId = req.session?.threadsUserId;
  if (!savedState || savedState !== state || !savedUserId) {
    return res.status(401).send('Invalid state');
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/home?error=missing_code`);
  }

  try {
    // Strip #_ from code if present
    const cleanCode = code.replace(/#_$/, '');

    const result = await exchangeCodeForToken(cleanCode);

    if (result.error) {
      return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(result.error)}`);
    }

    const { access_token: accessToken, user_id: threadsUserId } = result;

    const userInfo = await getThreadsUser(accessToken, threadsUserId);

    if (userInfo.error) {
      return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(userInfo.error)}`);
    }

    const integrationData = {
      userId: savedUserId,
      platform: 'threads',
      platformUserId: threadsUserId,
      platformUsername: userInfo.username,
      accessToken,
      profile: {
        name: userInfo.username || 'Threads User',
        username: userInfo.username,
      },
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'threads' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.threadsOAuthState;
    delete req.session.threadsUserId;

    req.session.save(() => {
      res.redirect(`${frontendUrl}/home?integration=threads&status=connected`);
    });
  } catch (err) {
    const msg = err.response?.data?.error_message || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

// Reddit Integration
router.get('/reddit', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.redditOAuthState = state;
  req.session.redditUserId = req.user._id;

  const params = new URLSearchParams({
    client_id: config.reddit.clientId,
    response_type: 'code',
    state,
    redirect_uri: config.reddit.redirectUri,
    duration: 'permanent',
    scope: 'identity submit read mysubreddits',
  });

  res.redirect(`https://www.reddit.com/api/v1/authorize?${params}`);
});

router.get('/reddit/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(error)}`);
  }

  const savedState = req.session?.redditOAuthState;
  const savedUserId = req.session?.redditUserId;
  if (!savedState || savedState !== state || !savedUserId) {
    return res.status(401).send('Invalid state');
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/home?error=missing_code`);
  }

  try {
    const result = await exchangeRedditCode(code);

    if (result.error) {
      return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(result.error)}`);
    }

    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = result;
    const tokenExpiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000);

    const userInfo = await getRedditUser(accessToken);

    if (userInfo.error) {
      return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(userInfo.error)}`);
    }

    // Store subreddits in session for selection
    const subreddits = await getUserSubreddits(accessToken);

    req.session.redditAccessToken = accessToken;
    req.session.redditRefreshToken = refreshToken;
    req.session.redditTokenExpiresAt = tokenExpiresAt;
    req.session.redditUserInfo = userInfo;
    req.session.redditSubreddits = subreddits;
    req.session.redditUserId = savedUserId;
    delete req.session.redditOAuthState;

    req.session.save(() => {
      res.redirect(`${frontendUrl}/integrations/reddit/select-subreddit`);
    });
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

router.get('/reddit/subreddits', requireAuth, (req, res) => {
  if (!req.session.redditSubreddits) {
    return res.status(401).json({ error: 'No Reddit session found. Please sign in again.' });
  }
  res.json({ subreddits: req.session.redditSubreddits });
});

router.post('/reddit/select-subreddit', requireAuth, async (req, res) => {
  const { subreddit } = req.body;
  const savedUserId = req.session?.redditUserId;

  if (!req.session.redditAccessToken || !savedUserId) {
    return res.status(401).json({ error: 'No Reddit session found. Please sign in again.' });
  }

  if (!subreddit) {
    return res.status(400).json({ error: 'Subreddit is required' });
  }

  try {
    const userInfo = req.session.redditUserInfo;
    const accessToken = req.session.redditAccessToken;
    const refreshToken = req.session.redditRefreshToken;
    const tokenExpiresAt = req.session.redditTokenExpiresAt;

    const integrationData = {
      userId: savedUserId,
      platform: 'reddit',
      platformUserId: userInfo.id,
      platformUsername: userInfo.name,
      accessToken,
      refreshToken,
      redditRefreshToken: refreshToken,
      redditSubreddit: subreddit,
      tokenExpiresAt,
      profile: {
        name: userInfo.name,
        username: userInfo.name,
        profilePicture: userInfo.icon_img,
      },
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'reddit' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.redditAccessToken;
    delete req.session.redditRefreshToken;
    delete req.session.redditTokenExpiresAt;
    delete req.session.redditUserInfo;
    delete req.session.redditSubreddits;
    delete req.session.redditUserId;

    req.session.save(() => {
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('Reddit Subreddit Selection Error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Instagram Direct Login
router.get('/instagram', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.instagramOAuthState = state;
  req.session.instagramUserId = req.user._id;

  const params = new URLSearchParams({
    force_reauth: 'true',
    client_id: config.instagram.appId,
    redirect_uri: config.instagram.redirectUri,
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights',
    state,
  });

  res.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
});

router.get('/instagram/callback', async (req, res) => {
  const { code, state, error, error_reason } = req.query;

  console.log('Instagram callback received:', { code: code?.substring(0, 20) + '...', state, error });

  if (error) {
    return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(error_reason || error)}`);
  }

  const savedState = req.session?.instagramOAuthState;
  const savedUserId = req.session?.instagramUserId;
  if (!savedState || savedState !== state || !savedUserId) {
    console.error('Instagram callback state mismatch:', {
      savedState,
      receivedState: state,
      hasSession: !!req.session
    });
    return res.status(401).send('Invalid state - session data was lost. Please try logging in again.');
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/home?error=missing_code`);
  }

  try {
    console.log('Exchanging Instagram token with redirectUri:', config.instagram.redirectUri);
    const tokenResult = await exchangeInstagramLoginCode(code, config.instagram.redirectUri);

    if (tokenResult.error) {
      return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(tokenResult.error)}`);
    }

    const accessToken = tokenResult.access_token;
    const instagramUserId = tokenResult.user_id;
    const permissions = tokenResult.permissions || '';

    console.log('Token exchange successful:', { instagramUserId, permissions });

    // Create or update Instagram integration
    const integrationData = {
      userId: savedUserId,
      platform: 'instagram',
      platformUserId: instagramUserId,
      platformUsername: `instagram_user_${instagramUserId}`,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      profile: {
        name: instagramUserId,
        username: `instagram_user_${instagramUserId}`,
      },
      isActive: true,
      lastUsedAt: new Date(),
    };

    // Find and update or create integration in MongoDB
    await Integration.findOneAndUpdate(
      { userId: savedUserId, platform: 'instagram' },
      integrationData,
      { upsert: true, new: true }
    );

    delete req.session.instagramOAuthState;
    delete req.session.instagramUserId;

    req.session.save((err) => {
      if (err) {
        console.error('Instagram Login session save error:', err);
        return res.redirect(`${frontendUrl}/home?error=${encodeURIComponent('Session save failed: ' + err.message)}`);
      }
      console.log('Instagram integration successful');
      res.redirect(`${frontendUrl}/home?integration=instagram&status=connected`);
    });
  } catch (err) {
    console.error('Instagram callback error:', err);
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect(`${frontendUrl}/home?error=${encodeURIComponent(msg)}`);
  }
});

export default router;
