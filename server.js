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
  res.json({ status: 'Reimagined Lab backend is running' });
});

// Submit order to ClickUp
app.post('/api/submit-order', async (req, res) => {
  try {
    const {
      brandName,
      productName,
      keyFeatures,
      brandTone,
      audience,
      mainMessage,
      cta,
      videoLength,
      visualStyle,
      voiceover,
      voGender,
      voEnergy,
      voTone,
      specificShots,
      avoid,
      selectedScript,
      addons,
      total
    } = req.body;

    // Build ClickUp task description
    const description = `
## 🎬 New Video Production Order — Reimagined Lab

### Brand & Product
- **Brand:** ${brandName || 'Not specified'}
- **Product:** ${productName || 'Not specified'}
- **Key Features:** ${keyFeatures || 'Not specified'}
- **Brand Tone:** ${brandTone || 'Not specified'}

### Audience & Message
- **Target Audience:** ${audience || 'Not specified'}
- **Main Message:** ${mainMessage || 'Not specified'}
- **Call to Action:** ${cta || 'Not specified'}

### Video Specs
- **Length:** ${videoLength || 'Not specified'}
- **Visual Style:** ${visualStyle || 'Not specified'}

### Voiceover
- **Include Voiceover:** ${voiceover ? 'Yes' : 'No'}
${voiceover ? `- **Gender:** ${voGender || 'Not specified'}
- **Energy:** ${voEnergy || 'Not specified'}
- **Tone/Personality:** ${voTone || 'Not specified'}` : ''}

### Special Requests
- **Specific Shots:** ${specificShots || 'None'}
- **Avoid:** ${avoid || 'Nothing specified'}

### Selected Script
${selectedScript || 'Not yet selected'}

### Order Summary
**Add-ons:** ${addons && addons.length > 0 ? addons.join(', ') : 'None'}
**Total:** $${total || 0}
${total === 0 ? '*(Free order — scripts only)*' : '*(Payment pending)*'}
    `.trim();

    // Create task in ClickUp
    const taskData = {
      name: `🎬 ${brandName || 'New Client'} — ${productName || 'Video Order'}`,
      description: description,
      status: 'open',
      priority: 2, // High priority
      tags: ['video-order', 'reimagined-lab'],
      custom_fields: []
    };

    const clickupRes = await axios.post(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
      taskData,
      {
        headers: {
          'Authorization': CLICKUP_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ ClickUp task created: ${clickupRes.data.id} for ${brandName}`);

    res.json({
      success: true,
      message: 'Order submitted successfully',
      taskId: clickupRes.data.id,
      taskUrl: clickupRes.data.url
    });

  } catch (error) {
    console.error('❌ Error submitting order:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit order. Please try again.',
      error: error.response?.data || error.message
    });
  }
});

// Get order status (future use)
app.get('/api/order/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const clickupRes = await axios.get(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      {
        headers: { 'Authorization': CLICKUP_TOKEN }
      }
    );
    res.json({
      success: true,
      task: clickupRes.data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch order status' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Reimagined Lab backend running on port ${PORT}`);
});
