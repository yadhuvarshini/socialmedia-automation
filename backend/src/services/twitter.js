import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Create OAuth 1.0a instance for Twitter
 */
function createOAuth() {
  return new OAuth({
    consumer: {
      key: config.twitter.clientId,
      secret: config.twitter.clientSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
  });
}

/**
 * Verify Twitter credentials and get user profile
 * @param {string} accessToken - User access token
 * @param {string} accessTokenSecret - User access token secret
 * @returns {Promise<{ id?: string, username?: string, name?: string, error?: string }>}
 */
export async function verifyTwitterCredentials(accessToken, accessTokenSecret) {
  try {
    const oauth = createOAuth();
    const requestData = {
      url: 'https://api.x.com/2/users/me',
      method: 'GET',
    };

    const token = {
      key: accessToken,
      secret: accessTokenSecret,
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const { data } = await axios.get(requestData.url, {
      headers: {
        Authorization: authHeader.Authorization,
      },
    });

    if (!data || !data.data) return null;

    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
    };
  } catch (err) {
    console.error('Twitter Credentials Verification Error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Create a post on Twitter/X
 * @param {string} accessToken - User access token
 * @param {string} accessTokenSecret - User access token secret
 * @param {string} text - Post content (max 280 characters)
 * @returns {Promise<{ id?: string, url?: string, error?: string }>}
 */
export async function createPost(accessToken, accessTokenSecret, text) {
  try {
    if (!text || text.trim().length === 0) {
      return { error: 'Post text cannot be empty' };
    }

    if (text.length > 280) {
      return { error: 'Post text cannot exceed 280 characters' };
    }

    const oauth = createOAuth();
    const requestData = {
      url: 'https://api.x.com/2/tweets',
      method: 'POST',
    };

    const token = {
      key: accessToken,
      secret: accessTokenSecret,
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const { data } = await axios.post(
      requestData.url,
      { text: text.trim() },
      {
        headers: {
          Authorization: authHeader.Authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (data.errors) {
      return { error: data.errors[0].message || 'Failed to create tweet' };
    }

    const tweetId = data.data?.id;
    const username = data.data?.username || 'unknown';
    const url = `https://x.com/${username}/status/${tweetId}`;

    return { id: tweetId, url };
  } catch (err) {
    const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.detail || err.message;
    console.error('Twitter Post Error:', msg);
    return { error: msg };
  }
}

/**
 * Get OAuth request token (step 1 of OAuth 1.0a flow)
 * @returns {Promise<{ oauth_token?: string, oauth_token_secret?: string, oauth_callback_confirmed?: string, error?: string }>}
 */
export async function getRequestToken(callbackUrl) {
  try {
    const oauth = createOAuth();
    const requestData = {
      url: 'https://api.x.com/oauth/request_token',
      method: 'POST',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize({
        ...requestData,
        data: { oauth_callback: callbackUrl },
      })
    );

    // Send oauth_callback as form-encoded body
    const body = new URLSearchParams({ oauth_callback: callbackUrl });

    const response = await axios.post(requestData.url, body.toString(), {
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Parse the response (it's in query string format)
    const params = new URLSearchParams(response.data);
    return {
      oauth_token: params.get('oauth_token'),
      oauth_token_secret: params.get('oauth_token_secret'),
      oauth_callback_confirmed: params.get('oauth_callback_confirmed'),
    };
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('Twitter Request Token Error:', msg);
    return { error: msg };
  }
}

/**
 * Exchange request token for access token (step 3 of OAuth 1.0a flow)
 * @param {string} oauthToken - OAuth token from callback
 * @param {string} oauthVerifier - OAuth verifier from callback
 * @param {string} oauthTokenSecret - OAuth token secret from step 1
 * @returns {Promise<{ oauth_token?: string, oauth_token_secret?: string, error?: string }>}
 */
export async function getAccessToken(oauthToken, oauthVerifier, oauthTokenSecret) {
  try {
    const oauth = createOAuth();
    const requestData = {
      url: 'https://api.x.com/oauth/access_token',
      method: 'POST',
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize({
        ...requestData,
        data: { oauth_verifier: oauthVerifier },
      }, token)
    );

    // Send oauth_verifier as form-encoded body
    const body = new URLSearchParams({ oauth_verifier: oauthVerifier });

    const response = await axios.post(requestData.url, body.toString(), {
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Parse the response (it's in query string format)
    const params = new URLSearchParams(response.data);
    return {
      oauth_token: params.get('oauth_token'),
      oauth_token_secret: params.get('oauth_token_secret'),
      user_id: params.get('user_id'),
      screen_name: params.get('screen_name'),
    };
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('Twitter Access Token Error:', msg);
    return { error: msg };
  }
}
