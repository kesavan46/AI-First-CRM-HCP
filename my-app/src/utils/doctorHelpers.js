/**
 * doctorHelpers.js
 *
 * The backend DoctorSummary shape:
 *   { id, first_name, last_name, specialty, institution }
 *
 * These helpers centralise the field mapping so every component
 * reads the same way regardless of where the doctor object comes from.
 */

/**
 * Returns the full display name for a doctor object.
 * Handles both backend shape (first_name/last_name) and any legacy
 * frontend shape (name) gracefully.
 *
 * @param {object|null} doctor
 * @returns {string}
 */
export const getDoctorName = (doctor) => {
  if (!doctor) return 'Unknown Doctor';
  if (doctor.first_name || doctor.last_name) {
    return `${doctor.first_name ?? ''} ${doctor.last_name ?? ''}`.trim();
  }
  // fallback for any legacy shape
  return doctor.name ?? doctor.full_name ?? 'Unknown Doctor';
};

/**
 * Returns the institution/hospital for a doctor object.
 *
 * @param {object|null} doctor
 * @returns {string}
 */
export const getDoctorInstitution = (doctor) => {
  if (!doctor) return '';
  return doctor.institution ?? doctor.hospital ?? '';
};
