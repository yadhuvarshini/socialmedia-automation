import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Generate PKCE Code Verifier and Challenge
 */
export function generatePKCEChallenge() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

/**
 * Verify Twitter credentials and get user profile using OAuth 2.0
 * @param {string} accessToken - User access token (OAuth 2.0)
 * @returns {Promise<{ id?: string, username?: string, name?: string, profilePicture?: string } | null>}
 */
export async function verifyTwitterCredentials(accessToken) {
  try {
    const { data } = await axios.get('https://api.x.com/2/users/me', {
      params: {
        'user.fields': 'profile_image_url,username,name'
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!data || !data.data) return null;

    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      profilePicture: data.data.profile_image_url
    };
  } catch (err) {
    console.error('Twitter Credentials Verification Error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Create a post on Twitter/X using OAuth 2.0
 * @param {string} accessToken - User access token (OAuth 2.0)
 * @param {string} text - Post content (max 280 characters)
 * @param {string[]} mediaIds - Optional media IDs
 * @returns {Promise<{ id?: string, url?: string, error?: string }>}
 */
export async function createPost(accessToken, text, mediaIds = []) {
  try {
    if ((!text || text.trim().length === 0) && (!mediaIds || mediaIds.length === 0)) {
      return { error: 'Post text or media is required' };
    }

    if (text && text.length > 280) {
      return { error: 'Post text cannot exceed 280 characters' };
    }

    const body = { text: text?.trim() };
    if (mediaIds && mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }

    const { data } = await axios.post(
      'https://api.x.com/2/tweets',
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (data.errors) {
      return { error: data.errors[0].message || 'Failed to create tweet' };
    }

    const tweetId = data.data?.id;
    // Note: To get the URL reliably, we might need the username, 
    // but the V2 response only returns ID and Text by default.
    // We can use the status ID URL format.
    const url = `https://x.com/i/status/${tweetId}`;

    return { id: tweetId, url };
  } catch (err) {
    const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.detail || err.message;
    console.error('Twitter Post Error:', msg);
    return { error: msg };
  }
}

/**
 * Exchange authorization code for OAuth 2.0 tokens
 * @param {string} code - The auth code from callback
 * @param {string} codeVerifier - The PKCE verifier
 * @param {string} redirectUri - Must match the one in developer portal
 * @returns {Promise<any>}
 */
export async function exchangeOAuth2Code(code, codeVerifier, redirectUri) {
  try {
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: config.twitter.clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // Twitter requires Basic Auth header with Client ID and Secret for OAuth 2.0 Confidential Clients
    const authHeader = Buffer.from(`${config.twitter.clientId}:${config.twitter.clientSecret}`).toString('base64');

    const { data } = await axios.post('https://api.x.com/2/oauth2/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`
      },
    });

    return data;
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('Twitter OAuth2 Exchange Error:', msg);
    return { error: msg };
  }
}

/**
 * Legacy OAuth 1.0a functions (kept for backward compatibility if needed, but not exporting)
 * Actually, we should probably remove them if we're migrating.
 */
// ... (Removing 1.0a exports as we migrate)
