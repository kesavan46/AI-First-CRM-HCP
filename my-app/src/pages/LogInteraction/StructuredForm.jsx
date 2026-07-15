import {
  Box, Grid, TextField, MenuItem, Button,
  Divider, CircularProgress, Autocomplete, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  INTERACTION_TYPES, PRODUCTS, FOLLOW_UP_TYPES, MOCK_DOCTORS, EMPTY_FORM, validate,
} from './formConstants';
import { useSelector } from 'react-redux';
import { selectAllDoctors } from '../../store/slices/doctorsSlice';
import { getDoctorName, getDoctorInstitution } from '../../utils/doctorHelpers';

/**
 * StructuredForm — Tab 1
 *
 * Props:
 *   form        – current form values (controlled from parent)
 *   setForm     – setter
 *   errors      – validation error map
 *   setErrors   – error setter
 *   onSubmit    – async (form) => void  called when form is valid
 */
const StructuredForm = ({ form, setForm, errors, setErrors, onSubmit, isLoading = false }) => {
  const allDoctors = useSelector(selectAllDoctors);

  const doctors = allDoctors.length > 0 ? allDoctors : MOCK_DOCTORS;

  const handleField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleDoctor = (_, value) => {
    setForm((p) => ({
      ...p,
      doctorId: value?.id ?? null,
      // Use institution from API shape, fallback to hospital for mock data
      hospital: getDoctorInstitution(value) || value?.hospital || '',
    }));
    setErrors((p) => ({ ...p, doctorId: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const selectedDoctor = doctors.find((d) => d.id === form.doctorId) ?? null;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2.5}>

        {/* ── Row 1: Doctor + Hospital ── */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={doctors}
            // Use getDoctorName to handle both API (first_name/last_name) and mock (name) shapes
            getOptionLabel={(o) => getDoctorName(o) || o.name || ''}
            value={selectedDoctor}
            onChange={handleDoctor}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {getDoctorName(option)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.specialty ?? ''}{option.specialty && (getDoctorInstitution(option) || option.hospital) ? ' · ' : ''}
                    {getDoctorInstitution(option) || option.hospital || ''}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Doctor *"
                error={Boolean(errors.doctorId)}
                helperText={errors.doctorId ?? 'Start typing to search'}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Hospital / Clinic"
            value={form.hospital}
            onChange={handleField('hospital')}
            placeholder="Auto-filled when doctor is selected"
            InputLabelProps={{ shrink: Boolean(form.hospital) || undefined }}
          />
        </Grid>

        {/* ── Row 2: Date + Interaction Type ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="date"
            label="Date *"
            value={form.date}
            onChange={handleField('date')}
            error={Boolean(errors.date)}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: new Date().toISOString().split('T')[0] }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Interaction Type *"
            value={form.interactionType}
            onChange={handleField('interactionType')}
            error={Boolean(errors.interactionType)}
            helperText={errors.interactionType}
          >
            {INTERACTION_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* ── Row 2 col 3: Product ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Product Discussed"
            value={form.product}
            onChange={handleField('product')}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {PRODUCTS.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* ── Row 3: Notes ── */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Notes"
            placeholder="Summarise the conversation — topics covered, doctor's feedback, objections raised, samples discussed…"
            value={form.notes}
            onChange={handleField('notes')}
            inputProps={{ maxLength: 3000 }}
            helperText={`${form.notes.length} / 3000`}
          />
        </Grid>

        {/* ── Row 4: Follow-up ── */}
        <Grid item xs={12} md={8}>
          <TextField
            select
            fullWidth
            label="Follow-up Action"
            value={form.followUp}
            onChange={handleField('followUp')}
          >
            <MenuItem value=""><em>None required</em></MenuItem>
            {FOLLOW_UP_TYPES.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </TextField>
        </Grid>

      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Action row */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={
            isLoading
              ? <CircularProgress size={16} color="inherit" />
              : <SaveIcon />
          }
          disabled={isLoading}
          aria-label="save interaction"
        >
          {isLoading ? 'Saving…' : 'Save Interaction'}
        </Button>
      </Box>
    </Box>
  );
};

export default StructuredForm;
