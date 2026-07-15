import { Alert, AlertTitle, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, selectError, selectAllErrors } from '../../store/slices/errorsSlice';

/**
 * ApiErrorBanner
 * Shows a single keyed error from the Redux errors slice.
 *
 * Props:
 *   errorKey – string  e.g. 'fetchInteractions'
 *   title    – optional heading
 *   sx       – MUI sx overrides
 */
export const ApiErrorBanner = ({ errorKey, title, sx }) => {
  const dispatch = useDispatch();
  const error    = useSelector(selectError(errorKey));

  return (
    <Collapse in={Boolean(error)}>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, ...sx }}
          action={
            <IconButton size="small" aria-label="dismiss error"
              onClick={() => dispatch(clearError(errorKey))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {error.message}
          {error.code && (
            <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.75rem' }}>
              (HTTP {error.code})
            </span>
          )}
        </Alert>
      )}
    </Collapse>
  );
};

/**
 * GlobalErrorBanner
 * Shows ALL active Redux errors stacked. Mount once inside AppShell.
 */
export const GlobalErrorBanner = () => {
  const dispatch  = useDispatch();
  const allErrors = useSelector(selectAllErrors);
  const keys      = Object.keys(allErrors);
  if (keys.length === 0) return null;

  return (
    <div role="alert" aria-live="polite">
      {keys.map((key) => (
        <Alert key={key} severity="error" sx={{ mb: 1 }}
          action={
            <IconButton size="small" aria-label={`dismiss ${key} error`}
              onClick={() => dispatch(clearError(key))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }>
          {allErrors[key].message}
        </Alert>
      ))}
    </div>
  );
};

export default ApiErrorBanner;
