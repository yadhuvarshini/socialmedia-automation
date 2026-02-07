import axios from 'axios';

/**
 * Create a text post on LinkedIn (Share on LinkedIn – UGC Post API v2).
 * Uses /v2/ugcPosts so we don't need LinkedIn-Version header (avoids "version not active" errors).
 * @param {string} accessToken - Member access token
 * @param {object} payload - { author (urn), commentary (text), visibility }
 * @returns {Promise<{ postUrn?: string, error?: string }>}
 */
export async function createPost(accessToken, payload) {
  const body = {
    author: payload.author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: payload.commentary },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility':
        payload.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
    },
  };
  try {
    const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    /* {
    "author": "urn:li:person:8675309",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
        "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {
                "text": "Hello World! This is my first Share on LinkedIn!"
            },
            "shareMediaCategory": "NONE"
        }
    },
    "visibility": {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
} */
    const postUrn = res.headers?.['x-restli-id'] || res.data?.id;
    return { postUrn: postUrn || 'unknown' };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    const status = err.response?.status;
    return { error: message, status };
  }
}

/**
 * Build author URN for Share on LinkedIn (v2/ugcPosts).
 * UGC Post API expects Person URN: urn:li:person:{id}. Userinfo "sub" is alphanumeric and works here.
 */
export function buildAuthorUrn(memberId) {
  if (!memberId || typeof memberId !== 'string') return null;
  if (memberId.startsWith('urn:')) return memberId;
  return `urn:li:person:${memberId}`;
}

/**
 * Fetch current member via /v2/me (needs profile scope; often 403 with only w_member_social).
 */
export async function getMe(accessToken) {
  try {
    const { data } = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { id: data.id, ...data };
  } catch (err) {
    return null;
  }
}

/**
 * Fetch member via OpenID Connect userinfo (works with openid + profile scope).
 * Returns { sub, name, given_name, family_name, picture } – use sub as linkedinId for author.
 */
export async function getUserInfo(accessToken) {
  try {
    const { data } = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Get member id for author URN: try /v2/me first, then OpenID userinfo (sub).
 */
export async function getMemberId(accessToken) {
  const me = await getMe(accessToken);
  if (me?.id) return { id: me.id, profile: me };
  const userinfo = await getUserInfo(accessToken);
  if (userinfo?.sub) return { id: userinfo.sub, profile: userinfo };
  return null;
}
