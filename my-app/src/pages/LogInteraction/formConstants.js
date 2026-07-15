/**
 * formConstants.js
 *
 * Shared field options and validation used by both
 * StructuredForm (Tab 1) and ConversationalChat (Tab 2).
 *
 * IMPORTANT: INTERACTION_TYPES must be lowercase to match the backend enum:
 *   Literal["visit", "call", "email", "conference", "virtual"]
 */

export const INTERACTION_TYPES = [
  'visit',
  'call',
  'email',
  'conference',
  'virtual',
];

export const PRODUCTS = [
  'CardioPlus',
  'DiabeCare',
  'NeuroPatch',
  'OncoPro',
];

export const FOLLOW_UP_TYPES = [
  'Send literature',
  'Deliver samples',
  'Schedule follow-up visit',
  'Share clinical data',
  'No follow-up needed',
];

export const MOCK_DOCTORS = [
  { id: '1', first_name: 'Dr. Anjali', last_name: 'Mehta',  institution: 'Apollo Hospitals',        specialty: 'Cardiologist'   },
  { id: '2', first_name: 'Dr. Rohan',  last_name: 'Sharma', institution: 'Max Super Speciality',    specialty: 'Diabetologist'  },
  { id: '3', first_name: 'Dr. Priya',  last_name: 'Nair',   institution: 'Fortis Malar Hospital',   specialty: 'Neurologist'    },
  { id: '4', first_name: 'Dr. Vikram', last_name: 'Singh',  institution: 'AIIMS',                   specialty: 'Oncologist'     },
  { id: '5', first_name: 'Dr. Sunita', last_name: 'Reddy',  institution: 'Manipal Hospital',        specialty: 'Cardiologist'   },
];

/**
 * Empty form shape — the single source of truth for both tabs.
 * Field names match what the form uses internally (camelCase).
 * The save() function in LogInteraction maps these → API snake_case.
 */
export const EMPTY_FORM = {
  doctorId:        null,
  hospital:        '',
  date:            new Date().toISOString().split('T')[0],  // "YYYY-MM-DD"
  interactionType: '',
  product:         '',
  notes:           '',
  followUp:        '',
};

/**
 * validate(form) → errors object
 * Returns an empty object when the form is valid.
 */
export const validate = (form) => {
  const e = {};
  if (!form.doctorId)        e.doctorId        = 'Please select a doctor.';
  if (!form.date)            e.date            = 'Date is required.';
  if (!form.interactionType) e.interactionType = 'Interaction type is required.';
  return e;
};

/**
 * toApiPayload(form) → InteractionCreate shape
 *
 * Maps the internal camelCase form state to the exact snake_case
 * fields the FastAPI backend expects for POST /interactions.
 *
 * Backend InteractionCreate requires:
 *   doctor_id        uuid        (required)
 *   interaction_date datetime    (required, ISO 8601)
 *   interaction_type string      (required, lowercase enum)
 *   product_discussed string?    (optional)
 *   notes            string?     (optional)
 *   status           string      (defaults to "draft")
 */
export const toApiPayload = (form) => ({
  doctor_id:         form.doctorId,
  // API requires a full datetime — append T00:00:00 if only date given
  interaction_date:  form.date
    ? (form.date.includes('T') ? form.date : `${form.date}T00:00:00`)
    : null,
  interaction_type:  form.interactionType
    ? form.interactionType.toLowerCase()
    : null,
  product_discussed: form.product    || null,
  notes:             form.notes      || null,
  // Map follow-up action text into notes addendum if no separate field
  summary:           form.followUp
    ? `Follow-up: ${form.followUp}`
    : null,
  status:            'draft',
});
