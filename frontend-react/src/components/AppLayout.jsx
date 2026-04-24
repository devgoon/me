import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/experience', label: 'Experience' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/education', label: 'Education' },
  { to: '/fit', label: 'See If We\'re A Match' },
  { href: '/assets/Lodovico-Resume-04-08-26.pdf', label: 'Download Resume', external: true },
];

const socialLinks = [
  { href: 'https://www.linkedin.com/in/lodovico-minnocci/', icon: LinkedInIcon, label: 'LinkedIn' },
  { href: 'https://github.com/devgoon', icon: GitHubIcon, label: 'GitHub' },
];

function AppLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Left Sidebar Navigation */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          p: 3,
          borderRight: '1px solid',
          borderColor: 'divider',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Stack spacing={4}>
          {/* Logo */}
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
            Vico
          </Typography>

          {/* Navigation Links */}
          <Stack
            spacing={1.5}
            aria-label="Main navigation"
            component="nav"
          >
            {navItems.map((item) => (
              item.external ? (
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
            ))}
          </Stack>

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
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                  aria-label={link.label}
                >
                  <Icon sx={{ fontSize: '1.25rem' }} />
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
          ml: '240px',
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default AppLayout;
