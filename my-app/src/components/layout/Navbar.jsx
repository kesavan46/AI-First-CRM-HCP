import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import MenuIcon             from '@mui/icons-material/Menu';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LogoutIcon           from '@mui/icons-material/LogoutOutlined';
import PersonOutlineIcon    from '@mui/icons-material/PersonOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleChat, selectChatIsOpen } from '../../store/slices/chatSlice';
import { logoutThunk, selectCurrentUser, selectAuthLoading } from '../../store/slices/authSlice';
import { SIDEBAR_WIDTH } from './Sidebar';

/**
 * Navbar (top AppBar)
 *
 * Props:
 *   onMenuClick – () => void, opens mobile sidebar drawer
 *   title       – string, current page title displayed in the bar
 */
const Navbar = ({ onMenuClick, title = 'Dashboard' }) => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const chatOpen  = useSelector(selectChatIsOpen);
  const user      = useSelector(selectCurrentUser);
  const isLoading = useSelector(selectAuthLoading);

  // Avatar menu anchor
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleAvatarClick  = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose    = ()  => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  // Derive initials from user's full name or email
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml:    { md: `${SIDEBAR_WIDTH}px` },
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Mobile hamburger */}
        <IconButton
          edge="start"
          aria-label="open navigation menu"
          onClick={onMenuClick}
          sx={{ display: { md: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Page title */}
        <Typography
          variant="h6"
          fontWeight={600}
          noWrap
          component="h1"
          sx={{ flexGrow: 1, color: 'text.primary' }}
        >
          {title}
        </Typography>

        {/* Action icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton aria-label="notifications" size="large">
              <Badge badgeContent={3} color="error">
                <NotificationsNoneIcon sx={{ color: 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* AI Chat toggle */}
          <Tooltip title={chatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}>
            <IconButton
              aria-label="toggle AI chat assistant"
              size="large"
              onClick={() => dispatch(toggleChat())}
              sx={{ color: chatOpen ? 'primary.main' : 'text.secondary' }}
            >
              <ChatBubbleOutlineIcon />
            </IconButton>
          </Tooltip>

          {/* Avatar — opens account menu */}
          <Tooltip title="Account">
            <IconButton
              aria-label="open account menu"
              aria-controls={menuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
              onClick={handleAvatarClick}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 32, height: 32,
                  bgcolor: 'primary.main',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* ── Account dropdown menu ─────────────────────────────────── */}
      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            overflow: 'visible',
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0, right: 14,
              width: 10, height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* User info header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {user?.full_name ?? 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email ?? ''}
          </Typography>
        </Box>

        <Divider />

        {/* Profile (placeholder) */}
        <MenuItem sx={{ py: 1.25 }} onClick={handleMenuClose}>
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>

        <Divider />

        {/* Logout */}
        <MenuItem
          onClick={handleLogout}
          disabled={isLoading}
          sx={{ py: 1.25, color: 'error.main' }}
        >
          <ListItemIcon>
            {isLoading
              ? <CircularProgress size={16} color="inherit" />
              : <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
            }
          </ListItemIcon>
          <ListItemText>{isLoading ? 'Signing out…' : 'Logout'}</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Navbar;
