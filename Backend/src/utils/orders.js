/**
 * DynamoDB Orders Operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'restaurant-api-orders-dev';

/**
 * Create a new order
 */
const createOrder = async (orderData) => {
  try {
    const orderId = uuidv4();
    const timestamp = new Date().toISOString();

    const item = {
      orderId,
      ...orderData,
      status: 'confirmed',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: ORDERS_TABLE,
        Item: item,
      })
      .promise();

    return item;
  } catch (error) {
    throw new Error(`Error creating order: ${error.message}`);
  }
};

/**
 * Get order by id
 */
const getOrderById = async (orderId) => {
  try {
    const result = await dynamodb
      .get({
        TableName: ORDERS_TABLE,
        Key: { orderId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    throw new Error(`Error fetching order: ${error.message}`);
  }
};

/**
 * Get orders by userId (uses GSI)
 */
const getOrdersByUser = async (userId) => {
  try {
    const result = await dynamodb
      .query({
        TableName: ORDERS_TABLE,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: {
          ':uid': userId,
        },
        ScanIndexForward: false, // newest first
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error querying orders: ${error.message}`);
  }
};

/**
 * Update order
 */
const updateOrder = async (orderId, updateData) => {
  try {
    const timestamp = new Date().toISOString();

    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    const setClauses = Object.keys(updateData).map((k) => {
      expressionAttributeNames[`#${k}`] = k;
      expressionAttributeValues[`:${k}`] = updateData[k];
      return `#${k} = :${k}`;
    });

    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;
    setClauses.push('#updatedAt = :updatedAt');

    const result = await dynamodb
      .update({
        TableName: ORDERS_TABLE,
        Key: { orderId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    return result.Attributes || null;
  } catch (error) {
    throw new Error(`Error updating order: ${error.message}`);
  }
};

/**
 * Delete order
 */
const deleteOrder = async (orderId) => {
  try {
    await dynamodb
      .delete({
        TableName: ORDERS_TABLE,
        Key: { orderId },
      })
      .promise();

    return true;
  } catch (error) {
    throw new Error(`Error deleting order: ${error.message}`);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrder,
  deleteOrder,
};
