import { useState } from 'react';
import {
  Box, Card, CardContent, Tabs, Tab,
  Typography, Divider, Snackbar, Alert,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ChatIcon     from '@mui/icons-material/Chat';
import { useDispatch, useSelector } from 'react-redux';

import { createInteractionThunk } from '../../store/slices/interactionsThunks';
import { fetchDoctorsThunk }       from '../../store/slices/doctorsThunks';
import { selectInteractionsLoading } from '../../store/slices/interactionsSlice';
import { EMPTY_FORM, toApiPayload } from './formConstants';
import StructuredForm       from './StructuredForm';
import ConversationalChat   from './ConversationalChat';
import { ApiErrorBanner }   from '../../components/common/ApiErrorBanner';
import { useEffect } from 'react';

const TabPanel = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index}
    id={`log-tabpanel-${index}`} aria-labelledby={`log-tab-${index}`} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const LogInteraction = () => {
  const dispatch   = useDispatch();
  const isLoading  = useSelector(selectInteractionsLoading);

  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [tab,     setTab]     = useState(0);
  const [success, setSuccess] = useState(false);

  // Fetch doctor list so the autocomplete is populated
  useEffect(() => {
    dispatch(fetchDoctorsThunk({ page: 0, pageSize: 100 }));
  }, [dispatch]);

  // Shared save — used by both tabs
  // payload can be a raw form object (from StructuredForm) or
  // already-mapped API shape (from ExtractedFieldsEditor chat save)
  const save = async (payload) => {
    // If it looks like a raw form (has doctorId camelCase key), map it
    const apiPayload = ('doctorId' in payload)
      ? toApiPayload(payload)
      : payload;

    const result = await dispatch(createInteractionThunk(apiPayload));
    if (result.meta.requestStatus === 'fulfilled') {
      setForm(EMPTY_FORM);
      setErrors({});
      setSuccess(true);
    }
  };

  // Transfer chat-extracted fields into Tab 1
  const handleTransfer = (extracted) => {
    setForm((prev) => ({ ...prev, ...extracted }));
    setErrors({});
    setTab(0);
  };

  return (
    <Box>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>Log Interaction</Typography>
            <Typography variant="body2" color="text.secondary">
              Record a new doctor interaction using the form or by chatting with the AI assistant.
            </Typography>
          </Box>

          <Divider sx={{ mt: 2 }} />

          {/* API error banner for create failures */}
          <Box sx={{ mt: 2 }}>
            <ApiErrorBanner errorKey="interactions/create" title="Save failed" />
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            aria-label="log interaction tabs" sx={{ mt: 1 }}
            TabIndicatorProps={{ style: { height: 3, borderRadius: 2 } }}>
            <Tab id="log-tab-0" aria-controls="log-tabpanel-0"
              icon={<EditNoteIcon fontSize="small" />} iconPosition="start"
              label="Structured Form"
              sx={{ fontWeight: 600, minHeight: 48, textTransform: 'none' }} />
            <Tab id="log-tab-1" aria-controls="log-tabpanel-1"
              icon={<ChatIcon fontSize="small" />} iconPosition="start"
              label="Conversational Chat"
              sx={{ fontWeight: 600, minHeight: 48, textTransform: 'none' }} />
          </Tabs>

          <TabPanel value={tab} index={0}>
            <StructuredForm
              form={form} setForm={setForm}
              errors={errors} setErrors={setErrors}
              onSubmit={save}
              isLoading={isLoading}
            />
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <ConversationalChat onSave={save} onTransfer={handleTransfer} />
          </TabPanel>
        </CardContent>
      </Card>

      <Snackbar open={success} autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess(false)} severity="success"
          variant="filled" sx={{ width: '100%' }}>
          Interaction saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LogInteraction;
