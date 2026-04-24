import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

function CachePanel({ loadCacheReport, cacheSearch, setCacheSearch, filteredCache }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ pb: 0.5 }}
      >
        <Typography variant="h6" fontWeight={700}>Cache Report</Typography>
        <Button variant="outlined" size="small" onClick={loadCacheReport}>
          Refresh
        </Button>
      </Stack>

      <TextField
        label="Search questions..."
        value={cacheSearch}
        onChange={(e) => setCacheSearch(e.target.value)}
        fullWidth
        size="small"
      />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Question</TableCell>
              <TableCell>Model</TableCell>
              <TableCell align="right">Cache Hits</TableCell>
              <TableCell>Last Accessed</TableCell>
              <TableCell>Invalidated At</TableCell>
              <TableCell align="center">Cached</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCache.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No cache records found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCache.map((row, index) => (
                <TableRow key={`cache-${index}`} hover>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.question || ''}
                  </TableCell>
                  <TableCell>{row.model || ''}</TableCell>
                  <TableCell align="right">{String(row.cached || '0')}</TableCell>
                  <TableCell>{String(row.lastAccessed || '')}</TableCell>
                  <TableCell>{String(row.invalidatedAt || '')}</TableCell>
                  <TableCell align="center">
                    {String(typeof row.is_cached !== 'undefined' ? row.is_cached : !row.hidden)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

export default CachePanel;
