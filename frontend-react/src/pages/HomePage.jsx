// no top-level React import required; keep file minimal
import { Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Chip,
  Stack,
  Typography,
  Box,
  Container,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiRequestJson, tanstackRetryOptions } from '../lib/tanstackApi.js';
import { useChat } from '../contexts/ChatContext.jsx';

function HomePage() {
  const { openChat } = useChat();
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () =>
      apiRequestJson(
        '/api/health',
        { method: 'GET' },
        { timeoutMs: 8000, maxAttempts: 5, baseDelay: 500 }
      ),
    ...tanstackRetryOptions({ maxAttempts: 5, baseDelay: 500 }),
  });

  const health = healthQuery.isPending
    ? 'Checking API...'
    : healthQuery.isError
      ? 'API unavailable from this host'
      : healthQuery.data?.status
        ? `API: ${healthQuery.data.status}`
        : 'API is reachable';

  return (
    <Stack spacing={6}>
      {/* Hero Section */}
      <Box component="section" sx={{ py: { xs: 4, md: 8 } }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3 }}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontWeight: 700 }}>
                  VM
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
                    Lodovico (Vico) Minnocci
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                    I design and deliver reliable, cloud-native distributed systems at startup speed
                    — now focused on autonomy and vehicle-scale software.
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body1" color="text.secondary">
                I help teams reduce risk and ship faster by combining pragmatic architecture,
                observability, and a focus on operational excellence.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={RouterLink} to="/fit" variant="contained" size="large">
                  JD Fit Check
                </Button>
                <Button variant="outlined" size="large" onClick={() => openChat(null)}>
                  Ask about Me (AI)
                </Button>
              </Stack>

              {/* Chat dialog is provided globally via ChatProvider */}

              <Divider />

              {/* Company Badges */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Selected experience
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
                    'Thermo Fisher Scientific',
                    'Fiserv',
                    'The Hartford',
                  ].map((company) => (
                    <Chip key={company} label={company} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>

              <Typography variant="caption" color="text.secondary">
                {health}
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Stack>
  );
}

export default HomePage;
