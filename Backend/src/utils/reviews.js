/**
 * DynamoDB Reviews Operations
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const REVIEWS_TABLE = process.env.REVIEWS_TABLE || 'restaurant-api-reviews-dev';

/**
 * Create a new review
 */
const createReview = async (reviewData) => {
  try {
    const reviewId = uuidv4();
    const timestamp = new Date().toISOString();

    const item = {
      reviewId,
      name: reviewData.name,
      rating: reviewData.rating,
      text: reviewData.text,
      status: 'published', // auto-publish per user preference
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: REVIEWS_TABLE,
        Item: item,
      })
      .promise();

    return item;
  } catch (error) {
    throw new Error(`Error creating review: ${error.message}`);
  }
};

/**
 * Get a review by id
 */
const getReviewById = async (reviewId) => {
  try {
    const result = await dynamodb
      .get({
        TableName: REVIEWS_TABLE,
        Key: { reviewId },
      })
      .promise();

    return result.Item || null;
  } catch (error) {
    throw new Error(`Error fetching review: ${error.message}`);
  }
};

/**
 * Get all published reviews (uses GSI on status)
 */
const getPublishedReviews = async () => {
  try {
    const result = await dynamodb
      .query({
        TableName: REVIEWS_TABLE,
        IndexName: 'statusIndex',
        KeyConditionExpression: '#s = :status',
        ExpressionAttributeNames: {
          '#s': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'published',
        },
        ScanIndexForward: false, // newest first
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    throw new Error(`Error querying reviews: ${error.message}`);
  }
};

/**
 * Delete a review
 */
const deleteReview = async (reviewId) => {
  try {
    await dynamodb
      .delete({
        TableName: REVIEWS_TABLE,
        Key: { reviewId },
      })
      .promise();

    return true;
  } catch (error) {
    throw new Error(`Error deleting review: ${error.message}`);
  }
};

module.exports = {
  createReview,
  getReviewById,
  getPublishedReviews,
  deleteReview,
};
