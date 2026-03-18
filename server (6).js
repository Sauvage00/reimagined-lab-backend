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
  res.json({ status: 'Reimagined Lab backend is running', hasToken: !!CLICKUP_TOKEN, hasListId: !!CLICKUP_LIST_ID });
});

app.post('/api/submit-brief', async (req, res) => {
  console.log('--- New brief submission ---');

  if (!CLICKUP_TOKEN) return res.status(500).json({ success: false, message: 'Missing ClickUp token' });
  if (!CLICKUP_LIST_ID) return res.status(500).json({ success: false, message: 'Missing ClickUp list ID' });

  try {
    const { clientName, email, projectType, aiSection, standardSection } = req.body;

    const submissionDate = new Date();
    const deadlineDate = new Date(submissionDate);
    deadlineDate.setDate(deadlineDate.getDate() + 1);

    let projectTypeValue = '';
    let turnaroundCount = 0;

    if (aiSection && aiSection.projectType) {
      projectTypeValue = aiSection.projectType;
      turnaroundCount = turnaroundDays[aiSection.projectType] || 0;
    } else if (standardSection && standardSection.videoType) {
      projectTypeValue = standardSection.videoType;
      turnaroundCount = turnaroundDays[standardSection.videoType] || 0;
    }

    if (turnaroundCount > 0) {
      deadlineDate.setDate(deadlineDate.getDate() + (turnaroundCount - 1));
    }

    // Build description as backup
    let description = 'New Brief Submission\n\n';
    description += 'Client: ' + (clientName || 'N/A') + '\n';
    description += 'Email: ' + (email || 'N/A') + '\n';
    description += 'Type: ' + projectType + '\n';
    description += 'Submitted: ' + submissionDate.toLocaleString() + '\n';
    description += 'Deadline: ' + deadlineDate.toDateString() + '\n';

    if (aiSection) {
      description += '\n-- AI VIDEO --\n';
      Object.keys(aiSection).forEach(function(k) {
        if (aiSection[k]) description += k + ': ' + aiSection[k] + '\n';
      });
    }
    if (standardSection) {
      description += '\n-- STANDARD EDIT --\n';
      Object.keys(standardSection).forEach(function(k) {
        if (standardSection[k]) description += k + ': ' + standardSection[k] + '\n';
      });
    }

    const taskName = (clientName || 'New Client') + ' - ' + (projectType === 'ai' ? 'AI Video' : projectType === 'nonai' ? 'Standard Edit' : 'Combined') + ' Brief';

    const taskData = {
      name: taskName,
      description: description.trim(),
      status: 'to do',
      priority: 2,
      tags: ['brief-submission', 'reimagined-lab']
    };

    console.log('Creating task:', taskName);

    const clickupRes = await axios.post(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/task',
      taskData,
      { headers: { 'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json' } }
    );

    console.log('Task created:', clickupRes.data.id);

    res.json({
      success: true,
      message: 'Brief submitted successfully! We will review it and be in touch within 24 hours.',
      taskId: clickupRes.data.id
    });

  } catch (error) {
    const errData = error.response ? error.response.data : error.message;
    console.error('Error:', JSON.stringify(errData));
    res.status(500).json({ success: false, message: 'Failed to submit brief. Please try again.', error: errData });
  }
});

app.listen(PORT, function() {
  console.log('Backend running on port ' + PORT);
});