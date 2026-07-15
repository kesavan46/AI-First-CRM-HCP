import { useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Divider,
  List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Chip, Button, LinearProgress, Stack, IconButton, Tooltip,
} from '@mui/material';
import TodayIcon               from '@mui/icons-material/Today';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleAltIcon           from '@mui/icons-material/PeopleAlt';
import TrendingUpIcon          from '@mui/icons-material/TrendingUp';
import AddCommentIcon          from '@mui/icons-material/AddComment';
import ArrowForwardIcon        from '@mui/icons-material/ArrowForward';
import RefreshIcon             from '@mui/icons-material/Refresh';
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord';
import { useNavigate }         from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { fetchInteractionsThunk } from '../../store/slices/interactionsThunks';
import { fetchDoctorsThunk }       from '../../store/slices/doctorsThunks';
import {
  selectAllInteractions,
  selectInteractionsLoading,
} from '../../store/slices/interactionsSlice';
import {
  selectAllDoctors,
  selectDoctorsLoading,
} from '../../store/slices/doctorsSlice';
import { ApiErrorBanner }  from '../../components/common/ApiErrorBanner';
import {
  StatCard,
  InteractionTrendChart,
  OutcomeChart,
  ProductChart,
} from './DashboardCharts';
import { getDoctorName } from '../../utils/doctorHelpers';

// ─── Static mock data (replaced once real API is live) ─────────────────────
const MOCK_RECENT = [
  { id: 1, doctorName: 'Dr. Anjali Mehta',  type: 'Visit', outcome: 'positive', date: '2026-07-09', product: 'CardioPlus'  },
  { id: 2, doctorName: 'Dr. Rohan Sharma',  type: 'Call',  outcome: 'neutral',  date: '2026-07-08', product: 'DiabeCare'   },
  { id: 3, doctorName: 'Dr. Priya Nair',    type: 'Email', outcome: 'positive', date: '2026-07-07', product: 'NeuroPatch'  },
  { id: 4, doctorName: 'Dr. Vikram Singh',  type: 'Visit', outcome: 'negative', date: '2026-07-06', product: 'OncoPro'     },
  { id: 5, doctorName: 'Dr. Sunita Reddy',  type: 'Event', outcome: 'positive', date: '2026-07-05', product: 'CardioPlus'  },
];

const MOCK_FOLLOWUPS = [
  { id: 1, doctor: 'Dr. Anjali Mehta',  action: 'Send CardioPlus trial data',  due: 'Today',     priority: 'high'   },
  { id: 2, doctor: 'Dr. Rohan Sharma',  action: 'Deliver DiabeCare samples',    due: 'Tomorrow',  priority: 'medium' },
  { id: 3, doctor: 'Dr. Priya Nair',    action: 'Schedule follow-up visit',     due: 'Jul 12',    priority: 'medium' },
  { id: 4, doctor: 'Dr. Vikram Singh',  action: 'Share OncoPro literature',     due: 'Jul 14',    priority: 'low'    },
];

const TERRITORY_COVERAGE = [
  { label: 'North Delhi',    value: 82 },
  { label: 'South Delhi',    value: 67 },
  { label: 'Mumbai Central', value: 91 },
  { label: 'Pune',           value: 45 },
  { label: 'Bangalore',      value: 58 },
];

const OUTCOME_COLOR = { positive: 'success', neutral: 'default', negative: 'error' };
const PRIORITY_COLOR = { high: 'error', medium: 'warning', low: 'default' };

// ─── Sub-components ─────────────────────────────────────────────────────────
const CoverageBar = ({ label, value }) => (
  <Box sx={{ mb: 1.75 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" fontWeight={500}>{label}</Typography>
      <Typography variant="body2" color={value >= 80 ? 'success.main' : value >= 60 ? 'warning.main' : 'error.main'} fontWeight={600}>
        {value}%
      </Typography>
    </Box>
    <LinearProgress
      variant="determinate" value={value}
      sx={{
        height: 8, borderRadius: 4,
        bgcolor: 'grey.100',
        '& .MuiLinearProgress-bar': {
          bgcolor: value >= 80 ? 'success.main' : value >= 60 ? 'warning.main' : 'error.main',
          borderRadius: 4,
        },
      }}
    />
  </Box>
);

const SectionHeader = ({ title, action, onAction }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
    <Typography variant="h6" fontWeight={600}>{title}</Typography>
    {action && (
      <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />} onClick={onAction}>
        {action}
      </Button>
    )}
  </Box>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();

  const interactions     = useSelector(selectAllInteractions);
  const doctors          = useSelector(selectAllDoctors);
  const interactionsLoad = useSelector(selectInteractionsLoading);
  const doctorsLoad      = useSelector(selectDoctorsLoading);

  const load = () => {
    dispatch(fetchInteractionsThunk({ page: 0, pageSize: 50 }));
    dispatch(fetchDoctorsThunk({ page: 0, pageSize: 100 }));
  };

  useEffect(() => { load(); }, []);

  // Computed from real data or fallback
  const recentList     = interactions.length > 0 ? interactions.slice(0, 5) : MOCK_RECENT;
  const totalVisits    = interactions.length > 0
    ? interactions.filter((i) => (i.interaction_type ?? i.type ?? '').toLowerCase() === 'visit').length
    : 8;
  const totalDoctors   = doctors.length > 0 ? doctors.length : 54;
  const pendingFollowups = MOCK_FOLLOWUPS.length; // swap with real data when API supports it
  const positiveRate   = interactions.length > 0
    ? Math.round((interactions.filter((i) => (i.ai_sentiment ?? i.outcome) === 'positive').length / interactions.length) * 100)
    : 74;

  return (
    <Box>
      {/* Error banners */}
      <ApiErrorBanner errorKey="interactions/fetchAll" />
      <ApiErrorBanner errorKey="doctors/fetchAll" />

      {/* Top action bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Good evening 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh dashboard">
            <IconButton onClick={load} aria-label="refresh dashboard">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddCommentIcon />}
            onClick={() => navigate('/log')} aria-label="log a new interaction">
            Log Interaction
          </Button>
        </Stack>
      </Box>

      {/* ── Row 1: Stat cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Today's Visits" value={totalVisits}
            icon={<TodayIcon />} color="primary"
            delta="+3 vs yesterday" loading={interactionsLoad && interactions.length === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Pending Follow-ups" value={pendingFollowups}
            icon={<NotificationsActiveIcon />} color="warning"
            delta="2 due today" loading={false}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Doctors Covered" value={totalDoctors}
            icon={<PeopleAltIcon />} color="secondary"
            delta="+2 this week" loading={doctorsLoad && doctors.length === 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Positive Outcomes" value={`${positiveRate}%`}
            icon={<TrendingUpIcon />} color="success"
            delta="+5% vs last month" loading={interactionsLoad && interactions.length === 0}
          />
        </Grid>
      </Grid>

      {/* ── Row 2: Trend + Outcome charts ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <InteractionTrendChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <OutcomeChart />
        </Grid>
      </Grid>

      {/* ── Row 3: Recent interactions + Follow-ups ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Recent interactions */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionHeader title="Recent Interactions" action="View all" onAction={() => navigate('/history')} />
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {recentList.map((item, idx) => (
                  <ListItem key={item.id} disableGutters
                    divider={idx < recentList.length - 1} sx={{ py: 1.25 }}
                    secondaryAction={
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Chip
                          label={item.ai_sentiment ?? item.outcome ?? '—'} size="small"
                          color={OUTCOME_COLOR[item.ai_sentiment ?? item.outcome] ?? 'default'}
                          sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption" color="text.disabled">
                          {item.product_discussed ?? item.product ?? ''}
                        </Typography>
                      </Stack>
                    }>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 38, height: 38, fontSize: 14, fontWeight: 700 }}>
                        {getDoctorName(item.doctor ?? item)[0] ?? '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {item.doctorName ?? getDoctorName(item.doctor)}
                        </Typography>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <FiberManualRecordIcon sx={{ fontSize: 6, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {item.interaction_type ?? item.type ?? '—'} · {
                              item.interaction_date
                                ? new Date(item.interaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : item.date ?? '—'
                            }
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending follow-ups */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionHeader title="Pending Follow-ups" />
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {MOCK_FOLLOWUPS.map((item, idx) => (
                  <ListItem key={item.id} disableGutters
                    divider={idx < MOCK_FOLLOWUPS.length - 1} sx={{ py: 1.25 }}
                    secondaryAction={
                      <Chip
                        label={item.due} size="small"
                        color={PRIORITY_COLOR[item.priority]}
                        variant={item.priority === 'high' ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    }>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }}>
                        {item.doctor.split(' ').slice(-1)[0][0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {item.doctor}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.action}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              <Box sx={{ mt: 2 }}>
                <Button fullWidth variant="outlined" size="small"
                  onClick={() => navigate('/log')} startIcon={<AddCommentIcon />}>
                  Log New Interaction
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Row 4: Product chart + Territory coverage ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <ProductChart />
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <SectionHeader title="Territory Coverage" action="View doctors" onAction={() => navigate('/doctors')} />
              <Divider sx={{ mb: 2 }} />
              {TERRITORY_COVERAGE.map((t) => (
                <CoverageBar key={t.label} label={t.label} value={t.value} />
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
