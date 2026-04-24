import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Card, CardContent, Chip, Stack, Typography, Box } from '@mui/material';
import { apiFetch } from '../lib/api.js';
import ChatDialog from '../components/ChatDialog.jsx';

function HomePage() {
  const [health, setHealth] = useState('Checking API...');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/health', { method: 'GET' }, { timeoutMs: 8000 });
        if (!res.ok) throw new Error('Health request failed');
        const data = await res.json();
        if (active) setHealth(data.status ? `API: ${data.status}` : 'API is reachable');
      } catch {
        if (active) setHealth('API unavailable from this host');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack spacing={6}>
      {/* Hero Section */}
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Stack spacing={2}>
                <Typography variant="h2" sx={{ fontWeight: 700 }}>
                  Lodovico (Vico) Minnocci
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Building cloud-native systems, from startups to Fortune 500s. Now driving innovation in autonomous vehicles.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button component={RouterLink} to="/fit" variant="contained" size="large">
                  See if we are a match
                </Button>
                <Button variant="outlined" size="large" onClick={() => setChatOpen(true)}>
                  Ask AI about Me
                </Button>
              </Stack>
              <ChatDialog open={chatOpen} onClose={() => setChatOpen(false)} />

              {/* Company Badges */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Experience at
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap' }}
                  component="div"
                  useFlexGap
                >
                  {[
                    'Torc Robotics',
                    'Ancera',
                    'Subway',
                    'Thermo Fisher Scientific',
                    'Fiserv',
                    'The Hartford',
                    'Neopost',
                    'Ingenix',
                  ].map((company) => (
                    <Chip key={company} label={company} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary">
                {health}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export default HomePage;
