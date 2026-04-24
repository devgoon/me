import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { apiFetch } from '../lib/api.js';

function AuthPage() {
  const [message, setMessage] = useState('Checking sign-in status...');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch('/api/auth/me', { credentials: 'include' }, { timeoutMs: 10000 });
        if (response.ok) {
          if (active) {
            setMessage('Already signed in, redirecting to admin...');
            window.location.href = '/admin';
          }
          return;
        }
      } catch {
        // No-op, fallback to sign-in prompt.
      }
      if (active) setMessage('Sign in with Microsoft to continue.');
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card variant="outlined" sx={{ maxWidth: 520, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h1">Admin Authentication</Typography>
          <Typography>{message}</Typography>
          <Button
            component="a"
            href="/.auth/login/aad?post_login_redirect_uri=/admin"
            variant="contained"
          >
            Sign In With Microsoft
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AuthPage;
