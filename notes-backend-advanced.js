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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await supabase.from('users').insert([{ id: userId }]);
    res.json({ userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notebooks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notebooks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;
    const notebookId = `nb_${Date.now()}`;
    const { data, error } = await supabase
      .from('notebooks')
      .insert([{ id: notebookId, user_id: userId, name }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notebooks/:userId/:notebookId', async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { error } = await supabase.from('notebooks').delete().eq('id', notebookId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notebooks/:notebookId/pages', async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('updated_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notebooks/:notebookId/pages', async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { userId } = req.body;
    const pageId = `pg_${Date.now()}`;
    const { data, error } = await supabase
      .from('pages')
      .insert([{ id: pageId, notebook_id: notebookId, user_id: userId, title: 'Untitled', content: '' }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { title, content } = req.body;
    const { data, error } = await supabase
      .from('pages')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', pageId)
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { error } = await supabase.from('pages').delete().eq('id', pageId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = req.query;
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Notes API running on port ${PORT}`);
});
