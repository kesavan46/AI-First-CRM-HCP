import apiClient from './apiClient';

/**
 * Doctors Service
 * All API calls related to the HCP (Healthcare Professional) directory.
 */

const doctorsService = {
  /** Fetch paginated+filtered list. params: { page, pageSize, q, specialty, territory, tier } */
  getAll: (params = {}) => apiClient.get('/doctors', { params }),

  /** Fetch a single doctor profile by id */
  getById: (id) => apiClient.get(`/doctors/${id}`),

  /** Fetch all interaction history for a specific doctor */
  getInteractions: (id, params = {}) =>
    apiClient.get(`/interactions/doctor/${id}`, { params }),

  /** Create a doctor record */
  create: (payload) => apiClient.post('/doctors', payload),

  /** Update a doctor record */
  update: (id, payload) => apiClient.put(`/doctors/${id}`, payload),
};

export default doctorsService;
