import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, MenuItem, Button, CircularProgress,
  IconButton, Typography, Divider, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon  from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { updateInteractionThunk } from '../../store/slices/interactionsThunks';
import { selectInteractionsLoading } from '../../store/slices/interactionsSlice';
import { ApiErrorBanner } from '../common/ApiErrorBanner';
import { getDoctorName } from '../../utils/doctorHelpers';

const TYPES   = ['visit','call','email','conference','virtual'];
const STATUSES = ['draft','submitted','reviewed'];
const PRODUCTS = ['CardioPlus','DiabeCare','NeuroPatch','OncoPro'];

const toFormDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toISOString().slice(0, 16); // datetime-local format
};

/**
 * EditInteractionDialog
 *
 * Props:
 *   open        – boolean
 *   interaction – the row object to edit (InteractionSummary or InteractionRead)
 *   onClose     – () => void
 *   onSaved     – () => void  called after a successful PATCH
 */
const EditInteractionDialog = ({ open, interaction, onClose, onSaved }) => {
  const dispatch  = useDispatch();
  const isLoading = useSelector(selectInteractionsLoading);

  const [form,   setForm]   = useState({});
  const [errors, setErrors] = useState({});

  // Populate form when dialog opens
  useEffect(() => {
    if (interaction) {
      setForm({
        interaction_date:  toFormDate(interaction.interaction_date ?? interaction.date),
        interaction_type:  interaction.interaction_type ?? interaction.type ?? '',
        product_discussed: interaction.product_discussed ?? interaction.product ?? '',
        summary:           interaction.summary ?? '',
        notes:             interaction.notes ?? '',
        follow_up_date:    toFormDate(interaction.follow_up_date ?? interaction.followUpDate),
        status:            interaction.status ?? 'draft',
      });
      setErrors({});
    }
  }, [interaction]);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.interaction_date) e.interaction_date = 'Date is required.';
    if (!form.interaction_type) e.interaction_type = 'Type is required.';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      interaction_date:  form.interaction_date  || null,
      interaction_type:  form.interaction_type  || null,
      product_discussed: form.product_discussed || null,
      summary:           form.summary           || null,
      notes:             form.notes             || null,
      follow_up_date:    form.follow_up_date    || null,
      status:            form.status            || 'draft',
    };

    const result = await dispatch(
      updateInteractionThunk({ id: interaction.id, payload })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      onSaved?.();
      onClose();
    }
  };

  if (!interaction) return null;

  const doctorName = getDoctorName(interaction.doctor);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Edit Interaction</Typography>
        <IconButton size="small" onClick={onClose} aria-label="close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Editing interaction with <strong>{doctorName}</strong>
        </Typography>

        <ApiErrorBanner errorKey="interactions/update" />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" type="datetime-local"
              label="Interaction Date *" value={form.interaction_date ?? ''}
              onChange={set('interaction_date')} InputLabelProps={{ shrink: true }}
              error={Boolean(errors.interaction_date)} helperText={errors.interaction_date} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Type *"
              value={form.interaction_type ?? ''}
              onChange={set('interaction_type')}
              error={Boolean(errors.interaction_type)} helperText={errors.interaction_type}>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Product"
              value={form.product_discussed ?? ''}
              onChange={set('product_discussed')}>
              <MenuItem value=""><em>None</em></MenuItem>
              {PRODUCTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField select fullWidth size="small" label="Status"
              value={form.status ?? 'draft'} onChange={set('status')}>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth size="small" type="datetime-local"
              label="Follow-up Date" value={form.follow_up_date ?? ''}
              onChange={set('follow_up_date')} InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Summary"
              value={form.summary ?? ''} onChange={set('summary')}
              placeholder="Short summary of the interaction…" />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} size="small" label="Notes"
              value={form.notes ?? ''} onChange={set('notes')}
              placeholder="Detailed notes, objections, feedback…"
              inputProps={{ maxLength: 3000 }}
              helperText={`${(form.notes ?? '').length}/3000`} />
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSave} variant="contained"
          startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditInteractionDialog;
