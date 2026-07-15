import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 2, textAlign: 'center', p: 3 }}>
      <Typography variant="h1" fontWeight={700} color="primary">404</Typography>
      <Typography variant="h5" fontWeight={600}>Page not found</Typography>
      <Typography variant="body2" color="text.secondary">
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Go to Dashboard</Button>
    </Box>
  );
};

export default NotFound;
