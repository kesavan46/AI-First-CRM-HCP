import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Chip, Grid, Divider,
  Button, IconButton, Stack, Avatar, CircularProgress,
} from '@mui/material';
import CloseIcon        from '@mui/icons-material/Close';
import EditIcon         from '@mui/icons-material/Edit';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import EventIcon        from '@mui/icons-material/Event';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { getDoctorName } from '../../utils/doctorHelpers';

const SENTIMENT_COLOR = { positive: 'success', neutral: 'default', negative: 'error' };
const STATUS_COLOR    = { draft: 'default', submitted: 'info', reviewed: 'success' };
const TYPE_ICON_BG    = { visit: '#EDE9FE', call: '#D1FAE5', email: '#DBEAFE', conference: '#FEF3C7', virtual: '#FCE7F3' };
const TYPE_ICON_FG    = { visit: '#7C3AED', call: '#059669', email: '#2563EB', conference: '#D97706', virtual: '#DB2777' };

const Field = ({ label, value, mono = false }) => (
  <Box>
    <Typography variant="caption" fontWeight={700} color="text.secondary"
      sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={value ? 500 : 400}
      color={value ? 'text.primary' : 'text.disabled'}
      sx={mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : {}}>
      {value || '—'}
    </Typography>
  </Box>
);

/**
 * ViewInteractionDialog
 *
 * Props:
 *   open        – boolean
 *   interaction – InteractionRead or InteractionSummary from Redux
 *   onClose     – () => void
 *   onEdit      – () => void  opens the edit dialog for this record
 */
const ViewInteractionDialog = ({ open, interaction, onClose, onEdit }) => {
  if (!interaction) return null;

  const doctorName = getDoctorName(interaction.doctor);
  const doctorSpec = interaction.doctor?.specialty ?? '';

  const fmtDate = (dt) => {
    if (!dt) return null;
    return new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    });
  };

  const initials = doctorName.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('');
  const itype    = interaction.interaction_type ?? interaction.type ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Interaction Details</Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Doctor header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontWeight: 700, fontSize: 18 }}>
            {initials}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{doctorName}</Typography>
            {doctorSpec && <Typography variant="caption" color="text.secondary">{doctorSpec}</Typography>}
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              label={itype}
              size="small"
              sx={{
                bgcolor: TYPE_ICON_BG[itype] ?? '#F1F5F9',
                color:   TYPE_ICON_FG[itype] ?? '#475569',
                fontWeight: 600, textTransform: 'capitalize',
              }}
            />
            <Chip
              label={interaction.status ?? 'draft'}
              size="small"
              color={STATUS_COLOR[interaction.status] ?? 'default'}
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Core fields */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6}>
            <Field label="Date & Time" value={fmtDate(interaction.interaction_date ?? interaction.date)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Product Discussed" value={interaction.product_discussed ?? interaction.product} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Follow-up Date" value={fmtDate(interaction.follow_up_date ?? interaction.followUpDate)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Interaction ID" value={String(interaction.id).slice(0, 8) + '…'} mono />
          </Grid>
        </Grid>

        {/* Summary */}
        {(interaction.summary) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
              Summary
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{interaction.summary}</Typography>
            </Box>
          </Box>
        )}

        {/* Notes */}
        {(interaction.notes) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 0.5 }}>
              Notes
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2,
              border: '1px solid', borderColor: 'divider', maxHeight: 150, overflowY: 'auto' }}>
              <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {interaction.notes}
              </Typography>
            </Box>
          </Box>
        )}

        {/* AI section */}
        {(interaction.ai_processed || interaction.ai_summary) && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={700} color="primary.main"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                AI Analysis
              </Typography>
              {interaction.ai_sentiment && (
                <Chip
                  label={interaction.ai_sentiment}
                  size="small"
                  color={SENTIMENT_COLOR[interaction.ai_sentiment] ?? 'default'}
                  sx={{ ml: 'auto', textTransform: 'capitalize', fontWeight: 600 }}
                />
              )}
            </Box>

            {interaction.ai_summary && (
              <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 2,
                border: '1px solid', borderColor: 'primary.light', mb: 1.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {interaction.ai_summary}
                </Typography>
              </Box>
            )}

            {interaction.ai_action_items?.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary"
                  sx={{ display: 'block', mb: 0.75 }}>Action Items</Typography>
                <Stack spacing={0.5}>
                  {interaction.ai_action_items.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main', mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button onClick={onEdit} variant="contained" startIcon={<EditIcon />}>
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewInteractionDialog;
