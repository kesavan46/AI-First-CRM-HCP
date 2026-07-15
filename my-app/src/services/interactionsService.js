import apiClient from './apiClient';

/**
 * interactionsService
 *
 * Maps to FastAPI router: /api/v1/interactions
 *
 * API pagination uses skip/limit (not page/pageSize).
 * Filters: status, interaction_type, doctor_id
 *
 * Response envelope: { items, total, skip, limit, page, pages }
 */

const interactionsService = {
  /**
   * GET /interactions
   * params: { skip, limit, status, interaction_type, doctor_id }
   */
  getAll: (params = {}) => apiClient.get('/interactions', { params }),

  /** GET /interactions/{id} */
  getById: (id) => apiClient.get(`/interactions/${id}`),

  /** POST /interactions */
  create: (payload) => apiClient.post('/interactions', payload),

  /** PUT /interactions/{id} — full replace */
  update: (id, payload) => apiClient.put(`/interactions/${id}`, payload),

  /** PATCH /interactions/{id} — partial update */
  patch: (id, payload) => apiClient.patch(`/interactions/${id}`, payload),

  /** DELETE /interactions/{id} */
  remove: (id) => apiClient.delete(`/interactions/${id}`),

  /** GET /interactions/doctor/{doctor_id} */
  getByDoctor: (doctorId, params = {}) =>
    apiClient.get(`/interactions/doctor/${doctorId}`, { params }),
};

export default interactionsService;
