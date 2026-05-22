const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase
  .from('notes')
  .select('count(*)', { count: 'exact', head: true })
  .then(() => {
    console.log('Supabase: ✓ Connected');
  })
  .catch((err) => {
    console.error('Supabase: ✗ Connection failed', err.message);
  });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const userId = `user_${Date.now()}`;
    const { data, error } = await supabase
      .from('users')
      .insert([{ id: userId }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ userId, icloudAvailable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) return res.status(400).json({ error: error.message });

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

app.post('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    const { title = 'Untitled', content = '' } = req.body;

    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select();

      if (error) return res.status(400).json({ error: error.message });
      return res.json(data[0]);
    } else {
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

      if (error) return res.status(400).json({ error: error.message });
      return res.json(data[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/icloud/status/:userId', (req, res) => {
  res.json({
    status: 'unavailable',
    message: 'iCloud sync only available on macOS',
  });
});

app.post('/api/icloud/sync/:userId', (req, res) => {
  res.json({
    status: 'unavailable',
    message: 'iCloud sync only available on macOS',
  });
});

app.get('/api/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) return res.status(400).json({ error: error.message });

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

app.listen(PORT, () => {
  console.log(`Notes API running on port ${PORT}`);
});
