import { Router } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Integration } from '../models/Integration.js';
import { getMemberId } from '../services/linkedin.js';
import { verifyFacebookToken, getPages, exchangeToken } from '../services/facebook.js';
import { getRequestToken, getAccessToken, verifyTwitterCredentials } from '../services/twitter.js';

const router = Router();
const { linkedin, frontendUrl, session } = config;

// Email/Password Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await User.create({
      email,
      password,
      profile: {
        firstName: firstName || '',
        lastName: lastName || '',
        profilePicture: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
      },
      settings: {
        theme: 'light',
        notifications: true
      }
    });

    req.session.userId = user._id.toString();
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true, user: { id: user._id, email: user.email, profile: user.profile } });
    });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email/Password Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user._id.toString();
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true, user: { id: user._id, email: user.email, profile: user.profile } });
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/linkedin', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.oauthState = state;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedin.clientId,
    redirect_uri: linkedin.redirectUri,
    state,
    scope: linkedin.scope,
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) {
    return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error_description || error)}`);
  }
  const savedState = req.session?.oauthState;
  if (!savedState || savedState !== state) {
    return res.status(401).send('Invalid state');
  }
  if (!code) {
    return res.redirect(`${frontendUrl}/?error=missing_code`);
  }
  if (!linkedin.clientSecret) {
    return res.redirect(`${frontendUrl}/?error=server_config`);
  }
  try {
    const { data } = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: linkedin.clientId,
        client_secret: linkedin.clientSecret,
        redirect_uri: linkedin.redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 5184000;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const member = await getMemberId(accessToken);
    const linkedinId = member?.id ?? null;
    const profile = member?.profile;

    // Find or create user
    let user = await User.findOne({ email: profile?.email });
    if (!user) {
      user = await User.create({
        profile: profile
          ? {
            firstName: profile.given_name || profile.localizedFirstName || profile.firstName?.localized?.en_US,
            lastName: profile.family_name || profile.localizedLastName || profile.lastName?.localized?.en_US,
            profilePicture: profile.picture || profile.profilePicture?.displayImage,
          }
          : undefined,
      });
    } else {
      // Update profile if needed
      if (profile) {
        user.profile = {
          firstName: profile.given_name || profile.localizedFirstName || profile.firstName?.localized?.en_US || user.profile?.firstName,
          lastName: profile.family_name || profile.localizedLastName || profile.lastName?.localized?.en_US || user.profile?.lastName,
          profilePicture: profile.picture || profile.profilePicture?.displayImage || user.profile?.profilePicture,
        };
        await user.save();
      }
    }

    // Create or update LinkedIn integration
    await Integration.findOneAndUpdate(
      { userId: user._id, platform: 'linkedin' },
      {
        userId: user._id,
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
      },
      { upsert: true, new: true }
    );

    req.session.userId = user._id.toString();
    delete req.session.oauthState;
    req.session.save((err) => {
      if (err) return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(err.message)}`);
      res.redirect(`${frontendUrl}/home`);
    });
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message;
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(msg)}`);
  }
});

router.post('/logout', (req, res) => {
  const cookieName = 'blazly.sid';
  const cookieOpts = { path: '/', httpOnly: true };
  if (process.env.NODE_ENV === 'development') cookieOpts.domain = 'localhost';
  req.session.destroy((err) => {
    res.clearCookie(cookieName, cookieOpts);
    res.json({ ok: true });
  });
});

// Facebook OAuth flow - Step 1: Redirect to Facebook
router.get('/facebook', (req, res) => {
  const state = uuidv4();
  req.session = req.session || {};
  req.session.facebookOAuthState = state;

  const params = new URLSearchParams({
    client_id: config.facebook.appId,
    redirect_uri: `${config.frontendUrl}/api/auth/facebook/callback`,
    state,
    scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,instagram_basic,instagram_content_publish,threads_basic,threads_content_publish',
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
});

// Facebook OAuth flow - Step 2: Handle callback and exchange code for token
router.get('/facebook/callback', async (req, res) => {
  const { code, state, error, error_reason } = req.query;

  if (error) {
    return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(error_reason || error)}`);
  }

  const savedState = req.session?.facebookOAuthState;
  if (!savedState || savedState !== state) {
    return res.status(401).send('Invalid state');
  }

  if (!code) {
    return res.redirect(`${config.frontendUrl}/?error=missing_code`);
  }

  try {
    // Exchange code for access token
    const { data: tokenData } = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.facebook.appId,
        client_secret: config.facebook.appSecret,
        redirect_uri: `${config.frontendUrl}/api/auth/facebook/callback`,
        code,
      },
    });

    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longLivedResult = await exchangeToken(shortLivedToken);
    const accessToken = longLivedResult.access_token || shortLivedToken;
    const expiresIn = longLivedResult.expires_in || tokenData.expires_in || 5184000;

    // Get user profile
    const profile = await verifyFacebookToken(accessToken);
    if (!profile) {
      return res.redirect(`${config.frontendUrl}/?error=invalid_token`);
    }

    const { id: facebookId, name, picture } = profile;

    // Get pages list
    const pages = await getPages(accessToken);

    // Store token and pages in session for page selection
    req.session.facebookAccessToken = accessToken;
    req.session.facebookId = facebookId;
    req.session.facebookProfile = { name, picture };
    req.session.facebookPages = pages;
    req.session.facebookTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    delete req.session.facebookOAuthState;

    req.session.save((err) => {
      if (err) {
        return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(err.message)}`);
      }
      // Redirect to page selection page
      res.redirect(`${config.frontendUrl}/facebook/select-page`);
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(msg)}`);
  }
});

// Get Facebook pages for selection
router.get('/facebook/pages', (req, res) => {
  if (!req.session.facebookPages) {
    return res.status(401).json({ error: 'No Facebook session found. Please sign in again.' });
  }
  res.json({ pages: req.session.facebookPages });
});

// Select Facebook page
router.post('/facebook/select-page', async (req, res) => {
  const { pageId } = req.body;

  if (!req.session.facebookAccessToken || !req.session.facebookId) {
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

    // Find or create user
    let user = await User.findOne({ facebookId });

    const userData = {
      facebookId,
      accessToken,
      tokenExpiresAt,
      facebookPageId: selectedPage.id,
      facebookPageAccessToken: selectedPage.access_token,
      facebookPageName: selectedPage.name,
      profile: {
        firstName: name ? name.split(' ')[0] : 'Facebook',
        lastName: name ? name.split(' ').slice(1).join(' ') : 'User',
        profilePicture: picture,
      },
    };

    if (user) {
      user = await User.findByIdAndUpdate(user._id, userData, { new: true });
    } else {
      try {
        user = await User.create(userData);
      } catch (createErr) {
        if (createErr.code === 11000) {
          if (createErr.keyValue && createErr.keyValue.facebookId) {
            user = await User.findOneAndUpdate(
              { facebookId },
              userData,
              { new: true }
            );
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user record' });
    }

    req.session.userId = user._id.toString();
    delete req.session.facebookAccessToken;
    delete req.session.facebookId;
    delete req.session.facebookProfile;
    delete req.session.facebookPages;
    delete req.session.facebookTokenExpiresAt;

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session error' });
      }
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('Facebook Page Selection Error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Twitter OAuth flow - Step 1: Get request token
router.get('/twitter', async (req, res) => {
  try {
    const state = uuidv4();
    req.session = req.session || {};
    req.session.twitterOAuthState = state;

    const callbackUrl = `${config.frontendUrl}/api/auth/twitter/callback`;
    const result = await getRequestToken(callbackUrl);

    if (result.error) {
      return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(result.error)}`);
    }

    req.session.twitterOAuthTokenSecret = result.oauth_token_secret;
    req.session.save((err) => {
      if (err) {
        return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(err.message)}`);
      }
      res.redirect(`https://api.x.com/oauth/authorize?oauth_token=${result.oauth_token}`);
    });
  } catch (err) {
    const msg = err.message;
    res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(msg)}`);
  }
});

// Twitter OAuth flow - Step 2: Handle callback
router.get('/twitter/callback', async (req, res) => {
  const { oauth_token, oauth_verifier, denied } = req.query;

  if (denied) {
    return res.redirect(`${config.frontendUrl}/?error=twitter_denied`);
  }

  if (!oauth_token || !oauth_verifier) {
    return res.redirect(`${config.frontendUrl}/?error=missing_twitter_params`);
  }

  const oauthTokenSecret = req.session?.twitterOAuthTokenSecret;
  if (!oauthTokenSecret) {
    return res.redirect(`${config.frontendUrl}/?error=invalid_twitter_session`);
  }

  try {
    const result = await getAccessToken(oauth_token, oauth_verifier, oauthTokenSecret);

    if (result.error) {
      return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(result.error)}`);
    }

    const { oauth_token: accessToken, oauth_token_secret: accessTokenSecret, user_id: twitterId, screen_name: username } = result;

    // Verify credentials and get user info
    const userInfo = await verifyTwitterCredentials(accessToken, accessTokenSecret);

    if (!userInfo) {
      return res.redirect(`${config.frontendUrl}/?error=twitter_verification_failed`);
    }

    // Find or create user
    let user = await User.findOne({ twitterId });

    const userData = {
      twitterId,
      accessToken,
      accessTokenSecret,
      tokenExpiresAt: null, // OAuth 1.0a tokens don't expire unless revoked
      profile: {
        firstName: userInfo.name ? userInfo.name.split(' ')[0] : username,
        lastName: userInfo.name ? userInfo.name.split(' ').slice(1).join(' ') : '',
        profilePicture: `https://unavatar.io/twitter/${username}`,
      },
    };

    if (user) {
      user = await User.findByIdAndUpdate(user._id, userData, { new: true });
    } else {
      try {
        user = await User.create(userData);
      } catch (createErr) {
        if (createErr.code === 11000) {
          if (createErr.keyValue && createErr.keyValue.twitterId) {
            user = await User.findOneAndUpdate(
              { twitterId },
              userData,
              { new: true }
            );
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }
    }

    if (!user) {
      return res.redirect(`${config.frontendUrl}/?error=failed_to_create_user`);
    }

    req.session.userId = user._id.toString();
    delete req.session.twitterOAuthState;
    delete req.session.twitterOAuthTokenSecret;

    req.session.save((err) => {
      if (err) {
        return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(err.message)}`);
      }
      res.redirect(`${config.frontendUrl}/home`);
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(msg)}`);
  }
});

export default router;
