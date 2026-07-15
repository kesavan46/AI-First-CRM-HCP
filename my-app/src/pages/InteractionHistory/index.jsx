import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, IconButton,
  Tooltip, TextField, MenuItem, Grid, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, InputAdornment, Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon     from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon      from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon       from '@mui/icons-material/Edit';
import DeleteIcon     from '@mui/icons-material/Delete';
import AddCommentIcon from '@mui/icons-material/AddComment';
import RefreshIcon    from '@mui/icons-material/Refresh';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import {
  fetchInteractionsThunk,
  deleteInteractionThunk,
} from '../../store/slices/interactionsThunks';
import {
  setFilters, clearFilters, setPagination,
  selectAllInteractions, selectInteractionFilters,
  selectInteractionPagination, selectInteractionsLoading,
} from '../../store/slices/interactionsSlice';
import { ApiErrorBanner }        from '../../components/common/ApiErrorBanner';
import EditInteractionDialog     from '../../components/common/EditInteractionDialog';
import ViewInteractionDialog     from '../../components/common/ViewInteractionDialog';
import { getDoctorName }         from '../../utils/doctorHelpers';

const TYPES    = ['visit','call','email','conference','virtual'];
const STATUSES = ['draft','submitted','reviewed'];
const SENTIMENT_COLOR = { positive:'success', neutral:'default', negative:'error' };
const STATUS_COLOR    = { draft:'default', submitted:'info', reviewed:'success' };
const TYPE_COLOR = { visit:'primary', call:'success', email:'info', conference:'warning', virtual:'secondary' };

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

// ── DataGrid column definitions ────────────────────────────────────────────
const buildColumns = ({ onView, onEdit, onDelete }) => [
  {
    field: 'doctor', headerName: 'Doctor', flex: 1.4, minWidth: 160,
    renderCell: ({ row }) => {
      const name = getDoctorName(row.doctor);
      const spec = row.doctor?.specialty ?? '';
      return (
        <Box>
          <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
          {spec && <Typography variant="caption" color="text.secondary">{spec}</Typography>}
        </Box>
      );
    },
  },
  {
    field: 'interaction_type', headerName: 'Type', width: 120,
    renderCell: ({ value }) => (
      <Chip label={value ?? '—'} size="small"
        color={TYPE_COLOR[value] ?? 'default'}
        sx={{ textTransform:'capitalize', fontWeight:600, fontSize:'0.7rem' }} />
    ),
  },
  {
    field: 'interaction_date', headerName: 'Date', width: 120,
    valueFormatter: (value) => fmtDate(value),
  },
  {
    field: 'product_discussed', headerName: 'Product', width: 130,
    renderCell: ({ value }) => value
      ? <Chip label={value} size="small" variant="outlined" sx={{ fontSize:'0.7rem' }} />
      : <Typography variant="caption" color="text.disabled">—</Typography>,
  },
  {
    field: 'ai_sentiment', headerName: 'Sentiment', width: 115,
    renderCell: ({ value }) => value
      ? <Chip label={value} size="small" color={SENTIMENT_COLOR[value] ?? 'default'}
          sx={{ textTransform:'capitalize', fontWeight:600, fontSize:'0.7rem' }} />
      : <Typography variant="caption" color="text.disabled">—</Typography>,
  },
  {
    field: 'status', headerName: 'Status', width: 110,
    renderCell: ({ value }) => (
      <Chip label={value ?? 'draft'} size="small"
        color={STATUS_COLOR[value] ?? 'default'}
        sx={{ textTransform:'capitalize', fontWeight:600, fontSize:'0.7rem' }} />
    ),
  },
  {
    field: 'follow_up_date', headerName: 'Follow-up', width: 110,
    valueFormatter: (value) => fmtDate(value),
  },
  {
    field: 'actions', headerName: 'Actions', width: 120,
    sortable: false, filterable: false, align: 'center', headerAlign: 'center',
    renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.25}>
        <Tooltip title="View">
          <IconButton size="small" onClick={() => onView(row)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
const InteractionHistory = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const rows       = useSelector(selectAllInteractions);
  const filters    = useSelector(selectInteractionFilters);
  const pagination = useSelector(selectInteractionPagination);
  const isLoading  = useSelector(selectInteractionsLoading);

  const [search,       setSearch]       = useState('');
  const [showFilters,  setShowFilters]  = useState(false);
  const [viewRow,      setViewRow]      = useState(null);
  const [editRow,      setEditRow]      = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(() => {
    dispatch(fetchInteractionsThunk({
      page: pagination.page, pageSize: pagination.pageSize, ...filters,
    }));
  }, [dispatch, pagination.page, pagination.pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  // Client-side search on top of server-paginated rows
  const displayRows = search.trim()
    ? rows.filter((r) => {
        const name = getDoctorName(r.doctor).toLowerCase();
        const prod = (r.product_discussed ?? '').toLowerCase();
        const q    = search.toLowerCase();
        return name.includes(q) || prod.includes(q);
      })
    : rows;

  const handleView   = (row) => setViewRow(row);
  const handleEdit   = (row) => { setViewRow(null); setEditRow(row); };
  const handleDelete = (row) => setDeleteTarget(row);

  const confirmDelete = async () => {
    setDeleting(true);
    await dispatch(deleteInteractionThunk(deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  };

  const hasActiveFilters = filters.type || filters.outcome || filters.dateFrom || filters.dateTo;

  const columns = buildColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete });

  return (
    <Box>
      <ApiErrorBanner errorKey="interactions/fetchAll" title="Could not load interactions" />
      <ApiErrorBanner errorKey="interactions/delete"   title="Delete failed" />

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

          {/* Header */}
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Interaction History</Typography>
              <Typography variant="caption" color="text.secondary">
                {pagination.total > 0 ? `${pagination.total} total records` : 'No records found'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={load} aria-label="refresh"><RefreshIcon /></IconButton>
              </Tooltip>
              <Tooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
                <IconButton onClick={() => setShowFilters((p) => !p)} aria-label="toggle filters">
                  <FilterListIcon color={showFilters ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              {hasActiveFilters && (
                <Tooltip title="Clear all filters">
                  <IconButton onClick={() => dispatch(clearFilters())} aria-label="clear filters">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Button variant="contained" size="small" startIcon={<AddCommentIcon />}
                onClick={() => navigate('/log')}>
                Log New
              </Button>
            </Stack>
          </Box>

          {/* Search */}
          <TextField fullWidth size="small" sx={{ mb: 2 }}
            placeholder="Search by doctor name or product…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color:'text.disabled' }} /></InputAdornment>,
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }} />

          {/* Filter panel */}
          {showFilters && (
            <Box sx={{ mb: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField select fullWidth size="small" label="Type"
                    value={filters.type ?? ''}
                    onChange={(e) => dispatch(setFilters({ type: e.target.value || null }))}>
                    <MenuItem value=""><em>All Types</em></MenuItem>
                    {TYPES.map((t) => <MenuItem key={t} value={t} sx={{ textTransform:'capitalize' }}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField select fullWidth size="small" label="Status"
                    value={filters.outcome ?? ''}
                    onChange={(e) => dispatch(setFilters({ outcome: e.target.value || null }))}>
                    <MenuItem value=""><em>All Statuses</em></MenuItem>
                    {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform:'capitalize' }}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="From"
                    value={filters.dateFrom ?? ''}
                    onChange={(e) => dispatch(setFilters({ dateFrom: e.target.value || null }))}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" type="date" label="To"
                    value={filters.dateTo ?? ''}
                    onChange={(e) => dispatch(setFilters({ dateTo: e.target.value || null }))}
                    InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
              <Box sx={{ mt: 1, display:'flex', justifyContent:'flex-end' }}>
                <Button size="small" onClick={() => dispatch(clearFilters())}>Clear All</Button>
              </Box>
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* DataGrid */}
          <Box sx={{ height: 520 }}>
            <DataGrid
              rows={displayRows}
              columns={columns}
              loading={isLoading}
              rowCount={pagination.total}
              paginationMode="server"
              paginationModel={{ page: pagination.page, pageSize: pagination.pageSize }}
              onPaginationModelChange={(m) =>
                dispatch(setPagination({ page: m.page, pageSize: m.pageSize }))
              }
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              rowHeight={62}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'grey.50',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-row:hover':    { bgcolor: 'action.hover' },
                '& .MuiDataGrid-cell':         { borderColor: 'divider', display:'flex', alignItems:'center' },
                '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider' },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ViewInteractionDialog
        open={Boolean(viewRow)} interaction={viewRow}
        onClose={() => setViewRow(null)} onEdit={() => handleEdit(viewRow)} />

      <EditInteractionDialog
        open={Boolean(editRow)} interaction={editRow}
        onClose={() => setEditRow(null)} onSaved={load} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Delete Interaction?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete this interaction with{' '}
            <strong>{getDoctorName(deleteTarget?.doctor)}</strong>?
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteractionHistory;
