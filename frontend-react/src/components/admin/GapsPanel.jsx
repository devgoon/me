import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultGap } from './utils.js';

function GapsPanel({ adminData, prependListItem, removeListItem, updateListItem }) {
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
          Gaps
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => prependListItem('gaps', defaultGap())}
        >
          Add Gap
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Be honest about your gaps — this is what makes the AI valuable.
      </Typography>

      {(adminData.gaps || []).map((item, index) => (
        <Paper key={`gap-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
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
                Gap {index + 1}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => removeListItem('gaps', index)}
              >
                Remove
              </Button>
            </Stack>

            <TextField
              select
              label="Gap type"
              value={item.gapType || 'skill'}
              onChange={(e) => updateListItem('gaps', index, 'gapType', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="skill">Skill</MenuItem>
              <MenuItem value="experience">Experience</MenuItem>
              <MenuItem value="environment">Environment</MenuItem>
              <MenuItem value="role_type">Role type</MenuItem>
            </TextField>
            <TextField
              label="Description"
              value={item.description || ''}
              onChange={(e) => updateListItem('gaps', index, 'description', e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <TextField
              label="Why this is a gap"
              value={item.whyItsAGap || ''}
              onChange={(e) => updateListItem('gaps', index, 'whyItsAGap', e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(item.interestedInLearning)}
                  onChange={(e) =>
                    updateListItem('gaps', index, 'interestedInLearning', e.target.checked)
                  }
                />
              }
              label="Interested in learning"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default GapsPanel;
