'use strict';

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-1',
});

const USERS_TABLE = process.env.USERS_TABLE || 'restaurant-api-users-dev';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return null;
  }
}

function getClaims(event) {
  const jwtClaims = event.requestContext?.authorizer?.jwt?.claims || {};
  const claims = event.requestContext?.authorizer?.claims || {};

  return {
    ...claims,
    ...jwtClaims,
  };
}

function splitName(name) {
  const value = (name || '').trim();
  if (!value) {
    return { firstName: '', lastName: '' };
  }

  const parts = value.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

module.exports.syncCurrentUser = async (event) => {
  console.log('POST /users/sync - Sync authenticated user into DynamoDB');

  try {
    const body = parseBody(event);
    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Invalid request body' }),
        headers: HEADERS,
      };
    }

    const claims = getClaims(event);

    const userId =
      body.identityId ||
      claims.sub ||
      event.requestContext?.authorizer?.userId ||
      event.requestContext?.authorizer?.principalId ||
      body.userId ||
      null;

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
        headers: HEADERS,
      };
    }

    const emailFromClaims = (claims.email || '').trim().toLowerCase();
    const emailFromBody = (body.email || '').trim().toLowerCase();

    if (emailFromClaims && emailFromBody && emailFromClaims !== emailFromBody) {
      return {
        statusCode: 403,
        body: JSON.stringify({ success: false, error: 'Email mismatch with authenticated user' }),
        headers: HEADERS,
      };
    }

    const email = emailFromClaims || emailFromBody;
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Email is required for user sync' }),
        headers: HEADERS,
      };
    }

    const claimedName = (claims.name || '').trim();
    const bodyName = (body.name || '').trim();
    const fullName = claimedName || bodyName;

    const namesFromFullName = splitName(fullName);

    const firstName =
      (body.firstName || '').trim() ||
      (claims.given_name || '').trim() ||
      namesFromFullName.firstName;

    const lastName =
      (body.lastName || '').trim() ||
      (claims.family_name || '').trim() ||
      namesFromFullName.lastName;

    const phone =
      (body.phone || '').trim() ||
      (claims.phone_number || '').trim();

    const name = `${firstName} ${lastName}`.trim() || fullName || firstName;
    const timestamp = new Date().toISOString();

    const result = await dynamodb
      .update({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: [
          'SET userId = :userId',
          'identityId = :identityId',
          'email = :email',
          'firstName = :firstName',
          'lastName = :lastName',
          '#name = :name',
          'phone = :phone',
          'updatedAt = :updatedAt',
          'createdAt = if_not_exists(createdAt, :createdAt)',
          'registrationMethod = if_not_exists(registrationMethod, :registrationMethod)',
        ].join(', '),
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':identityId': body.identityId || null,
          ':email': email,
          ':firstName': firstName,
          ':lastName': lastName,
          ':name': name,
          ':phone': phone,
          ':updatedAt': timestamp,
          ':createdAt': timestamp,
          ':registrationMethod': 'cognito-amplify',
        },
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User synced successfully',
        data: result.Attributes,
      }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error syncing user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to sync user profile' }),
      headers: HEADERS,
    };
  }
};
