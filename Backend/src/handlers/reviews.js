'use strict';

const reviews = require('../utils/reviews');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * GET /reviews - Fetch all published reviews (public, no auth required)
 */
module.exports.getReviews = async (event) => {
  console.log('GET /reviews - Fetching published reviews');

  try {
    const items = await reviews.getPublishedReviews();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: items }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to fetch reviews' }),
      headers: HEADERS,
    };
  }
};

/**
 * POST /reviews - Submit a new review (public, guest allowed)
 * Body: { name: string, rating: number (1-5), text: string }
 */
module.exports.createReview = async (event) => {
  console.log('POST /reviews - Creating review');

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, rating, text } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Name is required' }),
        headers: HEADERS,
      };
    }

    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Review text is required' }),
        headers: HEADERS,
      };
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Rating must be a number between 1 and 5' }),
        headers: HEADERS,
      };
    }

    // Sanitize inputs
    const reviewData = {
      name: name.trim().substring(0, 100),
      rating: Math.round(rating), // ensure integer
      text: text.trim().substring(0, 1000),
    };

    const review = await reviews.createReview(reviewData);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: review }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error creating review:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to submit review' }),
      headers: HEADERS,
    };
  }
};
