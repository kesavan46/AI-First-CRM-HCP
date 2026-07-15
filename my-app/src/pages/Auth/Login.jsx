import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, InputAdornment,
  IconButton, Divider,
} from '@mui/material';
import EmailIcon        from '@mui/icons-material/Email';
import LockIcon         from '@mui/icons-material/Lock';
import VisibilityIcon   from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

import { loginThunk }      from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

const Login = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [form,        setForm]        = useState({ email: '', password: '' });
  const [showPass,    setShowPass]    = useState(false);
  const [errors,      setErrors]      = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const result = await dispatch(loginThunk({ email: form.email, password: form.password }));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/', { replace: true });
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
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
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
            <Typography variant="h5" fontWeight={700}>Welcome to MedCRM</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to your account to continue
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Error alert */}
          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email address"
              type="email"
              value={form.email}
              onChange={(e) => { setForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: undefined })); }}
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

            <TextField
              fullWidth
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: undefined })); }}
              error={Boolean(errors.password)}
              helperText={errors.password}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(p => !p)} edge="end">
                      {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ py: 1.4, fontWeight: 700, fontSize: '1rem' }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Demo hint */}
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary"
              display="block" sx={{ mb: 1 }}>
              DEMO CREDENTIALS
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Use the credentials you registered with, or create a new account.
            </Typography>
            <Button
              size="small"
              sx={{ mt: 1, fontSize: '0.72rem' }}
              onClick={() => setForm({ email: 'demo@crm.com', password: 'Demo@1234' })}
            >
              Fill demo credentials
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Don&apos;t have an account?{' '}
            <Typography
              component={RouterLink} to="/register"
              variant="body2" color="primary" fontWeight={600}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Create one
            </Typography>
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
