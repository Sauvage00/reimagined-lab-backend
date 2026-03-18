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

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Reimagined Lab backend is running',
    hasToken: !!CLICKUP_TOKEN,
    hasListId: !!CLICKUP_LIST_ID
  });
});

// Submit brief
app.post('/api/submit-brief', async (req, res) => {
  console.log('--- New brief submission received ---');
  console.log('CLICKUP_TOKEN set:', !!CLICKUP_TOKEN);
  console.log('CLICKUP_LIST_ID:', CLICKUP_LIST_ID);

  if (!CLICKUP_TOKEN) {
    console.error('ERROR: CLICKUP_TOKEN is not set');
    return res.status(500).json({ success: false, message: 'Server config error: missing ClickUp token' });
  }

  if (!CLICKUP_LIST_ID) {
    console.error('ERROR: CLICKUP_LIST_ID is not set');
    return res.status(500).json({ success: false, message: 'Server config error: missing ClickUp list ID' });
  }

  try {
    const { clientName, email, projectType, aiSection, standardSection } = req.body;
    console.log('Client:', clientName, '| Email:', email, '| Type:', projectType);

    let description = '## New Brief Submission - Reimagined Lab\n\n';
    description += 'Client Name: ' + (clientName || 'Not provided') + '\n';
    description += 'Email: ' + (email || 'Not provided') + '\n';
    description += 'Project Type: ' + projectType + '\n\n---\n';

    if (aiSection && (projectType === 'ai' || projectType === 'both')) {
      description += '\n### AI VIDEO BRIEF\n\n';
      description += 'Brand Name: ' + (aiSection.brandName || '-') + '\n';
      description += 'Product/Service: ' + (aiSection.productName || '-') + '\n';
      description += 'Key Benefits: ' + (aiSection.keyBenefits || '-') + '\n';
      description += 'Tone/Vibe: ' + (aiSection.tone || '-') + '\n';
      description += 'Target Audience: ' + (aiSection.audience || '-') + '\n';
      description += 'Main Message/CTA: ' + (aiSection.mainMessage || '-') + '\n';
      description += 'Video Length: ' + (aiSection.videoLength || '-') + '\n';
      description += 'Voice Over: ' + (aiSection.voiceover || '-') + '\n';
      description += 'Visual Style: ' + (aiSection.visualStyle || '-') + '\n';
      description += 'Music Vibe: ' + (aiSection.musicVibe || '-') + '\n';
      description += 'Project Type: ' + (aiSection.projectType || '-') + '\n';
      description += 'Specific Scenes/Shots: ' + (aiSection.specificShots || '-') + '\n';
      description += 'What to Avoid: ' + (aiSection.avoid || '-') + '\n';
    }

    if (standardSection && (projectType === 'nonai' || projectType === 'both')) {
      description += '\n### STANDARD VIDEO BRIEF\n\n';
      description += 'Project Title: ' + (standardSection.projectTitle || '-') + '\n';
      description += 'Project Description: ' + (standardSection.description || '-') + '\n';
      description += 'Video Type: ' + (standardSection.videoType || '-') + '\n';
      description += 'Footage Situation: ' + (standardSection.footageSituation || '-') + '\n';
      description += 'Tone & Style: ' + (standardSection.tone || '-') + '\n';
      description += 'Music Preference: ' + (standardSection.musicPreference || '-') + '\n';
      description += 'Revision Rounds: ' + (standardSection.revisionRounds || '-') + '\n';
      description += 'Additional Notes: ' + (standardSection.additionalNotes || '-') + '\n';
    }

    description += '\n---\nSubmitted: ' + new Date().toLocaleString();

    const taskName = (clientName || 'New Client') + ' - ' + (projectType === 'ai' ? 'AI Video' : projectType === 'nonai' ? 'Standard Edit' : 'Combined') + ' Brief';

    const taskData = {
      name: taskName,
      description: description.trim(),
      status: 'to do',
      priority: 2,
      tags: ['brief-submission', 'reimagined-lab']
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

    console.log('ClickUp task created successfully:', clickupRes.data.id);

    res.json({
      success: true,
      message: 'Brief submitted successfully! We will review it and be in touch within 24 hours.',
      taskId: clickupRes.data.id
    });

  } catch (error) {
    const errData = error.response ? error.response.data : error.message;
    const errStatus = error.response ? error.response.status : 'no status';
    console.error('ClickUp API error - Status:', errStatus);
    console.error('ClickUp API error - Data:', JSON.stringify(errData));
    res.status(500).json({
      success: false,
      message: 'Failed to submit brief. Error: ' + JSON.stringify(errData),
      error: errData
    });
  }
});

app.listen(PORT, function() {
  console.log('Backend running on port ' + PORT);
  console.log('CLICKUP_TOKEN set:', !!CLICKUP_TOKEN);
  console.log('CLICKUP_LIST_ID:', CLICKUP_LIST_ID);
});