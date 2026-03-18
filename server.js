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

let fieldMap = {};

const turnaroundDays = {
  short: 3, youtube: 5, carousel6: 2, carousel12: 3,
  videocarousel6: 2, videocarousel12: 3,
  social: 2, commercial: 5, documentary: 7
};

// Dropdown option mappings (index-based)
const dropdownOptions = {
  projectType: {
    'ai short video': 0, 'ai youtube video': 1, 'ai carousels bundle': 2,
    'youtube video': 3, '15-second short': 4, 'social media clip': 5,
    'commercial ad': 6, 'documentary': 7
  },
  briefStatus: { 'draft': 0, 'review': 1, 'complete': 2 },
  projectStatus: { 'to do': 0, 'in progress': 1, 'draft one': 2, 'draft two': 3, 'review': 4, 'complete': 5 },
  aiProjectType: { 'short video': 0, 'youtube': 1, 'carousels 6': 2, 'carousels 12': 3, 'video carousels 6': 4, 'video carousels 12': 5 },
  voiceoverRequired: { 'yes': 0, 'no': 1 }
};

async function fetchFieldIds() {
  try {
    const res = await axios.get(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/field',
      { headers: { Authorization: CLICKUP_TOKEN } }
    );
    res.data.fields.forEach(function(field) {
      var key = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      fieldMap[key] = { id: field.id, type: field.type };
    });
    console.log('Fields loaded:', Object.keys(fieldMap).length);
  } catch (err) {
    console.error('Could not fetch fields:', err.message);
  }
}

function getField(name) {
  return fieldMap[name.toLowerCase().replace(/[^a-z0-9]/g, '')] || null;
}

function addField(fields, name, value, dropdownKey) {
  if (!value) return;
  var field = getField(name);
  if (!field) return;
  
  // For dropdown fields, convert value to option index
  if (field.type === 'select' || dropdownKey) {
    var options = dropdownOptions[dropdownKey];
    if (options) {
      var idx = options[value.toLowerCase()];
      if (idx !== undefined) {
        fields.push({ id: field.id, value: idx });
      }
    }
  }
  // For date fields, send Unix timestamp
  else if (field.type === 'date') {
    var ts = new Date(value).getTime();
    if (!isNaN(ts)) fields.push({ id: field.id, value: ts });
  }
  // For text and other fields
  else {
    fields.push({ id: field.id, value: String(value) });
  }
}

app.get('/', (req, res) => {
  res.json({ status: 'Backend running', fieldsLoaded: Object.keys(fieldMap).length });
});

app.post('/api/submit-brief', async (req, res) => {
  console.log('--- New brief submission ---');
  if (!CLICKUP_TOKEN) return res.status(500).json({ success: false, message: 'Missing token' });
  if (!CLICKUP_LIST_ID) return res.status(500).json({ success: false, message: 'Missing list ID' });
  if (Object.keys(fieldMap).length === 0) await fetchFieldIds();

  try {
    const { clientName, email, projectType, aiSection, standardSection } = req.body;

    const submissionDate = new Date();
    const deadlineDate = new Date(submissionDate);
    deadlineDate.setDate(deadlineDate.getDate() + 1);

    let turnaroundCount = 0;
    let aiProjectTypeVal = '';
    let videoTypeVal = '';

    if (aiSection && aiSection.projectType) {
      aiProjectTypeVal = aiSection.projectType;
      turnaroundCount = turnaroundDays[aiSection.projectType] || 0;
    } else if (standardSection && standardSection.videoType) {
      videoTypeVal = standardSection.videoType;
      turnaroundCount = turnaroundDays[standardSection.videoType] || 0;
    }

    if (turnaroundCount > 0) {
      deadlineDate.setDate(deadlineDate.getDate() + (turnaroundCount - 1));
    }

    const customFields = [];

    // Core fields
    addField(customFields, 'Client Name', clientName);
    addField(customFields, 'Email', email);
    addField(customFields, 'Project Type', projectType, 'projectType');
    addField(customFields, 'Brief Status', 'draft', 'briefStatus');
    addField(customFields, 'Project Status', 'to do', 'projectStatus');
    addField(customFields, 'Submission Date', submissionDate.toISOString());
    addField(customFields, 'Actual Deadline', deadlineDate.toISOString());
    addField(customFields, 'Turnaround Time', turnaroundCount + ' days');

    // AI fields
    if (aiSection) {
      addField(customFields, 'Brand Name', aiSection.brandName);
      addField(customFields, 'Product/Service Name', aiSection.productName);
      addField(customFields, 'Key Benefits', aiSection.keyBenefits);
      addField(customFields, 'Tone & Style', aiSection.tone);
      addField(customFields, 'Target Audience', aiSection.audience);
      addField(customFields, 'Main Message/CTA', aiSection.mainMessage);
      addField(customFields, 'Video Length', aiSection.videoLength);
      addField(customFields, 'Voice Over Required', aiSection.voiceoverRequired, 'voiceoverRequired');
      addField(customFields, 'Voice Gender', aiSection.voiceGender);
      addField(customFields, 'Voice Tone', aiSection.voiceTone);
      addField(customFields, 'Voice Energy', aiSection.voiceEnergy);
      addField(customFields, 'Voice Accent', aiSection.voiceAccent);
      addField(customFields, 'Visual Style', aiSection.visualStyle);
      addField(customFields, 'Music Preference', aiSection.musicVibe);
      addField(customFields, 'AI Project Type', aiProjectTypeVal, 'aiProjectType');
      addField(customFields, 'Specific Scenes/Shots', aiSection.specificShots);
      addField(customFields, 'What to Avoid', aiSection.avoid);
    }

    // Standard fields
    if (standardSection) {
      addField(customFields, 'Project Title', standardSection.projectTitle);
      addField(customFields, 'Project Description', standardSection.description);
      addField(customFields, 'Video Type', videoTypeVal);
      addField(customFields, 'Footage Situation', standardSection.footageSituation);
      addField(customFields, 'Google Drive Link', standardSection.googleDriveLink);
      addField(customFields, 'Tone & Style', standardSection.tone);
      addField(customFields, 'Music Preference', standardSection.musicPreference);
      addField(customFields, 'Vision Rounds', standardSection.revisionRounds);
      addField(customFields, 'Additional Notes', standardSection.additionalNotes);
      addField(customFields, 'Notes', standardSection.additionalNotes);
    }

    console.log('Sending', customFields.length, 'fields');

    const taskName = (clientName || 'New Client') + ' - ' + projectType;

    const clickupRes = await axios.post(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/task',
      {
        name: taskName,
        status: 'to do',
        priority: 2,
        tags: ['brief-submission'],
        custom_fields: customFields
      },
      { headers: { Authorization: CLICKUP_TOKEN, 'Content-Type': 'application/json' } }
    );

    console.log('Task created:', clickupRes.data.id);

    res.json({
      success: true,
      message: 'Brief submitted! We will review it within 24 hours.',
      taskId: clickupRes.data.id
    });

  } catch (error) {
    const errData = error.response ? error.response.data : error.message;
    console.error('Error:', JSON.stringify(errData));
    res.status(500).json({ success: false, message: 'Failed to submit. Please try again.', error: errData });
  }
});

app.listen(PORT, async function() {
  console.log('Backend running on port ' + PORT);
  await fetchFieldIds();
});