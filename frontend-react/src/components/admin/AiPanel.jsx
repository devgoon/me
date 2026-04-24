import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { defaultRule } from './utils.js';

function AiPanel({ adminData, setAdminData }) {
  const honestyLevel = adminData.aiInstructions.honestyLevel || 7;

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={700}>AI Instructions</Typography>
      <Typography variant="body2" color="text.secondary">Tell the AI how to behave.</Typography>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" gutterBottom>
            Honesty level: {honestyLevel}/10
          </Typography>
          <Slider
            min={1}
            max={10}
            step={1}
            value={honestyLevel}
            marks
            valueLabelDisplay="auto"
            onChange={(_, val) =>
              setAdminData((prev) => ({
                ...prev,
                aiInstructions: { ...prev.aiInstructions, honestyLevel: Number(val) },
              }))
            }
          />
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ pb: 0.5 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>Instruction rules</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            setAdminData((prev) => ({
              ...prev,
              aiInstructions: {
                ...prev.aiInstructions,
                rules: [defaultRule(prev.aiInstructions.rules.length), ...(prev.aiInstructions.rules || [])],
              },
            }))
          }
        >
          Add Rule
        </Button>
      </Stack>

      {(adminData.aiInstructions.rules || []).map((rule, index) => (
        <Paper key={`rule-${index}`} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ pb: 0.25 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>Rule {index + 1}</Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  setAdminData((prev) => ({
                    ...prev,
                    aiInstructions: {
                      ...prev.aiInstructions,
                      rules: (prev.aiInstructions.rules || []).filter((_, i) => i !== index),
                    },
                  }));
                }}
              >
                Remove
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Type"
                value={rule.instructionType || 'tone'}
                onChange={(e) => {
                  setAdminData((prev) => {
                    const rules = [...(prev.aiInstructions.rules || [])];
                    rules[index] = { ...rules[index], instructionType: e.target.value };
                    return { ...prev, aiInstructions: { ...prev.aiInstructions, rules } };
                  });
                }}
                fullWidth
                size="small"
              >
                <MenuItem value="honesty">Honesty</MenuItem>
                <MenuItem value="tone">Tone</MenuItem>
                <MenuItem value="boundaries">Boundaries</MenuItem>
              </TextField>
              <TextField
                label="Priority"
                type="number"
                value={rule.priority || 10}
                onChange={(e) => {
                  setAdminData((prev) => {
                    const rules = [...(prev.aiInstructions.rules || [])];
                    rules[index] = { ...rules[index], priority: e.target.value };
                    return { ...prev, aiInstructions: { ...prev.aiInstructions, rules } };
                  });
                }}
                fullWidth
                size="small"
              />
            </Stack>
            <TextField
              label="Instruction"
              value={rule.instruction || ''}
              onChange={(e) => {
                setAdminData((prev) => {
                  const rules = [...(prev.aiInstructions.rules || [])];
                  rules[index] = { ...rules[index], instruction: e.target.value };
                  return { ...prev, aiInstructions: { ...prev.aiInstructions, rules } };
                });
              }}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export default AiPanel;
