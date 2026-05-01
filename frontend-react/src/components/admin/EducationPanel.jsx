import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultEducation } from './utils.js';

function EducationPanel({ adminData, prependListItem, removeListItem, updateListItem }) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          pb: 0.5,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Education
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => prependListItem('education', defaultEducation())}
        >
          Add Education
        </Button>
      </Stack>

      {(adminData.education || []).map((item, index) => (
        <Paper key={`edu-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                pb: 0.25,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {item.institution || `Education ${index + 1}`}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => removeListItem('education', index)}
              >
                Remove
              </Button>
            </Stack>

            <Stack direction="column" spacing={2}>
              <TextField
                label="Institution"
                value={item.institution || ''}
                onChange={(e) => updateListItem('education', index, 'institution', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Degree"
                value={item.degree || ''}
                onChange={(e) => updateListItem('education', index, 'degree', e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label="Field of study"
                value={item.fieldOfStudy || ''}
                onChange={(e) => updateListItem('education', index, 'fieldOfStudy', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Grade"
                value={item.grade || ''}
                onChange={(e) => updateListItem('education', index, 'grade', e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label="Start date"
                type="date"
                value={item.startDate || ''}
                onChange={(e) => updateListItem('education', index, 'startDate', e.target.value)}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End date"
                type="date"
                value={item.endDate || ''}
                onChange={(e) => updateListItem('education', index, 'endDate', e.target.value)}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(item.current)}
                  onChange={(e) => updateListItem('education', index, 'current', e.target.checked)}
                />
              }
              label="Currently enrolled"
            />
            <TextField
              label="Notes"
              value={item.notes || ''}
              onChange={(e) => updateListItem('education', index, 'notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default EducationPanel;
