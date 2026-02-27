/**
 * Cognito JWT verification utilities
 * Verifies AWS Cognito JWTs using JWKS (RS256)
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;

if (!region || !userPoolId) {
  console.warn('COGNITO_REGION or COGNITO_USER_POOL_ID not set - token verification will fail locally without these env vars');
}

const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

const client = jwksClient({
  jwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const publicKey = key.getPublicKey();
    callback(null, publicKey);
  });
}

const extractToken = (authHeader) => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
};

/**
 * Verify Cognito JWT token (returns decoded payload with `userId`)
 */
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error('Token required'));

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      },
      (err, decoded) => {
        if (err) return reject(err);
        // Add a userId alias for compatibility with existing code
        decoded.userId = decoded.sub;
        resolve(decoded);
      }
    );
  });
};

module.exports = {
  extractToken,
  verifyToken,
};
