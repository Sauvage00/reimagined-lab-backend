# Reimagined Lab — Backend

Node.js backend that connects the Reimagined Lab brief form to ClickUp.

## How it works
1. Client fills the brief form on the frontend
2. Frontend sends order data to this backend (`POST /api/submit-order`)
3. Backend creates a ClickUp task with all order details
4. You get notified in ClickUp instantly

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Then open `.env` and add:
- `CLICKUP_TOKEN` — your ClickUp API token (Settings → API)
- `CLICKUP_LIST_ID` — the ID of the ClickUp list where orders should land

### 3. Run locally
```bash
npm start
```

### 4. Deploy to Railway
1. Push this folder to GitHub
2. Connect repo to Railway
3. Add environment variables in Railway dashboard
4. Railway auto-deploys on every push

## API Endpoints

### POST /api/submit-order
Submits an order and creates a ClickUp task.

### GET /api/order/:taskId
Fetches status of an existing order.

## Adding Paystack (later)
When ready to take payments, add your Paystack keys to `.env` and uncomment the payment routes.
