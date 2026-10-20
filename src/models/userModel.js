/**
 * User Data Model / Store
 * Provides persistent-in-memory storage and abstraction for user records.
 */

const crypto = require('crypto');

class UserModel {
  constructor() {
    this.users = [];
  }

  /**
   * Find a user by their unique ID
   * @param {string} id
   * @returns {Object|null}
   */
  findById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  /**
   * Find a user by their email address (case-insensitive)
   * @param {string} email
   * @returns {Object|null}
   */
  findByEmail(email) {
    if (!email) return null;
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  /**
   * Create and store a new user
   * @param {Object} userData - { name, email, password, role }
   * @returns {Object} Newly created user
   */
  create({ name, email, password, role = 'student' }) {
    const newUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Hashed password passed from controller
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);
    return newUser;
  }

  /**
   * Remove sensitive fields such as password from user object
   * @param {Object} user
   * @returns {Object} Sanitized user
   */
  sanitize(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Reset the store (useful for automated testing)
   */
  clear() {
    this.users = [];
  }

  /**
   * Get all users (sanitized)
   * @returns {Array}
   */
  getAll() {
    return this.users.map((u) => this.sanitize(u));
  }
}

// Export singleton instance
const userModel = new UserModel();
module.exports = userModel;
