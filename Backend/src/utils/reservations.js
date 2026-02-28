/**
 * DynamoDB Reservations Operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const RESERVATIONS_TABLE = process.env.RESERVATIONS_TABLE || 'restaurant-reservations';

/**
 * Create a new reservation
 */
const createReservation = async (reservationData) => {
  try {
    const reservationId = uuidv4();
    const timestamp = new Date().toISOString();

    const item = {
      reservationId,
      ...reservationData,
      status: reservationData.status || 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: RESERVATIONS_TABLE,
        Item: item,
      })
      .promise();

    return item;
  } catch (error) {
    throw new Error(`Error creating reservation: ${error.message}`);
  }
};

/**
 * Get reservation by id
 */
const getReservationById = async (reservationId) => {
  try {
    const result = await dynamodb
      .get({
        TableName: RESERVATIONS_TABLE,
        Key: { reservationId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    throw new Error(`Error fetching reservation: ${error.message}`);
  }
};

/**
 * Get reservations by userId (uses GSI)
 */
const getReservationsByUser = async (userId) => {
  try {
    const result = await dynamodb
      .query({
        TableName: RESERVATIONS_TABLE,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: {
          ':uid': userId,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error querying reservations: ${error.message}`);
  }
};

/**
 * Get all reservations (scan) - use with care
 */
const getAllReservations = async () => {
  try {
    const result = await dynamodb
      .scan({ TableName: RESERVATIONS_TABLE })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error scanning reservations: ${error.message}`);
  }
};

/**
 * Update reservation
 */
const updateReservation = async (reservationId, updateData) => {
  try {
    const timestamp = new Date().toISOString();

    // Use ExpressionAttributeNames to handle DynamoDB reserved words (e.g. "name", "status")
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    const setClauses = Object.keys(updateData).map((k) => {
      expressionAttributeNames[`#${k}`] = k;
      expressionAttributeValues[`:${k}`] = updateData[k];
      return `#${k} = :${k}`;
    });

    // Add updatedAt
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;
    setClauses.push('#updatedAt = :updatedAt');

    const result = await dynamodb
      .update({
        TableName: RESERVATIONS_TABLE,
        Key: { reservationId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    return result.Attributes || null;
  } catch (error) {
    throw new Error(`Error updating reservation: ${error.message}`);
  }
};

/**
 * Delete reservation
 */
const deleteReservation = async (reservationId) => {
  try {
    await dynamodb
      .delete({
        TableName: RESERVATIONS_TABLE,
        Key: { reservationId },
      })
      .promise();

    return true;
  } catch (error) {
    throw new Error(`Error deleting reservation: ${error.message}`);
  }
};

module.exports = {
  createReservation,
  getReservationById,
  getReservationsByUser,
  getAllReservations,
  updateReservation,
  deleteReservation,
};
