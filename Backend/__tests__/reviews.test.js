/**
 * Unit Tests - Reviews API
 */

// Mock the reviews utility module
jest.mock('../src/utils/reviews', () => {
  const reviews = {};

  return {
    createReview: jest.fn(async (data) => {
      const review = {
        reviewId: 'test-review-1',
        ...data,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      reviews[review.reviewId] = review;
      return review;
    }),
    getReviewById: jest.fn(async (id) => reviews[id] || null),
    getPublishedReviews: jest.fn(async () =>
      Object.values(reviews).filter((r) => r.status === 'published')
    ),
    deleteReview: jest.fn(async (id) => {
      delete reviews[id];
      return true;
    }),
  };
});

const { getReviews, createReview } = require('../src/handlers/reviews');

describe('Reviews API', () => {
  // ---- GET /reviews ----
  test('GET /reviews - should return 200 with reviews array', async () => {
    const event = {};
    const result = await getReviews(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /reviews - should include CORS headers', async () => {
    const result = await getReviews({});
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  // ---- POST /reviews ----
  test('POST /reviews - should create a review with valid data', async () => {
    const event = {
      body: JSON.stringify({
        name: 'John Doe',
        rating: 5,
        text: 'Excellent food and amazing service!',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('John Doe');
    expect(body.data.rating).toBe(5);
    expect(body.data.text).toBe('Excellent food and amazing service!');
    expect(body.data.reviewId).toBeDefined();
    expect(body.data.status).toBe('published');
    expect(body.data.createdAt).toBeDefined();
  });

  test('POST /reviews - should return 400 if name is missing', async () => {
    const event = {
      body: JSON.stringify({
        rating: 4,
        text: 'Good food!',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Name');
  });

  test('POST /reviews - should return 400 if name is empty string', async () => {
    const event = {
      body: JSON.stringify({
        name: '   ',
        rating: 4,
        text: 'Good food!',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /reviews - should return 400 if text is missing', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Jane',
        rating: 3,
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Review text');
  });

  test('POST /reviews - should return 400 if rating is missing', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Jane',
        text: 'Nice place',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Rating');
  });

  test('POST /reviews - should return 400 if rating is below 1', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Jane',
        rating: 0,
        text: 'Bad food',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /reviews - should return 400 if rating is above 5', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Jane',
        rating: 6,
        text: 'Great food',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /reviews - should return 400 if rating is a string', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Jane',
        rating: 'five',
        text: 'Great food',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /reviews - should truncate name to 100 chars', async () => {
    const longName = 'A'.repeat(200);
    const event = {
      body: JSON.stringify({
        name: longName,
        rating: 4,
        text: 'Good food!',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.data.name.length).toBeLessThanOrEqual(100);
  });

  test('POST /reviews - should truncate text to 1000 chars', async () => {
    const longText = 'B'.repeat(2000);
    const event = {
      body: JSON.stringify({
        name: 'Quick reviewer',
        rating: 3,
        text: longText,
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.data.text.length).toBeLessThanOrEqual(1000);
  });

  test('POST /reviews - should handle empty body gracefully', async () => {
    const event = { body: null };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
  });

  test('POST /reviews - should round decimal ratings to integers', async () => {
    const event = {
      body: JSON.stringify({
        name: 'Math reviewer',
        rating: 3.7,
        text: 'Pretty good overall',
      }),
    };
    const result = await createReview(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.data.rating).toBe(4);
  });
});
