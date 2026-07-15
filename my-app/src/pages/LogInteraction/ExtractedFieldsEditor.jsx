import {
  Box, Typography, TextField, MenuItem, Divider,
  Button, Chip, CircularProgress, Tooltip, IconButton,
  Collapse, Alert,
} from '@mui/material';
import SaveIcon          from '@mui/icons-material/Save';
import ContentPasteIcon  from '@mui/icons-material/ContentPaste';
import EditIcon          from '@mui/icons-material/Edit';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import SmartToyIcon      from '@mui/icons-material/SmartToy';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateExtractedField,
  selectLatestExtractedFields,
  selectHasExtractedFields,
} from '../../store/slices/chatSlice';
import { selectInteractionsLoading } from '../../store/slices/interactionsSlice';
import { INTERACTION_TYPES, PRODUCTS, FOLLOW_UP_TYPES } from './formConstants';

/**
 * Map camelCase extracted fields (Redux chatSlice shape) →
 * snake_case API payload (InteractionCreate shape).
 *
 * NOTE: doctor_id cannot be resolved from a name string here —
 * if not available the field is omitted and the thunk will 422.
 * For chat-save we rely on the doctor lookup or fallback.
 */
const extractedToApiPayload = (fields) => ({
  // doctor_id must be a UUID — chat extraction gives us a name, not an id.
  // We set it to null here; the thunk will reject if missing.
  // Users should use "Transfer to Form" to pick the correct doctor.
  doctor_id:         fields.doctorId ?? null,
  interaction_date:  fields.date
    ? (fields.date.includes('T') ? fields.date : `${fields.date}T00:00:00`)
    : new Date().toISOString(),
  interaction_type:  fields.interactionType
    ? fields.interactionType.toLowerCase()
    : 'visit',
  product_discussed: fields.product   || null,
  notes:             fields.notes     || null,
  summary:           fields.followUp  ? `Follow-up: ${fields.followUp}` : null,
  status:            'draft',
});

/**
 * ExtractedFieldsEditor
 *
 * Right-panel of the ConversationalChat tab.
 * Reads latestExtractedFields from Redux chatSlice.
 * Every field is directly editable — changes dispatch updateExtractedField.
 *
 * Props:
 *   onSave     – async (fields) => void    called on "Save Interaction"
 *   onTransfer – (fields) => void          pre-fills Tab 1 and switches to it
 */
const ExtractedFieldsEditor = ({ onSave, onTransfer }) => {
  const dispatch   = useDispatch();
  const fields     = useSelector(selectLatestExtractedFields);
  const hasData    = useSelector(selectHasExtractedFields);
  const isSaving   = useSelector(selectInteractionsLoading);

  const set = (field) => (e) =>
    dispatch(updateExtractedField({ field, value: e.target.value }));

  // Confidence indicator — fields with values are "confirmed"
  const filledCount = Object.values(fields).filter((v) => v && v !== '').length;
  const totalFields = Object.keys(fields).length;
  const confidence  = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <Box sx={{
        px: 2.5, py: 2,
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        color: 'white',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <SmartToyIcon sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700}>AI Extracted Fields</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {hasData
              ? `${filledCount} of ${totalFields} fields populated — edit any field below`
              : 'Send a message to extract interaction details'}
          </Typography>
          {hasData && (
            <Chip
              label={`${confidence}%`}
              size="small"
              icon={<CheckCircleIcon style={{ fontSize: 12, color: 'white' }} />}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white',
                fontWeight: 700, fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
      </Box>

      {/* ── Editable fields ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
        {!hasData ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <SmartToyIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220, mx: 'auto' }}>
              Start chatting. Fields will appear here as the AI extracts them.
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Try: "I met Dr Ravi today at Apollo…"
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Doctor name */}
            <FieldRow label="Doctor">
              <TextField
                fullWidth size="small"
                value={fields.doctorName}
                onChange={set('doctorName')}
                placeholder="e.g. Dr. Ravi Kumar"
                InputProps={{ startAdornment: <EditIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} /> }}
              />
            </FieldRow>

            {/* Hospital */}
            <FieldRow label="Hospital / Clinic">
              <TextField
                fullWidth size="small"
                value={fields.hospital}
                onChange={set('hospital')}
                placeholder="e.g. Apollo Hospitals"
              />
            </FieldRow>

            {/* Date */}
            <FieldRow label="Date">
              <TextField
                fullWidth size="small" type="date"
                value={fields.date}
                onChange={set('date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: new Date().toISOString().split('T')[0] }}
              />
            </FieldRow>

            {/* Interaction type */}
            <FieldRow label="Type">
              <TextField
                select fullWidth size="small"
                value={fields.interactionType}
                onChange={set('interactionType')}
              >
                <MenuItem value=""><em>Select type</em></MenuItem>
                {INTERACTION_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </FieldRow>

            {/* Product */}
            <FieldRow label="Product">
              <TextField
                select fullWidth size="small"
                value={fields.product}
                onChange={set('product')}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {PRODUCTS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </FieldRow>

            {/* Outcome */}
            <FieldRow label="Outcome">
              <TextField
                select fullWidth size="small"
                value={fields.outcome}
                onChange={set('outcome')}
              >
                <MenuItem value=""><em>Select outcome</em></MenuItem>
                {['Positive', 'Neutral', 'Negative'].map((o) => (
                  <MenuItem key={o} value={o.toLowerCase()}>{o}</MenuItem>
                ))}
              </TextField>
            </FieldRow>

            {/* Follow-up */}
            <FieldRow label="Follow-up">
              <TextField
                select fullWidth size="small"
                value={fields.followUp}
                onChange={set('followUp')}
              >
                <MenuItem value=""><em>None required</em></MenuItem>
                {FOLLOW_UP_TYPES.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </TextField>
            </FieldRow>

            {/* Notes */}
            <FieldRow label="Notes">
              <TextField
                fullWidth multiline rows={3} size="small"
                value={fields.notes}
                onChange={set('notes')}
                placeholder="Summary extracted from conversation…"
                inputProps={{ maxLength: 2000 }}
                helperText={`${(fields.notes || '').length}/2000`}
              />
            </FieldRow>

          </Box>
        )}
      </Box>

      {/* ── Actions ── */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Warn user if no doctor_id — direct save will fail */}
        {hasData && !fields.doctorId && (
          <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
            No doctor matched. Use <strong>Transfer to Form</strong> to pick a doctor before saving.
          </Alert>
        )}

        <Tooltip title="Pre-fill Structured Form tab with these fields for review">
          <span>
            <Button
              fullWidth variant="outlined" size="small"
              startIcon={<ContentPasteIcon />}
              onClick={() => onTransfer(fields)}
              disabled={!hasData}
            >
              Transfer to Form
            </Button>
          </span>
        </Tooltip>

        <Button
          fullWidth variant="contained" size="medium"
          startIcon={
            isSaving
              ? <CircularProgress size={14} color="inherit" />
              : <SaveIcon />
          }
          onClick={() => onSave(extractedToApiPayload(fields))}
          disabled={!hasData || isSaving || !fields.doctorId}
          aria-label="save extracted interaction"
          sx={{ fontWeight: 600 }}
        >
          {isSaving ? 'Saving…' : 'Save Interaction'}
        </Button>
      </Box>
    </Box>
  );
};

// ── Helper: labelled field row ─────────────────────────────────────────────
const FieldRow = ({ label, children }) => (
  <Box>
    <Typography variant="caption" fontWeight={600} color="text.secondary"
      sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5, display: 'block' }}>
      {label}
    </Typography>
    {children}
  </Box>
);

export default ExtractedFieldsEditor;
