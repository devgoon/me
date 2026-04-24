import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

function ValuesPanel({ adminData, setValuesField }) {
  const v = adminData.valuesCulture;

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700}>
        Values &amp; Culture
      </Typography>

      <TextField
        label="Must-haves in a company"
        value={v.mustHaves || ''}
        onChange={(e) => setValuesField('mustHaves', e.target.value)}
        fullWidth
        multiline
        rows={4}
        size="small"
      />
      <TextField
        label="Dealbreakers"
        value={v.dealbreakers || ''}
        onChange={(e) => setValuesField('dealbreakers', e.target.value)}
        fullWidth
        multiline
        rows={4}
        size="small"
      />
      <TextField
        label="Management style preferences"
        value={v.managementStylePreferences || ''}
        onChange={(e) => setValuesField('managementStylePreferences', e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />
      <TextField
        label="Team size preferences"
        value={v.teamSizePreferences || ''}
        onChange={(e) => setValuesField('teamSizePreferences', e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />
      <TextField
        label="How do you handle conflict?"
        value={v.howHandleConflict || ''}
        onChange={(e) => setValuesField('howHandleConflict', e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />
      <TextField
        label="How do you handle ambiguity?"
        value={v.howHandleAmbiguity || ''}
        onChange={(e) => setValuesField('howHandleAmbiguity', e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />
      <TextField
        label="How do you handle failure?"
        value={v.howHandleFailure || ''}
        onChange={(e) => setValuesField('howHandleFailure', e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />
    </Stack>
  );
}

export default ValuesPanel;
