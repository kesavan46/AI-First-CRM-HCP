import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, InputAdornment,
  IconButton, Divider, MenuItem,
} from '@mui/material';
import EmailIcon           from '@mui/icons-material/Email';
import LockIcon            from '@mui/icons-material/Lock';
import PersonIcon          from '@mui/icons-material/Person';
import VisibilityIcon      from '@mui/icons-material/Visibility';
import VisibilityOffIcon   from '@mui/icons-material/VisibilityOff';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import authService         from '../../services/authService';

const ROLES = [
  { value: 'rep',     label: 'Sales Representative' },
  { value: 'manager', label: 'Sales Manager' },
  { value: 'admin',   label: 'Administrator' },
];

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    password:  '',
    confirm:   '',
    role:      'rep',
  });
  const [showPass,  setShowPass]  = useState(false);
  const [errors,    setErrors]    = useState({});
  const [apiError,  setApiError]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
    setApiError('');
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())  e.full_name = 'Full name is required.';
    if (!form.email.trim())      e.email     = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password)          e.password  = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters.';
    else if (!/\d/.test(form.password)) e.password = 'Must contain at least one digit.';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await authService.register({
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        password:  form.password,
        role:      form.role,
      });
      setSuccess(true);
      // Redirect to login after 1.5 s
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setApiError(err.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2,
    }}>
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>

          {/* Logo + title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 2,
              bgcolor: 'primary.main', color: 'white', mb: 2,
            }}>
              <MedicalServicesIcon fontSize="large" />
            </Box>
            <Typography variant="h5" fontWeight={700}>Create Account</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Join MedCRM — register your account
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Success */}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Account created! Redirecting to login…
            </Alert>
          )}

          {/* API error */}
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>

            {/* Full name */}
            <TextField
              fullWidth label="Full Name"
              value={form.full_name}
              onChange={set('full_name')}
              error={Boolean(errors.full_name)}
              helperText={errors.full_name}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Email */}
            <TextField
              fullWidth label="Email address" type="email"
              value={form.email}
              onChange={set('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Role */}
            <TextField
              select fullWidth label="Role"
              value={form.role}
              onChange={set('role')}
              sx={{ mb: 2 }}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>

            {/* Password */}
            <TextField
              fullWidth label="Password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              error={Boolean(errors.password)}
              helperText={errors.password ?? 'Min 8 chars, must include a digit'}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass((p) => !p)} edge="end">
                      {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm password */}
            <TextField
              fullWidth label="Confirm Password"
              type={showPass ? 'text' : 'password'}
              value={form.confirm}
              onChange={set('confirm')}
              error={Boolean(errors.confirm)}
              helperText={errors.confirm}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit" fullWidth variant="contained" size="large"
              disabled={loading || success}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ py: 1.4, fontWeight: 700, fontSize: '1rem' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Already have an account?{' '}
            <Typography
              component={RouterLink} to="/login"
              variant="body2" color="primary" fontWeight={600}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Sign in
            </Typography>
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
