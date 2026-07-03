import { Box, Link as MuiLink, Stack, Typography, Button, Drawer, IconButton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import ChatIcon from '@mui/icons-material/Chat';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useChat } from '../contexts/ChatContextContext.js';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/experience', label: 'Experience' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/education', label: 'Education' },
  { href: '/assets/Lodovico-Resume-04-08-26.pdf', label: 'Resume', external: true },
];

const socialLinks = [
  { href: 'https://www.linkedin.com/in/lodovico-minnocci/', icon: LinkedInIcon, label: 'LinkedIn' },
  { href: 'https://github.com/devgoon', icon: GitHubIcon, label: 'GitHub' },
];

function AppLayout({ children }) {
  const { openChat } = useChat();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMenuClose = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Left Sidebar Navigation */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          p: 3,
          bgcolor: 'rgba(10, 16, 29, 0.72)',
          backdropFilter: 'blur(14px)',
          borderRight: '1px solid',
          borderColor: 'divider',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Stack spacing={4}>
          {/* Logo */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: 'primary.light',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Vico
          </Typography>

          {/* Navigation Links */}
          <Stack spacing={1.5} aria-label="Main navigation" component="nav">
            {navItems.map((item) =>
              item.external ? (
                item.href && item.href.toLowerCase().endsWith('.pdf') ? (
                  <MuiLink
                    key={item.label}
                    href={item.href}
                    download="Lodovico-Resume.pdf"
                    sx={{
                      textDecoration: 'none',
                      color: 'text.primary',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.label}
                  </MuiLink>
                ) : (
                  <MuiLink
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      textDecoration: 'none',
                      color: 'text.primary',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.label}
                  </MuiLink>
                )
              ) : (
                <MuiLink
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  sx={{
                    textDecoration: 'none',
                    color: 'text.primary',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    transition: 'color 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {item.label}
                </MuiLink>
              )
            )}
          </Stack>

          <Button
            startIcon={<ChatIcon />}
            variant="outlined"
            onClick={() => openChat(null)}
            sx={{ mt: 2, textTransform: 'none' }}
          >
            Ask about Me (AI)
          </Button>

          <Button
            component={RouterLink}
            to="/fit"
            startIcon={<ChatIcon />}
            variant="outlined"
            sx={{ mt: 1, textTransform: 'none' }}
          >
            Assess My Fit (AI)
          </Button>

          {/* Social Links */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
          >
            {socialLinks.map((link) => {
              const Icon = link.icon;
              return (
                <MuiLink
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5rem',
                    height: '2.5rem',
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                  aria-label={link.label}
                >
                  <Icon sx={{ fontSize: '1.875rem', lineHeight: 1 }} />
                </MuiLink>
              );
            })}
          </Stack>
        </Stack>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          ml: { xs: 0, sm: '240px' },
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 16%)',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile Header with Menu */}
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'primary.light',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Vico
          </Typography>
          <IconButton onClick={handleMenuToggle} size="small">
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Main Content */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flex: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMenuClose}
        sx={{ display: { xs: 'block', sm: 'none' } }}
        PaperProps={{
          sx: {
            width: 240,
            bgcolor: 'rgba(10, 16, 29, 0.98)',
            backdropFilter: 'blur(14px)',
          },
        }}
      >
        <Stack
          spacing={3}
          sx={{
            p: 3,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.1rem',
                color: 'primary.light',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Vico
            </Typography>
            <IconButton onClick={handleMenuClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Navigation Links */}
          <Stack spacing={1.5} component="nav">
            {navItems.map((item) =>
              item.external ? (
                item.href && item.href.toLowerCase().endsWith('.pdf') ? (
                  <MuiLink
                    key={item.label}
                    href={item.href}
                    download="Lodovico-Resume.pdf"
                    onClick={handleMenuClose}
                    sx={{
                      textDecoration: 'none',
                      color: 'text.primary',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.label}
                  </MuiLink>
                ) : (
                  <MuiLink
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleMenuClose}
                    sx={{
                      textDecoration: 'none',
                      color: 'text.primary',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {item.label}
                  </MuiLink>
                )
              ) : (
                <MuiLink
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  onClick={handleMenuClose}
                  sx={{
                    textDecoration: 'none',
                    color: 'text.primary',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    transition: 'color 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {item.label}
                </MuiLink>
              )
            )}
          </Stack>

          <Button
            startIcon={<ChatIcon />}
            variant="outlined"
            onClick={() => {
              openChat(null);
              handleMenuClose();
            }}
            fullWidth
            sx={{ textTransform: 'none' }}
          >
            Ask about Me (AI)
          </Button>

          <Button
            component={RouterLink}
            to="/fit"
            startIcon={<ChatIcon />}
            variant="outlined"
            onClick={handleMenuClose}
            fullWidth
            sx={{ textTransform: 'none' }}
          >
            Assess My Fit (AI)
          </Button>

          {/* Social Links */}
          <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <MuiLink
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2.5rem',
                      height: '2.5rem',
                      color: 'text.secondary',
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                    aria-label={link.label}
                  >
                    <Icon sx={{ fontSize: '1.875rem', lineHeight: 1 }} />
                  </MuiLink>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
}

export default AppLayout;
