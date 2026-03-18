require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

const turnaroundDays = {
  'short': 3,
  'youtube': 5,
  'carousel6': 2,
  'carousel12': 3,
  'videocarousel6': 2,
  'videocarousel12': 3,
  'social': 2,
  'commercial': 5,
  'documentary': 7
};

app.get('/', (req, res) => {
  res.json({ status: 'Reimagined Lab backend is running' });
});

app.post('/api/submit-brief', async (req, res) => {
  try {
    const { clientName, email, projectType, aiSection, standardSection } = req.body;

    // Calculate submission date and deadline
    const submissionDate = new Date();
    const deadlineDate = new Date(submissionDate);
    deadlineDate.setDate(deadlineDate.getDate() + 1); // Start next day

    let projectTypeValue = '';
    let turnaroundDaysCount = 0;

    // Determine project type and turnaround days
    if (aiSection && aiSection.projectType) {
      projectTypeValue = aiSection.projectType;
      turnaroundDaysCount = turnaroundDays[aiSection.projectType] || 0;
    } else if (standardSection && standardSection.videoType) {
      projectTypeValue = standardSection.videoType;
      turnaroundDaysCount = turnaroundDays[standardSection.videoType] || 0;
    }

    // Add turnaround days to deadline (starting from next day)
    if (turnaroundDaysCount > 0) {
      deadlineDate.setDate(deadlineDate.getDate() + (turnaroundDaysCount - 1));
    }

    // Map all form fields to ClickUp custom fields
    const customFields = [
      { id: 'clientName', value: clientName || '' },
      { id: 'email', value: email || '' },
      { id: 'projectType', value: projectTypeValue },
      { id: 'submissionDate', value: submissionDate.toISOString().split('T')[0] },
      { id: 'actualDeadline', value: deadlineDate.toISOString().split('T')[0] },
      { id: 'turnaroundTime', value: turnaroundDaysCount + ' days' }
    ];

    // Add AI fields if present
    if (aiSection) {
      if (aiSection.brandName) customFields.push({ id: 'brandName', value: aiSection.brandName });
      if (aiSection.productName) customFields.push({ id: 'productServiceName', value: aiSection.productName });
      if (aiSection.keyBenefits) customFields.push({ id: 'keyBenefits', value: aiSection.keyBenefits });
      if (aiSection.tone) customFields.push({ id: 'aiToneVibe', value: aiSection.tone });
      if (aiSection.audience) customFields.push({ id: 'targetAudience', value: aiSection.audience });
      if (aiSection.mainMessage) customFields.push({ id: 'mainMessageCTA', value: aiSection.mainMessage });
      if (aiSection.videoLength) customFields.push({ id: 'videoLength', value: aiSection.videoLength });
      if (aiSection.voiceoverRequired) customFields.push({ id: 'voiceoverIncluded', value: aiSection.voiceoverRequired === 'yes' ? 'Yes' : 'No' });
      if (aiSection.voiceGender) customFields.push({ id: 'voiceGender', value: aiSection.voiceGender });
      if (aiSection.voiceTone) customFields.push({ id: 'voiceTone', value: aiSection.voiceTone });
      if (aiSection.voiceEnergy) customFields.push({ id: 'voiceEnergy', value: aiSection.voiceEnergy });
      if (aiSection.voiceAccent) customFields.push({ id: 'voiceAccent', value: aiSection.voiceAccent });
      if (aiSection.visualStyle) customFields.push({ id: 'visualStyle', value: aiSection.visualStyle });
      if (aiSection.musicVibe) customFields.push({ id: 'musicVibe', value: aiSection.musicVibe });
      if (aiSection.specificShots) customFields.push({ id: 'specificShotsScenes', value: aiSection.specificShots });
      if (aiSection.avoid) customFields.push({ id: 'whatToAvoid', value: aiSection.avoid });
    }

    // Add Standard Edit fields if present
    if (standardSection) {
      if (standardSection.projectTitle) customFields.push({ id: 'projectTitle', value: standardSection.projectTitle });
      if (standardSection.description) customFields.push({ id: 'projectDescription', value: standardSection.description });
      if (standardSection.videoType) customFields.push({ id: 'videoType', value: standardSection.videoType });
      if (standardSection.footageSituation) customFields.push({ id: 'footageSituation', value: standardSection.footageSituation });
      if (standardSection.googleDriveLink) customFields.push({ id: 'googleDriveLink', value: standardSection.googleDriveLink });
      if (standardSection.tone) customFields.push({ id: 'toneStyle', value: standardSection.tone });
      if (standardSection.musicPreference) customFields.push({ id: 'musicPreference', value: standardSection.musicPreference });
      if (standardSection.revisionRounds) customFields.push({ id: 'revisionRounds', value: standardSection.revisionRounds });
      if (standardSection.additionalNotes) customFields.push({ id: 'notes', value: standardSection.additionalNotes });
    }

    const taskName = (clientName || 'New Client') + ' - ' + (projectType === 'ai' ? 'AI Video' : projectType === 'nonai' ? 'Standard Edit' : 'Combined') + ' Brief';

    const taskData = {
      name: taskName,
      status: 'to do',
      priority: 2,
      tags: ['brief-submission', 'reimagined-lab'],
      custom_fields: customFields
    };

    console.log('Creating ClickUp task:', taskName);

    const clickupRes = await axios.post(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/task',
      taskData,
      {
        headers: {
          'Authorization': CLICKUP_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('ClickUp task created:', clickupRes.data.id);

    res.json({
      success: true,
      message: 'Brief submitted successfully! We will review it and be in touch within 24 hours.',
      taskId: clickupRes.data.id
    });

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit brief. Please try again.',
      error: error.message
    });
  }
});

app.listen(PORT, function() {
  console.log('Backend running on port ' + PORT);
});
