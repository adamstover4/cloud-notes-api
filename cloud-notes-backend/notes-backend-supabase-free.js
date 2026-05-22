const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing Supabase credentials!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test Supabase connection
let supabaseConnected = false;
supabase
  .from('notes')
  .select('count(*)', { count: 'exact', head: true })
  .then(() => {
    supabaseConnected = true;
    console.log('Supabase: ✓ Connected');
  })
  .catch((err) => {
    console.error('Supabase: ✗ Connection failed', err.message);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const userId = `user_${Date.now()}`;
    const { data, error } = await supabase
      .from('users')
      .insert([{ id: userId }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ userId, icloudAvailable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all notes for a user
app.get('/api/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Convert array to object keyed by ID
    const notesObj = {};
    data.forEach((note) => {
      notesObj[note.id] = {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      };
    });

    res.json(notesObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update a note
app.post('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    const { title = 'Untitled', content = '' } = req.body;

    // Check if note exists
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .single();

    if (existing) {
      // Update existing note
      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data[0]);
    } else {
      // Insert new note
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            id: noteId,
            user_id: userId,
            title,
            content,
          },
        ])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a note
app.delete('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// iCloud status (always returns unavailable on Render)
app.get('/api/icloud/status/:userId', (req, res) => {
  res.json({
    status: 'unavailable',
    message: 'iCloud sync only available on macOS',
    path: null,
    size: 0,
    lastModified: null,
  });
});

// iCloud sync (no-op on Render)
app.post('/api/icloud/sync/:userId', (req, res) => {
  res.json({
    status: 'unavailable',
    message: 'iCloud sync only available on macOS',
  });
});

// Export notes as JSON
app.get('/api/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="notes-${userId}.json"`);
    res.json({
      userId,
      notes: data.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      })),
      exportDate: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Notes API running on port ${PORT}`);
});
