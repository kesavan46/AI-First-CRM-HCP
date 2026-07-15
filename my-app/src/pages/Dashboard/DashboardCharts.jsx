import {
  Box, Card, CardContent, Typography, Avatar, Skeleton,
} from '@mui/material';
import TodayIcon           from '@mui/icons-material/Today';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleAltIcon       from '@mui/icons-material/PeopleAlt';
import TrendingUpIcon      from '@mui/icons-material/TrendingUp';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#4F46E5',
  secondary: '#14B8A6',
  success:   '#10B981',
  warning:   '#F59E0B',
  error:     '#EF4444',
  info:      '#0EA5E9',
};

// ─── Stat Card ────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color, subtitle, delta, loading }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
    {/* Decorative arc */}
    <Box sx={{
      position: 'absolute', right: -20, top: -20,
      width: 100, height: 100, borderRadius: '50%',
      bgcolor: `${color}.main`, opacity: 0.06,
    }} />
    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', pb: '16px !important' }}>
      <Avatar sx={{
        bgcolor: `${color}.light`, color: `${color}.dark`,
        width: 52, height: 52, flexShrink: 0,
      }}>
        {icon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <>
            <Skeleton variant="text" width="50%" height={40} />
            <Skeleton variant="text" width="80%" />
          </>
        ) : (
          <>
            <Typography variant="h4" fontWeight={700} lineHeight={1.1}>{value}</Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
              {label}
            </Typography>
            {(delta || subtitle) && (
              <Typography variant="caption"
                color={delta?.startsWith('+') ? 'success.main' : delta?.startsWith('-') ? 'error.main' : `${color}.main`}>
                {delta ?? subtitle}
              </Typography>
            )}
          </>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ─── Interaction Trend Chart (Area) ──────────────────────────────────────
const TREND_DATA = [
  { day: 'Mon', visits: 4, calls: 6, emails: 2 },
  { day: 'Tue', visits: 7, calls: 4, emails: 5 },
  { day: 'Wed', visits: 5, calls: 8, emails: 3 },
  { day: 'Thu', visits: 9, calls: 5, emails: 6 },
  { day: 'Fri', visits: 6, calls: 7, emails: 4 },
  { day: 'Sat', visits: 3, calls: 2, emails: 1 },
  { day: 'Sun', visits: 2, calls: 1, emails: 0 },
];

export const InteractionTrendChart = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Interactions This Week
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Visits · Calls · Emails by day
      </Typography>
      <Box sx={{ mt: 2, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradVisit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.primary}   stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.primary}   stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.secondary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="visits" name="Visits"
              stroke={COLORS.primary}   fill="url(#gradVisit)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="calls"  name="Calls"
              stroke={COLORS.secondary} fill="url(#gradCall)"  strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="emails" name="Emails"
              stroke={COLORS.warning}   fill="none"            strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

// ─── Outcome Breakdown Chart (Pie) ────────────────────────────────────────
const OUTCOME_DATA = [
  { name: 'Positive', value: 58, color: COLORS.success },
  { name: 'Neutral',  value: 29, color: COLORS.warning },
  { name: 'Negative', value: 13, color: COLORS.error   },
];

export const OutcomeChart = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Outcome Breakdown
      </Typography>
      <Typography variant="caption" color="text.secondary">
        All interactions this month
      </Typography>
      <Box sx={{ mt: 1, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={OUTCOME_DATA}
              cx="50%" cy="50%"
              innerRadius={52} outerRadius={78}
              paddingAngle={3}
              dataKey="value"
            >
              {OUTCOME_DATA.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v}%`, '']}
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
            />
            <Legend
              iconType="circle" iconSize={8}
              formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

// ─── Product Performance Chart (Bar) ─────────────────────────────────────
const PRODUCT_DATA = [
  { product: 'CardioPlus', positive: 24, neutral: 8,  negative: 4  },
  { product: 'DiabeCare',  positive: 18, neutral: 11, negative: 3  },
  { product: 'NeuroPatch', positive: 14, neutral: 6,  negative: 5  },
  { product: 'OncoPro',    positive: 10, neutral: 9,  negative: 7  },
];

export const ProductChart = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Product Performance
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Interaction outcomes by product
      </Typography>
      <Box sx={{ mt: 2, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PRODUCT_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="product" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
            />
            <Bar dataKey="positive" name="Positive" stackId="a" fill={COLORS.success} radius={[0,0,0,0]} />
            <Bar dataKey="neutral"  name="Neutral"  stackId="a" fill={COLORS.warning} />
            <Bar dataKey="negative" name="Negative" stackId="a" fill={COLORS.error}   radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);
