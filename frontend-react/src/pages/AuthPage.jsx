import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { apiRequest, tanstackRetryOptions } from '../lib/tanstackApi.js';

function redirectTo(path) {
  if (import.meta.env?.VITEST) return;
  window.location.href = path;
}

function AuthPage() {
  const authMessage = (authQuery) => {
    if (authQuery.isPending) return 'Checking sign-in status...';
    if (authQuery.isSuccess && authQuery.data?.ok)
      return 'Already signed in, redirecting to admin...';
    return 'Sign in with Microsoft to continue.';
  };
  const authQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () =>
      apiRequest(
        '/api/auth/me',
        { credentials: 'include' },
        { timeoutMs: 10000, maxAttempts: 5, baseDelay: 500 }
      ),
    ...tanstackRetryOptions({ maxAttempts: 5, baseDelay: 500 }),
  });

  useEffect(() => {
    if (authQuery.isSuccess && authQuery.data?.ok) {
      redirectTo('/admin');
    }
  }, [authQuery.isSuccess, authQuery.data]);

  return (
    <Card variant="outlined" sx={{ maxWidth: 520, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h1">Admin Authentication</Typography>
          <Typography>{authMessage(authQuery)}</Typography>
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
