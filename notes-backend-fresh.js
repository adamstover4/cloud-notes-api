const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { error } = await supabase.from('users').insert([{ id: userId }]);
    if (error) throw error;
    res.json({ userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all notebooks for user
app.get('/api/notebooks/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create notebook
app.post('/api/notebooks/:userId', async (req, res) => {
  try {
    const { name } = req.body;
    const notebookId = `nb_${Date.now()}`;
    const { data, error } = await supabase
      .from('notebooks')
      .insert([{ 
        id: notebookId, 
        user_id: req.params.userId, 
        name 
      }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pages in notebook
app.get('/api/notebooks/:notebookId/pages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('notebook_id', req.params.notebookId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create page
app.post('/api/notebooks/:notebookId/pages', async (req, res) => {
  try {
    const { userId } = req.body;
    const pageId = `pg_${Date.now()}`;
    const { data, error } = await supabase
      .from('pages')
      .insert([{
        id: pageId,
        notebook_id: req.params.notebookId,
        user_id: userId,
        title: 'Untitled',
        content: ''
      }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update page
app.post('/api/pages/:pageId', async (req, res) => {
  try {
    const { title, content } = req.body;
    const { data, error } = await supabase
      .from('pages')
      .update({ 
        title, 
        content, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.params.pageId)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete page
app.delete('/api/pages/:pageId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', req.params.pageId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cloud Notes API running on port ${PORT}`);
});
