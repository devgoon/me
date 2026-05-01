import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ADMIN_TABS } from '../components/admin/state.js';
import { useAdminPage } from './admin/useAdminPage.js';
import { ADMIN_PANEL_REGISTRY } from './admin/panelRegistry.jsx';

const TAB_LABELS = {
  profile: 'Profile',
  experience: 'Experience',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  gaps: 'Gaps',
  values: 'Values & Culture',
  faq: 'FAQ',
  ai: 'AI Instructions',
  cache: 'Cache Report',
};

function AdminPage() {
  const admin = useAdminPage();
  const activePanel = ADMIN_PANEL_REGISTRY[admin.activeTab] || null;
  const ActivePanelComponent = activePanel?.Component || null;
  const activePanelProps = activePanel?.buildProps ? activePanel.buildProps(admin) : {};

  if (admin.loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading admin panel...</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Topbar */}
      <Paper variant="outlined" sx={{ px: 3, py: 1.5, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="h5" fontWeight={700}>
            Admin Panel
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              href="/"
              target="_blank"
              rel="noopener"
              endIcon={<OpenInNewIcon />}
            >
              View Site
            </Button>
            <Button variant="contained" size="small" onClick={admin.save}>
              Save All Changes
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              href="/.auth/logout?post_logout_redirect_uri=/auth"
            >
              Sign Out
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {admin.status ? (
        <Typography variant="body2" color="text.secondary">
          {admin.status}
        </Typography>
      ) : null}

      {/* Two-column layout */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <Paper
          variant="outlined"
          sx={{ width: 200, flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}
        >
          <List disablePadding>
            {ADMIN_TABS.map((tab, i) => (
              <ListItemButton
                key={tab}
                selected={admin.activeTab === tab}
                onClick={() => admin.handleTabChange(tab)}
                divider={i < ADMIN_TABS.length - 1}
                sx={{ py: 1.25 }}
              >
                <ListItemText
                  primary={TAB_LABELS[tab] || tab}
                  slotProps={{
                    primary: {
                      fontSize: '0.875rem',
                      fontWeight: admin.activeTab === tab ? 700 : 400,
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Active panel */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiFormControl-root': {
              width: '100%',
            },
            '& .MuiInputLabel-root': {
              position: 'static',
              transform: 'none',
              mb: 0.75,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'text.secondary',
              lineHeight: 1.2,
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'text.secondary',
            },
            '& .MuiInputLabel-shrink': {
              transform: 'none',
            },
            '& .MuiOutlinedInput-notchedOutline legend': {
              maxWidth: 0,
            },
          }}
        >
          {ActivePanelComponent ? <ActivePanelComponent {...activePanelProps} /> : null}
        </Box>
      </Box>
    </Stack>
  );
}

export default AdminPage;
