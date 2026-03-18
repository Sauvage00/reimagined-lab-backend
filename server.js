require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLICKUP_TOKEN = process.env.CLICKUP_API_KEY;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

app.get('/', (req, res) => {
  res.json({ status: 'Reimagined Lab backend is running' });
});

app.post('/api/submit-brief', async (req, res) => {
  try {
    const { clientName, email, projectType, aiSection, standardSection } = req.body;

    let description = '## New Brief Submission — Reimagined Lab\n\n';
    description += 'Client Name: ' + (clientName || 'Not provided') + '\n';
    description += 'Email: ' + (email || 'Not provided') + '\n';
    description += 'Project Type: ' + projectType + '\n\n---\n';

    if (aiSection && (projectType === 'ai' || projectType === 'both')) {
      description += '\n### AI VIDEO BRIEF\n\n';
      description += 'Brand Name: ' + (aiSection.brandName || '—') + '\n';
      description += 'Product/Service: ' + (aiSection.productName || '—') + '\n';
      description += 'Key Benefits: ' + (aiSection.keyBenefits || '—') + '\n';
      description += 'Tone/Vibe: ' + (aiSection.tone || '—') + '\n';
      description += 'Target Audience: ' + (aiSection.audience || '—') + '\n';
      description += 'Main Message/CTA: ' + (aiSection.mainMessage || '—') + '\n';
      description += 'Video Length: ' + (aiSection.videoLength || '—') + '\n';
      description += 'Voice Over: ' + (aiSection.voiceover || '—') + '\n';
      description += 'Visual Style: ' + (aiSection.visualStyle || '—') + '\n';
      description += 'Music Vibe: ' + (aiSection.musicVibe || '—') + '\n';
      description += 'Project Type: ' + (aiSection.projectType || '—') + '\n';
      description += 'Specific Scenes/Shots: ' + (aiSection.specificShots || '—') + '\n';
      description += 'What to Avoid: ' + (aiSection.avoid || '—') + '\n';
    }

    if (standardSection && (projectType === 'nonai' || projectType === 'both')) {
      description += '\n### STANDARD VIDEO BRIEF\n\n';
      description += 'Project Title: ' + (standardSection.projectTitle || '—') + '\n';
      description += 'Project Description: ' + (standardSection.description || '—') + '\n';
      description += 'Video Type: ' + (standardSection.videoType || '—') + '\n';
      description += 'Footage Situation: ' + (standardSection.footageSituation || '—') + '\n';
      description += 'Tone & Style: ' + (standardSection.tone || '—') + '\n';
      description += 'Music Preference: ' + (standardSection.musicPreference || '—') + '\n';
      description += 'Revision Rounds: ' + (standardSection.revisionRounds || '—') + '\n';
      description += 'Additional Notes: ' + (standardSection.additionalNotes || '—') + '\n';
    }

    description += '\n---\nSubmitted: ' + new Date().toLocaleString();

    const taskName = (clientName || 'New Client') + ' — ' + (projectType === 'ai' ? 'AI Video' : projectType === 'nonai' ? 'Standard Edit' : 'Combined') + ' Brief';

    const taskData = {
      name: taskName,
      description: description.trim(),
      status: 'open',
      priority: 2,
      tags: ['brief-submission', 'reimagined-lab']
    };

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

    console.log('ClickUp task created: ' + clickupRes.data.id);

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
