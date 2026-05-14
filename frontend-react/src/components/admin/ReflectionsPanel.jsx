import { Button, Paper, Stack, Typography } from '@mui/material';
import jsPDF from 'jspdf';

function ReflectionsPanel({ adminData }) {
  // Get the last three experiences (employers)
  const experiences = (adminData.experiences || []).slice(0, 3);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    experiences.forEach((exp, idx) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(16);
      doc.text(`Employer #${idx + 1}: ${exp.companyName || ''}`, 10, yPosition);
      yPosition += 10;
      doc.setFontSize(12);
      doc.text(`Role: ${exp.title || ''}`, 10, yPosition);
      yPosition += 8;
      doc.text(`Actual Contributions:`, 10, yPosition);
      yPosition += 6;
      doc.setFontSize(10);
      const contribLines = doc.splitTextToSize(exp.actualContributions || '', 180);
      contribLines.forEach((line) => {
        doc.text(line, 12, yPosition);
        yPosition += 5;
      });
      doc.setFontSize(12);
      doc.text(`Proudest Achievement:`, 10, yPosition);
      yPosition += 6;
      doc.setFontSize(10);
      const achieveLines = doc.splitTextToSize(exp.proudestAchievement || '', 180);
      achieveLines.forEach((line) => {
        doc.text(line, 12, yPosition);
        yPosition += 5;
      });
      doc.setFontSize(12);
      doc.text(`Would Do Differently:`, 10, yPosition);
      yPosition += 6;
      doc.setFontSize(10);
      const diffLines = doc.splitTextToSize(exp.wouldDoDifferently || '', 180);
      diffLines.forEach((line) => {
        doc.text(line, 12, yPosition);
        yPosition += 5;
      });
      doc.setFontSize(12);
      doc.text(`Lessons Learned:`, 10, yPosition);
      yPosition += 6;
      doc.setFontSize(10);
      const lessonLines = doc.splitTextToSize(exp.lessonsLearned || '', 180);
      lessonLines.forEach((line) => {
        doc.text(line, 12, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    });
    doc.save('employer-reflections.pdf');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700}>
        Employer Reflections
      </Typography>
      {experiences.length === 0 && <Typography>No employer data found.</Typography>}
      {experiences.map((exp, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {exp.companyName || `Employer #${idx + 1}`}
          </Typography>
          <Typography variant="body2">Role: {exp.title || '-'}</Typography>
          {exp.actualContributions && (
            <Typography variant="body2">
              <strong>Actual Contributions:</strong> {exp.actualContributions}
            </Typography>
          )}
          {exp.proudestAchievement && (
            <Typography variant="body2">
              <strong>Proudest Achievement:</strong> {exp.proudestAchievement}
            </Typography>
          )}
          {exp.wouldDoDifferently && (
            <Typography variant="body2">
              <strong>Would Do Differently:</strong> {exp.wouldDoDifferently}
            </Typography>
          )}
          {exp.lessonsLearned && (
            <Typography variant="body2">
              <strong>Lessons Learned:</strong> {exp.lessonsLearned}
            </Typography>
          )}
        </Paper>
      ))}
      <Button variant="contained" onClick={handleGeneratePDF} disabled={experiences.length === 0}>
        Generate PDF
      </Button>
    </Stack>
  );
}

export default ReflectionsPanel;
