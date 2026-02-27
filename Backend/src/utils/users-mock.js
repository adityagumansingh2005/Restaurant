/**
 * Mock User Storage (In-Memory)
 * Used for local development without requiring DynamoDB
 * Replace with DynamoDB operations in production
 */

const { v4: uuidv4 } = require('uuid');

// In-memory user store
let users = [];

/**
 * Create a new user
 */
const createUser = async (email, hashedPassword, userData = {}) => {
  try {
    // Check if email already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

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

    users.push(user);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  try {
    const user = users.find(u => u.email === email);
    return user || null;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
};

/**
 * Get user by userId
 */
const getUserById = async (userId) => {
  try {
    const user = users.find(u => u.userId === userId);
    return user || null;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
};

/**
 * Update user
 */
const updateUser = async (userId, updateData) => {
  try {
    const userIndex = users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const timestamp = new Date().toISOString();
    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: timestamp,
    };

    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

/**
 * Get all users (for debugging)
 */
const getAllUsers = async () => {
  return users.map(({ password, ...user }) => user);
};

/**
 * Clear all users (for testing)
 */
const clearAllUsers = () => {
  users = [];
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getAllUsers,
  clearAllUsers,
};
