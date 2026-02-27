/**
 * Mock Reservations Storage (In-Memory)
 */

const { v4: uuidv4 } = require('uuid');

let reservations = [];

const createReservation = async (data) => {
  const reservationId = uuidv4();
  const timestamp = new Date().toISOString();
  const item = {
    reservationId,
    ...data,
    status: data.status || 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  reservations.push(item);
  return item;
};

const getReservationById = async (id) => {
  return reservations.find(r => r.reservationId === id) || null;
};

const getReservationsByUser = async (userId) => {
  return reservations.filter(r => r.userId === userId);
};

const getAllReservations = async () => reservations;

const updateReservation = async (id, updateData) => {
  const idx = reservations.findIndex(r => r.reservationId === id);
  if (idx === -1) return null;
  reservations[idx] = { ...reservations[idx], ...updateData, updatedAt: new Date().toISOString() };
  return reservations[idx];
};

const deleteReservation = async (id) => {
  const idx = reservations.findIndex(r => r.reservationId === id);
  if (idx === -1) return false;
  reservations.splice(idx, 1);
  return true;
};

module.exports = {
  createReservation,
  getReservationById,
  getReservationsByUser,
  getAllReservations,
  updateReservation,
  deleteReservation,
};
