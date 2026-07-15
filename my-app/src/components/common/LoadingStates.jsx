import { Box, CircularProgress, LinearProgress, Backdrop, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectIsLoading, selectAnyLoading } from '../../store/slices/loadingSlice';

/**
 * PageLoader — centred full-page spinner for initial data loads.
 *
 * Usage:
 *   if (isLoading && items.length === 0) return <PageLoader />;
 */
export const PageLoader = ({ message = 'Loading…', minHeight = '60vh' }) => (
  <Box role="status" aria-label={message}
    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight, gap: 2 }}>
    <CircularProgress size={40} thickness={4} />
    {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
  </Box>
);

/**
 * InlineLoader — slim 3px linear bar at the top of a card/table.
 * Always occupies 3px height to avoid layout shift.
 *
 * Usage:
 *   <InlineLoader loading={isLoading} />
 */
export const InlineLoader = ({ loading }) => (
  <Box sx={{ height: 3 }}>
    {loading && <LinearProgress aria-label="loading" sx={{ borderRadius: 1 }} />}
  </Box>
);

/**
 * LoadingOverlay — semi-transparent backdrop over a positioned container.
 *
 * Usage:
 *   <Box sx={{ position: 'relative' }}>
 *     <LoadingOverlay loading={isLoading} />
 *     … content …
 *   </Box>
 */
export const LoadingOverlay = ({ loading, message }) => (
  <Backdrop open={loading}
    sx={{ position: 'absolute', zIndex: (t) => t.zIndex.drawer - 1,
      bgcolor: 'rgba(255,255,255,0.75)', borderRadius: 'inherit',
      flexDirection: 'column', gap: 1.5 }}>
    <CircularProgress size={32} />
    {message && <Typography variant="caption" color="text.secondary">{message}</Typography>}
  </Backdrop>
);

/**
 * GlobalLoadingBar — fixed 3px bar at the very top of the viewport.
 * Activates when ANY Redux operation is loading.
 * Mount once in AppShell.
 *
 * Usage:
 *   <GlobalLoadingBar />
 */
export const GlobalLoadingBar = () => {
  const anyLoading = useSelector(selectAnyLoading);
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 3 }}>
      {anyLoading && <LinearProgress sx={{ height: 3 }} aria-label="global loading" />}
    </Box>
  );
};

/**
 * KeyedLoader — spinner that appears only when a specific operation is loading.
 *
 * Usage:
 *   <KeyedLoader opKey="fetchInteractions" />
 */
export const KeyedLoader = ({ opKey, size = 24 }) => {
  const isLoading = useSelector(selectIsLoading(opKey));
  if (!isLoading) return null;
  return (
    <CircularProgress size={size} aria-label={`loading ${opKey}`}
      sx={{ display: 'block', mx: 'auto', my: 1 }} />
  );
};

export default PageLoader;
