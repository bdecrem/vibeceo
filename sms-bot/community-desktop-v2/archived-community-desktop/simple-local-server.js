#!/usr/bin/env node

/**
 * Simple Local Server for Community Desktop
 * This provides the minimal infrastructure needed to make everything work locally
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '../.env.local' });

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Enable CORS for local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Serve the desktop at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'desktop.html'));
});

// Serve the submission form
app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'community-desktop-submit.html'));
});

// ZAD API endpoints
app.post('/api/zad/save', async (req, res) => {
  try {
    const { app_id, action_type, content_data } = req.body;
    
    console.log('📝 Received submission:', content_data.appName);
    
    const { data, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: app_id || 'community-desktop-apps',
        action_type: action_type || 'desktop_app',
        content_data: {
          ...content_data,
          status: 'new',
          timestamp: new Date().toISOString()
        }
      });
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Saved to database!' });
    console.log('✅ Saved to database');
    
  } catch (error) {
    console.error('❌ Error saving:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/zad/load', async (req, res) => {
  try {
    const { app_id, action_type } = req.body;
    
    const { data, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', app_id || 'community-desktop-apps')
      .eq('action_type', action_type || 'desktop_app');
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      data: data.map(record => record.content_data) 
    });
    
  } catch (error) {
    console.error('❌ Error loading:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = 3033;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 COMMUNITY DESKTOP LOCAL SERVER');
  console.log('='.repeat(60));
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log('\n📍 URLs:');
  console.log(`   Desktop:    http://localhost:${PORT}/`);
  console.log(`   Submit:     http://localhost:${PORT}/submit`);
  console.log('\n📝 Instructions:');
  console.log('1. Visit the submit page and add an app');
  console.log('2. In another terminal: node community-desktop/monitor.js');
  console.log('3. Refresh the desktop to see your app!');
  console.log('\n⚠️  Keep this server running!');
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(60));
});