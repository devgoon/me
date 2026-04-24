import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { apiRequest, tanstackRetryOptions } from '../lib/tanstackApi.js';

function redirectTo(path) {
  if (import.meta.env?.VITEST) return;
  window.location.href = path;
}

function AuthPage() {
  const [message, setMessage] = useState('Checking sign-in status...');
  const authQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest('/api/auth/me', { credentials: 'include' }, { timeoutMs: 10000, maxAttempts: 5, baseDelay: 500 }),
    ...tanstackRetryOptions({ maxAttempts: 5, baseDelay: 500 }),
  });

  useEffect(() => {
    if (authQuery.isPending) {
      setMessage('Checking sign-in status...');
      return;
    }

    if (authQuery.isSuccess && authQuery.data?.ok) {
      setMessage('Already signed in, redirecting to admin...');
      redirectTo('/admin');
      return;
    }

    setMessage('Sign in with Microsoft to continue.');
  }, [authQuery.data, authQuery.isPending, authQuery.isSuccess]);

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
