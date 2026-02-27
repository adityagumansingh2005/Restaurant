/**
 * DynamoDB User Operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE || 'restaurant-users';

/**
 * Create a new user
 */
const createUser = async (email, hashedPassword, userData = {}) => {
  try {
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    const user = {
      userId,
      email,
      password: hashedPassword,
      ...userData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: USERS_TABLE,
        Item: user,
        ConditionExpression: 'attribute_not_exists(email)',
      })
      .promise();

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('Email already registered');
    }
    throw new Error(`Error creating user: ${error.message}`);
  }
};

/**
 * Get user by email (primary key lookup)
 */
const getUserByEmail = async (email) => {
  try {
    const result = await dynamodb
      .get({ TableName: USERS_TABLE, Key: { email } })
      .promise();

    return result.Item || null;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
};

/**
 * Update user by email
 */
const updateUser = async (email, updateData) => {
  try {
    const timestamp = new Date().toISOString();

    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    const setParts = [];

    for (const [key, value] of Object.entries(updateData)) {
      const nameKey = `#${key}`;
      const valKey = `:${key}`;
      ExpressionAttributeNames[nameKey] = key;
      ExpressionAttributeValues[valKey] = value;
      setParts.push(`${nameKey} = ${valKey}`);
    }

    // always update updatedAt
    ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
    ExpressionAttributeValues[':updatedAt'] = timestamp;
    setParts.push('#updatedAt = :updatedAt');

    const UpdateExpression = 'SET ' + setParts.join(', ');

    const result = await dynamodb
      .update({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    const { password, ...userWithoutPassword } = result.Attributes;
    return userWithoutPassword;
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  updateUser,
};
