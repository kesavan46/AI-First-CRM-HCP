import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Avatar,
  Chip, Divider, Button, Stack, Tabs, Tab, Tooltip,
} from '@mui/material';
import ArrowBackIcon      from '@mui/icons-material/ArrowBack';
import AddCommentIcon     from '@mui/icons-material/AddComment';
import EmailIcon          from '@mui/icons-material/Email';
import PhoneIcon          from '@mui/icons-material/Phone';
import LocationOnIcon     from '@mui/icons-material/LocationOn';
import BusinessIcon       from '@mui/icons-material/Business';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import { useDispatch, useSelector } from 'react-redux';

import { fetchDoctorByIdThunk, fetchDoctorInteractionsThunk } from '../../store/slices/doctorsThunks';
import { selectSelectedDoctor, selectDoctorsLoading }         from '../../store/slices/doctorsSlice';
import { selectAllInteractions }                              from '../../store/slices/interactionsSlice';
import { PageLoader }     from '../../components/common/LoadingStates';
import { ApiErrorBanner } from '../../components/common/ApiErrorBanner';
import { getDoctorName, getDoctorInstitution }                from '../../utils/doctorHelpers';

// ── Mock fallbacks ──────────────────────────────────────────────────────────
const MOCK_DOCTOR = {
  id: '1', first_name: 'Anjali', last_name: 'Mehta',
  specialty: 'Cardiologist', designation: 'MD, DM (Cardiology)',
  institution: 'Apollo Hospitals, New Delhi',
  city: 'New Delhi', state: 'Delhi',
  phone: '+91 98100 12345', email: 'anjali.mehta@apollo.com',
  tier: 'A', territory: 'North Delhi', isActive: true,
  preferred_contact: 'Visit',
  bio: 'Senior interventional cardiologist with 18 years of experience. Key opinion leader for cardiovascular therapeutics in North Delhi.',
};
const MOCK_INTERACTIONS = [
  { id: 1, interaction_type: 'visit', interaction_date: '2026-07-08', product_discussed: 'CardioPlus', ai_sentiment: 'positive', notes: 'Receptive to new trial data. Agreed to prescribe for 5 new patients.' },
  { id: 2, interaction_type: 'call',  interaction_date: '2026-06-25', product_discussed: 'CardioPlus', ai_sentiment: 'neutral',  notes: 'Requested literature on side-effect profile.' },
  { id: 3, interaction_type: 'email', interaction_date: '2026-06-10', product_discussed: 'NeuroPatch', ai_sentiment: 'positive', notes: 'Sent clinical trial summary. Positive acknowledgement received.' },
  { id: 4, interaction_type: 'visit', interaction_date: '2026-05-28', product_discussed: 'DiabeCare',  ai_sentiment: 'negative', notes: 'Doctor expressed concerns about pricing vs. competitors.' },
  { id: 5, interaction_type: 'call',  interaction_date: '2026-05-14', product_discussed: 'CardioPlus', ai_sentiment: 'positive', notes: 'Follow-up call. Confirmed samples were useful.' },
];
const MOCK_FOLLOWUPS = [
  { id: 1, interaction_type: 'visit', follow_up_date: '2026-07-15', product_discussed: 'CardioPlus', notes: 'Bring updated trial data.' },
  { id: 2, interaction_type: 'call',  follow_up_date: '2026-07-20', product_discussed: 'NeuroPatch', notes: 'Check sample usage.' },
];

// ── Palette / maps ──────────────────────────────────────────────────────────
const TIER_COLOR    = { A: 'error', B: 'warning', C: 'default' };
const OUTCOME_COLOR = { positive: 'success', neutral: 'warning', negative: 'error' };

const TYPE_COLOR = {
  visit:      '#4F46E5',
  call:       '#0EA5E9',
  email:      '#10B981',
  conference: '#F59E0B',
  virtual:    '#8B5CF6',
};
const TYPE_LABEL = {
  visit: 'Visit', call: 'Call', email: 'Email',
  conference: 'Conference', virtual: 'Virtual',
};

// ── Small helpers ────────────────────────────────────────────────────────────
const fmtDate = (raw) =>
  raw
    ? new Date(raw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const daysFromNow = (raw) => {
  if (!raw) return null;
  const diff = Math.ceil((new Date(raw) - new Date()) / 86_400_000);
  return diff;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: InfoRow (left identity card)
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
    <Box sx={{ color: 'teal', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: DoctorStatPill — used in the Overview stats row
// ─────────────────────────────────────────────────────────────────────────────
const DoctorStatPill = ({ label, value, color = 'primary', icon }) => (
  <Box sx={{
    flex: 1, minWidth: 90,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 0.5, py: 1.75, px: 1,
    bgcolor: `${color}.50`,
    border: '1px solid',
    borderColor: `${color}.100`,
    borderRadius: 3,
  }}>
    {icon && <Box sx={{ color: `${color}.main`, mb: 0.25 }}>{icon}</Box>}
    <Typography variant="h5" fontWeight={800} color={`${color}.main`} lineHeight={1}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" textAlign="center" lineHeight={1.3}>
      {label}
    </Typography>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: ProductBar — mini horizontal bar for product distribution
// ─────────────────────────────────────────────────────────────────────────────
const ProductBar = ({ product, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
        <Typography variant="body2" fontWeight={500}>{product}</Typography>
        <Typography variant="caption" color="text.secondary">{count} · {pct}%</Typography>
      </Box>
      <Box sx={{ bgcolor: 'grey.100', borderRadius: 4, height: 7, overflow: 'hidden' }}>
        <Box sx={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          bgcolor: 'primary.main',
          transition: 'width 0.6s ease',
        }} />
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: TimelineItem — single entry in the Interactions timeline
// ─────────────────────────────────────────────────────────────────────────────
const TimelineItem = ({ item, isLast }) => {
  const type     = (item.interaction_type ?? '').toLowerCase();
  const dotColor = TYPE_COLOR[type] ?? '#9CA3AF';
  const sentiment = item.ai_sentiment ?? item.outcome;

  return (
    <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
      {/* Vertical line + dot */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Box sx={{
          width: 13, height: 13, borderRadius: '50%',
          bgcolor: dotColor, border: '2.5px solid white',
          boxShadow: `0 0 0 2px ${dotColor}40`,
          zIndex: 1, mt: 0.5,
        }} />
        {!isLast && (
          <Box sx={{ width: 2, flex: 1, bgcolor: 'grey.200', mt: 0.5, mb: 0 }} />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ pb: isLast ? 0 : 2.5, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={TYPE_LABEL[type] ?? type}
              size="small"
              sx={{
                bgcolor: `${dotColor}18`,
                color: dotColor,
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
                border: `1px solid ${dotColor}40`,
              }}
            />
            {(item.product_discussed ?? item.product) && (
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                {item.product_discussed ?? item.product}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {sentiment && (
              <Chip
                label={sentiment}
                size="small"
                color={OUTCOME_COLOR[sentiment] ?? 'default'}
                variant="outlined"
                sx={{ fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }}
              />
            )}
            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
              {fmtDate(item.interaction_date ?? item.date)}
            </Typography>
          </Box>
        </Box>
        {(item.notes ?? item.summary) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
            {item.notes ?? item.summary}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: FollowUpCard — single follow-up row in the Follow-ups tab
// ─────────────────────────────────────────────────────────────────────────────
const FollowUpCard = ({ item }) => {
  const days = daysFromNow(item.follow_up_date);
  const overdue  = days !== null && days < 0;
  const today    = days === 0;
  const soon     = days !== null && days > 0 && days <= 3;

  const urgencyColor = overdue ? 'error' : today ? 'warning' : soon ? 'warning' : 'success';
  const urgencyLabel = overdue
    ? `${Math.abs(days)}d overdue`
    : today
    ? 'Today'
    : days !== null
    ? `In ${days} day${days !== 1 ? 's' : ''}`
    : '—';

  return (
    <Box sx={{
      display: 'flex', gap: 2, alignItems: 'flex-start',
      p: 1.75, mb: 1.5, borderRadius: 2,
      border: '1px solid', borderColor: `${urgencyColor}.200`,
      bgcolor: `${urgencyColor}.50`,
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
        bgcolor: `${urgencyColor}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {overdue
          ? <WarningAmberIcon sx={{ color: 'white', fontSize: 20 }} />
          : <CalendarMonthIcon sx={{ color: 'white', fontSize: 20 }} />
        }
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={600}>
            {TYPE_LABEL[(item.interaction_type ?? '').toLowerCase()] ?? item.interaction_type ?? '—'}
            {item.product_discussed && (
              <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
                {item.product_discussed}
              </Typography>
            )}
          </Typography>
          <Chip label={urgencyLabel} size="small" color={urgencyColor}
            sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {fmtDate(item.follow_up_date)}
        </Typography>
        {item.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
            {item.notes}
          </Typography>
        )}
      </Box>
    </Box>
  );
};


// ═════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═════════════════════════════════════════════════════════════════════════════
const DoctorProfile = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tab, setTab] = useState(0);

  const doctor       = useSelector(selectSelectedDoctor);
  const interactions = useSelector(selectAllInteractions);
  const isLoading    = useSelector(selectDoctorsLoading);

  useEffect(() => {
    dispatch(fetchDoctorByIdThunk(id));
    dispatch(fetchDoctorInteractionsThunk({ id }));
  }, [dispatch, id]);

  const profile  = doctor ?? MOCK_DOCTOR;
  const history  = interactions.length > 0 ? interactions : MOCK_INTERACTIONS;

  const profileName        = getDoctorName(profile);
  const profileInstitution = getDoctorInstitution(profile) || profile.hospital || '';

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalVisits  = history.filter((i) => (i.interaction_type ?? '').toLowerCase() === 'visit').length;
  const totalCalls   = history.filter((i) => (i.interaction_type ?? '').toLowerCase() === 'call').length;
  const totalEmails  = history.filter((i) => ['email', 'virtual'].includes((i.interaction_type ?? '').toLowerCase())).length;
  const positiveRate = history.length > 0
    ? Math.round((history.filter((i) => (i.ai_sentiment ?? i.outcome) === 'positive').length / history.length) * 100)
    : 0;

  // Pending follow-ups for this doctor
  const now = new Date();
  const pendingFollowUps = history.filter(
    (i) => i.follow_up_date && new Date(i.follow_up_date) > now,
  );
  const allFollowUps = history.filter((i) => i.follow_up_date);
  const displayFollowUps = allFollowUps.length > 0 ? allFollowUps : MOCK_FOLLOWUPS;

  // Product distribution
  const productMap = {};
  history.forEach((i) => {
    const p = i.product_discussed ?? i.product;
    if (p) productMap[p] = (productMap[p] ?? 0) + 1;
  });
  const productEntries = Object.entries(productMap).sort((a, b) => b[1] - a[1]);

  if (isLoading && !doctor) return <PageLoader message="Loading doctor profile…" />;

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = [profile.first_name?.[0], profile.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  return (
    <Box>
      <ApiErrorBanner errorKey="doctors/fetchById"         title="Could not load doctor" />
      <ApiErrorBanner errorKey="doctors/fetchInteractions" title="Could not load interactions" />

      {/* ── Page header ── */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} aria-label="go back"
          sx={{ color: 'text.secondary' }}>
          Back
        </Button>
        <Button variant="contained" startIcon={<AddCommentIcon />}
          onClick={() => navigate('/log')} aria-label="log interaction"
          sx={{ bgcolor: 'teal', '&:hover': { bgcolor: '#006d6d' } }}>
          Log Interaction
        </Button>
      </Box>

      <Grid container spacing={3}>

        {/* ── LEFT: Identity card ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderTop: '4px solid teal', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
              {/* Avatar */}
              <Avatar sx={{
                width: 88, height: 88, mx: 'auto', mb: 2,
                bgcolor: 'teal', fontSize: 30, fontWeight: 800,
                boxShadow: '0 4px 16px rgba(0,128,128,0.30)',
              }}>
                {initials}
              </Avatar>

              <Typography variant="h6" fontWeight={700}>{profileName}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {profile.specialty ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {profile.designation ?? profile.qualification ?? ''}
              </Typography>

              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <Chip
                  label={`Tier ${profile.tier ?? '—'}`}
                  color={TIER_COLOR[profile.tier] ?? 'default'}
                  size="small" sx={{ fontWeight: 700 }}
                />
                <Chip
                  label={profile.isActive !== false ? 'Active' : 'Inactive'}
                  color={profile.isActive !== false ? 'success' : 'default'}
                  size="small" variant="outlined"
                  icon={profile.isActive !== false
                    ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                    : undefined}
                />
              </Stack>
            </CardContent>

            <Divider />

            <CardContent>
              <InfoRow icon={<BusinessIcon fontSize="small" />}    label="Institution" value={profileInstitution} />
              <InfoRow icon={<PhoneIcon fontSize="small" />}       label="Phone"       value={profile.phone} />
              <InfoRow icon={<EmailIcon fontSize="small" />}       label="Email"       value={profile.email} />
              <InfoRow icon={<LocationOnIcon fontSize="small" />}  label="City / State"
                value={[profile.city, profile.state].filter(Boolean).join(', ') || profile.address} />
              <InfoRow icon={<LocationOnIcon fontSize="small" />}  label="Territory"   value={profile.territory} />
            </CardContent>

            {/* Pending follow-up count badge */}
            {pendingFollowUps.length > 0 && (
              <>
                <Divider />
                <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200',
                    borderRadius: 2, px: 2, py: 1,
                  }}>
                    <CalendarMonthIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="warning.dark">
                      {pendingFollowUps.length} pending follow-up{pendingFollowUps.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </CardContent>
              </>
            )}
          </Card>
        </Grid>

        {/* ── RIGHT: Tabbed detail ── */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tab} onChange={(_, v) => setTab(v)}
                aria-label="doctor profile tabs"
                sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 110 } }}
              >
                <Tab label="Overview"     id="tab-0" aria-controls="panel-0" />
                <Tab label="Interactions" id="tab-1" aria-controls="panel-1" />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      Follow-ups
                      {displayFollowUps.length > 0 && (
                        <Box sx={{
                          bgcolor: 'warning.main', color: 'white',
                          borderRadius: '50%', width: 18, height: 18,
                          fontSize: '0.65rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {displayFollowUps.length}
                        </Box>
                      )}
                    </Box>
                  }
                  id="tab-2" aria-controls="panel-2"
                />
              </Tabs>
            </Box>

            {/* ── Tab 0: Overview ── */}
            {tab === 0 && (
              <CardContent id="panel-0" role="tabpanel" aria-labelledby="tab-0">

                {/* Bio */}
                {profile.bio && (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>About</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.8 }}>
                      {profile.bio}
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />
                  </>
                )}

                {/* Doctor-specific stats row */}
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Engagement Summary
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                  <DoctorStatPill label="Visits"        value={totalVisits}         color="primary" />
                  <DoctorStatPill label="Calls"         value={totalCalls}          color="info" />
                  <DoctorStatPill label="Emails"        value={totalEmails}         color="secondary" />
                  <DoctorStatPill label="Positive Rate" value={`${positiveRate}%`}  color="success" />
                  <DoctorStatPill label="Total"         value={history.length}      color="warning" />
                </Stack>

                <Divider sx={{ mb: 2.5 }} />

                {/* Product distribution */}
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Products Discussed
                </Typography>
                {productEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No product data yet.</Typography>
                ) : (
                  productEntries.map(([product, count]) => (
                    <ProductBar key={product} product={product} count={count} total={history.length} />
                  ))
                )}

                {/* Last interaction summary */}
                {history[0] && (
                  <>
                    <Divider sx={{ mt: 2.5, mb: 2.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Last Interaction
                    </Typography>
                    <Box sx={{
                      p: 2, bgcolor: 'grey.50', borderRadius: 2,
                      border: '1px solid', borderColor: 'divider',
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {TYPE_LABEL[(history[0].interaction_type ?? '').toLowerCase()] ?? history[0].interaction_type}
                          {history[0].product_discussed && (
                            <Typography component="span" variant="caption"
                              color="primary.main" sx={{ ml: 1 }}>
                              {history[0].product_discussed}
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {fmtDate(history[0].interaction_date)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {history[0].notes ?? history[0].summary ?? '—'}
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            )}

            {/* ── Tab 1: Interactions (timeline) ── */}
            {tab === 1 && (
              <CardContent id="panel-1" role="tabpanel" aria-labelledby="tab-1">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Interaction Timeline
                  </Typography>
                  <Chip label={`${history.length} total`} size="small" variant="outlined" />
                </Box>

                {history.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No interactions recorded yet.
                  </Typography>
                ) : (
                  <Box sx={{ pl: 0.5 }}>
                    {history.map((item, idx) => (
                      <TimelineItem key={item.id} item={item} isLast={idx === history.length - 1} />
                    ))}
                  </Box>
                )}
              </CardContent>
            )}

            {/* ── Tab 2: Follow-ups ── */}
            {tab === 2 && (
              <CardContent id="panel-2" role="tabpanel" aria-labelledby="tab-2">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Pending Follow-ups
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<AddCommentIcon />}
                    onClick={() => navigate('/log')}
                    sx={{ fontSize: '0.75rem' }}>
                    Log Interaction
                  </Button>
                </Box>

                {displayFollowUps.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No follow-ups scheduled for this doctor.
                    </Typography>
                  </Box>
                ) : (
                  displayFollowUps
                    .slice()
                    .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
                    .map((item) => (
                      <FollowUpCard key={item.id} item={item} />
                    ))
                )}
              </CardContent>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DoctorProfile;
