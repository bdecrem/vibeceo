// Dictionary word validation API
// Checks if a word exists in the WebtoysOS Dictionary

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cache the dictionary in memory for performance
let dictionaryCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000; // 1 hour

async function loadDictionary() {
  const now = Date.now();
  
  // Return cached dictionary if still valid
  if (dictionaryCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return dictionaryCache;
  }
  
  try {
    // Fetch the dictionary HTML from Supabase
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('app_slug', 'toybox-dictionary')
      .eq('user_slug', 'public')
      .single();
    
    if (error || !data) {
      console.error('Failed to load dictionary:', error);
      return null;
    }
    
    // Extract the word array from the HTML
    const match = data.html_content.match(/window\.WEBTOYS_DICTIONARY\s*=\s*(\[[\s\S]*?\])/);
    if (!match) {
      console.error('Could not find WEBTOYS_DICTIONARY in content');
      return null;
    }
    
    // Parse and cache the dictionary
    const words = JSON.parse(match[1]);
    dictionaryCache = new Set(words.map(w => w.toUpperCase()));
    cacheTimestamp = now;
    
    console.log(`Dictionary loaded: ${dictionaryCache.size} words`);
    return dictionaryCache;
  } catch (error) {
    console.error('Error loading dictionary:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Enable CORS for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Get word from query or body
  const word = (req.query.word || req.body?.word || '').toUpperCase().trim();
  
  if (!word) {
    return res.status(400).json({ 
      error: 'Word parameter required',
      valid: false 
    });
  }
  
  // Load dictionary
  const dictionary = await loadDictionary();
  
  if (!dictionary) {
    // If dictionary fails to load, accept common words as fallback
    const fallbackWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 
      'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'COW', 'LOW', 'ROW', 'BOW', 'HOW', 'NOW']);
    
    return res.status(200).json({
      word: word,
      valid: fallbackWords.has(word),
      source: 'fallback',
      message: 'Dictionary unavailable, using limited word list'
    });
  }
  
  // Check if word exists in dictionary
  const isValid = dictionary.has(word);
  
  return res.status(200).json({
    word: word,
    valid: isValid,
    source: 'webtoys-dictionary',
    dictionarySize: dictionary.size
  });
}