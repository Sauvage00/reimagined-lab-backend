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

// Store field IDs after fetching
let fieldMap = {};

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

// Fetch custom field IDs from ClickUp on startup
async function fetchFieldIds() {
  try {
    const res = await axios.get(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/field',
      { headers: { 'Authorization': CLICKUP_TOKEN } }
    );
    res.data.fields.forEach(function(field) {
      // Map field name (lowercase, no spaces) to field ID
      fieldMap[field.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = field.id;
    });
    console.log('ClickUp fields loaded:', Object.keys(fieldMap));
  } catch (err) {
    console.error('Could not fetch ClickUp fields:', err.message);
  }
}

// Helper to get field ID by name
function getFieldId(name) {
  return fieldMap[name.toLowerCase().replace(/[^a-z0-9]/g, '')] || null;
}

// Build custom_fields array from form data
function buildCustomFields(clientName, email, projectType, aiSection, standardSection, submissionDate, deadlineDate, turnaroundCount) {
  const fields = [];

  function addField(name, value) {
    const id = getFieldId(name);
    if (id && value) {
      fields.push({ id: id, value: String(value) });
    }
  }

  // Core fields
  addField('Client Name', clientName || '');
  addField('Email', email || '');
  addField('Project Type', projectType || '');
  addField('Submission Date', submissionDate.toISOString().split('T')[0]);
  addField('Actual Deadline', deadlineDate.toISOString().split('T')[0]);
  addField('Turnaround Time', turnaroundCount + ' days');

  // AI section fields
  if (aiSection) {
    addField('Brand Name', aiSection.brandName);
    addField('Product/Service Name', aiSection.productName);
    addField('Key Benefits', aiSection.keyBenefits);
    addField('Tone & Style', aiSection.tone);
    addField('Target Audience', aiSection.audience);
    addField('Main Message/CTA', aiSection.mainMessage);
    addField('Video Length', aiSection.videoLength);
    addField('Voice Gender', aiSection.voiceGender);
    addField('Voice Accent', aiSection.voiceAccent);
    addField('Voice Energy', aiSection.voiceEnergy);
    addField('Visual Style', aiSection.visualStyle);
    addField('Music Preference', aiSection.musicVibe);
    addField('AI Project Type', aiSection.projectType);
    addField('Specific Scenes/Shots', aiSection.specificShots);
    addField('Additional Notes', aiSection.avoid);
  }

  // Standard section fields
  if (standardSection) {
    addField('Project Title', standardSection.projectTitle);
    addField('Project Description', standardSection.description);
    addField('Video Type', standardSection.videoType);
    addField('Footage Situation', standardSection.footageSituation);
    addField('Google Drive Link', standardSection.googleDriveLink);
    addField('Tone & Style', standardSection.tone);
    addField('Music Preference', standardSection.musicPreference);
    addField('Vision Rounds', standardSection.revisionRounds);
    addField('Additional Notes', standardSection.additionalNotes);
    addField('Notes', standardSection.additionalNotes);
  }

  return fields;
}

app.get('/', (req, res) => {
  res.json({
    status: 'Reimagined Lab backend is running',
    hasToken: !!CLICKUP_TOKEN,
    hasListId: !!CLICKUP_LIST_ID,
    fieldsLoaded: Object.keys(fieldMap).length
  });
});

app.post('/api/submit-brief', async (req, res) => {
  console.log('--- New brief submission ---');

  if (!CLICKUP_TOKEN) return res.status(500).json({ success: false, message: 'Missing ClickUp token' });
  if (!CLICKUP_LIST_ID) return res.status(500).json({ success: false, message: 'Missing ClickUp list ID' });

  // Re-fetch fields if not loaded yet
  if (Object.keys(fieldMap).length === 0) {
    await fetchFieldIds();
  }

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

    // Build custom fields
    const customFields = buildCustomFields(
      clientName, email, projectType,
      aiSection, standardSection,
      submissionDate, deadlineDate, turnaroundCount
    );

    console.log('Custom fields being sent:', customFields.length);

    // Also build description as fallback
    let description = 'Brief Submission\n';
    description += 'Client: ' + (clientName || 'N/A') + '\n';
    description += 'Email: ' + (email || 'N/A') + '\n';
    description += 'Submitted: ' + submissionDate.toLocaleString() + '\n';
    description += 'Deadline: ' + deadlineDate.toDateString() + '\n';

    const taskName = (clientName || 'New Client') + ' - ' + (projectType === 'ai' ? 'AI Video' : projectType === 'nonai' ? 'Standard Edit' : 'Combined') + ' Brief';

    const taskData = {
      name: taskName,
      description: description.trim(),
      status: 'to do',
      priority: 2,
      tags: ['brief-submission', 'reimagined-lab'],
      custom_fields: customFields
    };

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

// Start server and fetch fields
app.listen(PORT, async function() {
  console.log('Backend running on port ' + PORT);
  await fetchFieldIds();
});