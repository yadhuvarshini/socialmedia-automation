# MongoDB Atlas Connection Troubleshooting

If you've added `0.0.0.0/0` to Network Access but still get connection errors, check the following:

## 1. Connection String Format

Your `MONGO_URI` must use the **SRV format** for Atlas:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

- Replace `<username>` with your database user (not your Atlas login email)
- Replace `<password>` with your database password
- Replace `<cluster>` with your cluster hostname (e.g. `cluster0.xxxxx`)
- Replace `<database>` with your db name (e.g. `blazly`)

## 2. Password Special Characters

If your password contains special characters (`@`, `#`, `$`, `%`, etc.), **URL-encode** them:

| Character | Encoded |
|-----------|---------|
| @         | %40     |
| #         | %23     |
| $         | %24     |
| %         | %25     |
| &         | %26     |
| +         | %2B     |
| /         | %2F     |
| :         | %3A     |
| =         | %3D     |
| ?         | %3F     |

Or change your database user password to one without special characters.

## 3. Database User Permissions

- Go to Atlas → Database Access → Your user
- Ensure the user has **Read and write to any database** (or at least to your target database)
- If you created the user after adding 0.0.0.0/0, wait 1–2 minutes for propagation

## 4. Verify Network Access

- Atlas → Network Access → Add IP Address
- Use `0.0.0.0/0` to allow all (development only; restrict in production)
- Click **Confirm**
- Wait 1–2 minutes

## 5. .env Setup

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/blazly?retryWrites=true&w=majority
```

Get the full connection string from Atlas: **Connect** → **Connect your application** → copy the string and replace the password.

## 6. Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `MongoServerSelectionError` | Wrong IP whitelist or connection string | Verify 0.0.0.0/0 and connection string |
| `Authentication failed` | Wrong username/password | Double-check credentials and encoding |
| `getaddrinfo ENOTFOUND` | Invalid cluster hostname | Use the hostname from Atlas Connect dialog |
| `connection closed` | TLS/SSL or timeout | Add `?retryWrites=true&w=majority` to the URI |

## 7. Test Locally

```bash
cd backend
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blazly')
  .then(() => console.log('OK'))
  .catch(e => console.error('ERROR:', e.message));
"
```

If using Atlas, ensure `MONGO_URI` is set (via `.env` or `export MONGO_URI=...`).
