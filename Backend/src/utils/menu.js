/**
 * DynamoDB Menu Operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const MENU_TABLE = process.env.MENU_TABLE || 'restaurant-api-menu-dev';

/**
 * Create a new menu item
 */
const createMenuItem = async (itemData) => {
  try {
    const itemId = uuidv4();
    const timestamp = new Date().toISOString();

    const item = {
      itemId,
      name: itemData.name,
      description: itemData.description || '',
      price: itemData.price,
      category: itemData.category, // e.g. 'appetizers', 'mains', 'desserts', 'drinks'
      image: itemData.image || '',
      available: itemData.available !== undefined ? itemData.available : true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: MENU_TABLE,
        Item: item,
      })
      .promise();

    return item;
  } catch (error) {
    throw new Error(`Error creating menu item: ${error.message}`);
  }
};

/**
 * Get menu item by id
 */
const getMenuItemById = async (itemId) => {
  try {
    const result = await dynamodb
      .get({
        TableName: MENU_TABLE,
        Key: { itemId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    throw new Error(`Error fetching menu item: ${error.message}`);
  }
};

/**
 * Get menu items by category (uses GSI)
 */
const getMenuItemsByCategory = async (category) => {
  try {
    const result = await dynamodb
      .query({
        TableName: MENU_TABLE,
        IndexName: 'categoryIndex',
        KeyConditionExpression: 'category = :cat',
        ExpressionAttributeValues: {
          ':cat': category,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error querying menu items by category: ${error.message}`);
  }
};

/**
 * Get all menu items (scan)
 */
const getAllMenuItems = async () => {
  try {
    const result = await dynamodb
      .scan({ TableName: MENU_TABLE })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error scanning menu items: ${error.message}`);
  }
};

/**
 * Update a menu item
 */
const updateMenuItem = async (itemId, updateData) => {
  try {
    const timestamp = new Date().toISOString();

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
        TableName: MENU_TABLE,
        Key: { itemId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    return result.Attributes || null;
  } catch (error) {
    throw new Error(`Error updating menu item: ${error.message}`);
  }
};

/**
 * Delete a menu item
 */
const deleteMenuItem = async (itemId) => {
  try {
    await dynamodb
      .delete({
        TableName: MENU_TABLE,
        Key: { itemId },
      })
      .promise();

    return true;
  } catch (error) {
    throw new Error(`Error deleting menu item: ${error.message}`);
  }
};

module.exports = {
  createMenuItem,
  getMenuItemById,
  getMenuItemsByCategory,
  getAllMenuItems,
  updateMenuItem,
  deleteMenuItem,
};
