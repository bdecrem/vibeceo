#!/usr/bin/env node
/**
 * Set up recruiting subscription for Bart with the 13-candidate project
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Bart's subscriber ID
const BART_SUBSCRIBER_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

// Load the approved channels
const channelsFile = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/recruiting-channels/channels_20251114_142402.json';
const channelsData = JSON.parse(fs.readFileSync(channelsFile, 'utf8'));

// Take the top 4 channels that found the 13 candidates
const approvedChannels = channelsData.channels.slice(0, 4).map(ch => ({
  name: ch.name,
  channelType: ch.channelType,
  description: ch.description,
  searchQuery: ch.searchQuery,
  example: ch.example,
}));

const projectId = '5bec42d5-daee-4919-85ac-bf93c30e53d1';

const preferences = {
  activeProjectId: projectId,
  projects: {
    [projectId]: {
      query: 'CS student with AI projects and GitHub portfolio',
      refinedSpec: {
        specText: channelsData.query,
        createdAt: new Date().toISOString(),
      },
      approvedChannels,
      setupComplete: true,
      sourcesApproved: true,
      channelsApproved: true,
      notificationTime: '11:00',
      active: true,
      createdAt: new Date().toISOString(),
      durationDays: 7,
      startedAt: new Date().toISOString(),
      candidates: [],
      learnedProfile: {},
    },
  },
};

async function setupSubscription() {
  console.log('🎯 Setting up recruiting subscription for Bart...');
  console.log('');
  console.log('Project ID:', projectId);
  console.log('Approved Channels:', approvedChannels.length);
  console.log('');

  // Upsert the subscription
  const { data, error } = await supabase
    .from('agent_subscriptions')
    .upsert({
      subscriber_id: BART_SUBSCRIBER_ID,
      agent_slug: 'recruiting',
      active: true,
      preferences,
      subscribed_at: new Date().toISOString(),
    }, {
      onConflict: 'subscriber_id,agent_slug',
    })
    .select();

  if (error) {
    console.error('❌ Failed to create subscription:', error);
    process.exit(1);
  }

  console.log('✅ Recruiting subscription created successfully!');
  console.log('');
  console.log('Subscription ID:', data[0].id);
  console.log('');
  console.log('📋 Project Details:');
  console.log('  Query:', preferences.projects[projectId].query);
  console.log('  Duration:', preferences.projects[projectId].durationDays, 'days');
  console.log('  Notification Time:', preferences.projects[projectId].notificationTime, 'PT');
  console.log('  Active:', preferences.projects[projectId].active);
  console.log('');
  console.log('📡 Approved Channels:');
  approvedChannels.forEach((ch, i) => {
    console.log(`  ${i + 1}. ${ch.name} (${ch.channelType})`);
  });
  console.log('');
  console.log('🚀 You will receive daily candidate updates at 11:00am PT starting tomorrow!');
  console.log('   The scheduler will search these channels for new candidates every day.');
}

setupSubscription().catch(console.error);
