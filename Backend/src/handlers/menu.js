'use strict';

const menu = require('../utils/menu');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * GET /menu - Fetch all menu items (public, no auth required)
 * Supports optional ?category= query parameter
 */
module.exports.getMenu = async (event) => {
  console.log('GET /menu - Fetching menu items');

  try {
    const category = event.queryStringParameters?.category;

    let items;
    if (category) {
      items = await menu.getMenuItemsByCategory(category);
    } else {
      items = await menu.getAllMenuItems();
    }

    // Group items by category for convenience
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: grouped, items }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to fetch menu' }),
      headers: HEADERS,
    };
  }
};

/**
 * GET /menu/{id} - Fetch a single menu item by id (public)
 */
module.exports.getMenuItem = async (event) => {
  console.log('GET /menu/:id - Fetching menu item');

  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Item id is required' }),
        headers: HEADERS,
      };
    }

    const item = await menu.getMenuItemById(id);
    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Menu item not found' }),
        headers: HEADERS,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: item }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
      headers: HEADERS,
    };
  }
};

/**
 * POST /menu - Create a new menu item (authenticated)
 */
module.exports.createMenuItem = async (event) => {
  console.log('POST /menu - Creating menu item');

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, price, category } = body;

    if (!name || price === undefined || !category) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'name, price, and category are required',
        }),
        headers: HEADERS,
      };
    }

    const item = await menu.createMenuItem({
      name,
      price: parseFloat(price),
      category,
      description: body.description || '',
      image: body.image || '',
      available: body.available !== undefined ? body.available : true,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: item }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error creating menu item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
      headers: HEADERS,
    };
  }
};

/**
 * PUT /menu/{id} - Update a menu item (authenticated)
 */
module.exports.updateMenuItem = async (event) => {
  console.log('PUT /menu/:id - Updating menu item');

  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Item id is required' }),
        headers: HEADERS,
      };
    }

    // Verify item exists
    const existing = await menu.getMenuItemById(id);
    if (!existing) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Menu item not found' }),
        headers: HEADERS,
      };
    }

    const body = JSON.parse(event.body || '{}');

    // Only allow updating specific fields
    const allowedFields = ['name', 'description', 'price', 'category', 'image', 'available'];
    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = field === 'price' ? parseFloat(body[field]) : body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'No valid fields to update' }),
        headers: HEADERS,
      };
    }

    const updated = await menu.updateMenuItem(id, updateData);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: updated }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error updating menu item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
      headers: HEADERS,
    };
  }
};

/**
 * DELETE /menu/{id} - Delete a menu item (authenticated)
 */
module.exports.deleteMenuItem = async (event) => {
  console.log('DELETE /menu/:id - Deleting menu item');

  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Item id is required' }),
        headers: HEADERS,
      };
    }

    // Verify item exists
    const existing = await menu.getMenuItemById(id);
    if (!existing) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Menu item not found' }),
        headers: HEADERS,
      };
    }

    await menu.deleteMenuItem(id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Menu item deleted successfully' }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
      headers: HEADERS,
    };
  }
};
