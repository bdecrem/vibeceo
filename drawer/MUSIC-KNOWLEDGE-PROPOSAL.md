# Amber Music Knowledge Base — Proposal

## Goal

Build a persistent music encyclopedia so Amber can:
1. Understand artists and genres you like in detail
2. Make tracks "in the style of X" with actual knowledge
3. Create mashups by combining known profiles
4. Develop taste over time through accumulated knowledge

## Two Approaches Compared

### Approach 1: Audio Fingerprinting (Premium)

**How it works:**
- Use [Cyanite API](https://cyanite.ai) or [Mureka](https://mureka.ai) to analyze actual audio
- Feed YouTube links, get back: tempo, energy, mood, instrumentation, similar tracks
- Store rich audio fingerprints

**Pros:**
- Objective, measurable data
- Catches sonic nuances text can't describe
- Can analyze any track, not just described ones

**Cons:**
- Cyanite: €290/month
- Adds API dependency
- Still need text for context (scene, influences, era)

### Approach 2: Text Research + Spotify (Recommended)

**How it works:**
- Web search for artist reviews, interviews, scene coverage
- Use free Spotify API for audio features (tempo, energy, danceability, valence)
- Build rich genre taxonomy manually
- You correct/enhance profiles over time

**Pros:**
- Free (Spotify API has generous free tier)
- Captures context audio can't (scene, era, influences, labels)
- Your corrections make it better than pure automation
- Works immediately with existing tools

**Cons:**
- Requires Spotify presence for audio features
- More manual effort
- May miss sonic details

**Recommendation:** Start with Approach 2. Add audio analysis later if needed.

---

## Data Model

### Artist Profile

```json
{
  "type": "music_artist",
  "content": "Johannes Brecht",
  "metadata": {
    "id": "johannes-brecht",

    "audio_profile": {
      "tempo_range": [120, 128],
      "energy": 0.7,
      "danceability": 0.8,
      "valence": 0.4,
      "acousticness": 0.1
    },

    "genres": ["techno", "house"],
    "subgenres": ["melodic techno", "deep house"],

    "signature_sounds": [
      "rolling basslines",
      "ethereal pads",
      "sparse percussion",
      "gradual builds"
    ],

    "mood_tags": ["hypnotic", "warm", "driving", "nocturnal"],

    "influences": ["tale-of-us", "mind-against"],
    "similar_to": ["stephan-bodzin", "recondite"],

    "scene": "Berlin",
    "era": "2010s-present",
    "labels": ["Katermukke", "Einmusika"],

    "production_notes": "Known for long, hypnotic builds with minimal percussion. Uses lots of reverb on synths. Tracks often have a melancholic undertone despite being danceable. Favors minor keys.",

    "example_tracks": [
      {"name": "Frau Holda", "url": "spotify:track:xxx"},
      {"name": "Parachute", "url": "spotify:track:xxx"}
    ],

    "source": "research+spotify",
    "added_at": "2026-01-06",
    "updated_at": "2026-01-06"
  }
}
```

### Genre Definition

```json
{
  "type": "music_genre",
  "content": "Melodic Techno",
  "metadata": {
    "id": "melodic-techno",
    "parent": "techno",

    "tempo_range": [118, 130],
    "energy_range": [0.6, 0.8],

    "characteristics": [
      "four-on-the-floor kick",
      "prominent melodic elements (synths, arpeggios)",
      "long builds and breakdowns",
      "emotional/atmospheric quality",
      "less aggressive than peak-time techno"
    ],

    "typical_instruments": [
      "analog-style synths",
      "pad layers",
      "subtle percussion",
      "processed vocals (occasional)"
    ],

    "mood_profile": ["hypnotic", "emotional", "driving", "nocturnal"],

    "example_artists": ["tale-of-us", "stephan-bodzin", "mind-against", "johannes-brecht"],
    "related_genres": ["progressive-house", "deep-techno", "trance"],

    "scene_notes": "Emerged from Berlin/Ibiza crossover. Afterlife label was pivotal. Peak popularity 2015-2020 but still influential.",

    "production_tips": "Use long reverb tails. Build tension with filter sweeps. Melodic elements should be memorable but not cheesy. Kick should be present but not dominating."
  }
}
```

### Your Preferences

```json
{
  "type": "music_preference",
  "content": "Bart's Music Taste Profile",
  "metadata": {
    "preferred_genres": ["melodic-techno", "minimal-techno", "deep-house"],
    "preferred_tempo_range": [118, 135],
    "preferred_energy_range": [0.5, 0.8],

    "loves": [
      "hypnotic, repetitive patterns",
      "gradual evolution over long tracks",
      "Berlin/underground aesthetic",
      "dark but not aggressive"
    ],

    "dislikes": [
      "cheesy melodies",
      "big room drops",
      "overproduced EDM",
      "vocal-heavy tracks"
    ],

    "favorite_artists": ["johannes-brecht", "..."],
    "reference_labels": ["Kompakt", "Innervisions", "Afterlife"],

    "mashup_experiments": [
      {
        "combination": ["melodic-techno", "ambient"],
        "result": "Worked well - floating pads over minimal kick",
        "example": "DRIFT track"
      }
    ]
  }
}
```

---

## Commands

### Adding Knowledge

**"add artist: [name]"**
1. I research via web search
2. Pull Spotify audio features if available
3. Store structured profile
4. Show you what I learned, ask for corrections

**"add genre: [name]"**
1. I research characteristics
2. Link to parent genres
3. Store definition
4. You can refine

**"I like [artist/genre] because [reason]"**
1. Updates preference profile
2. Adds to "loves" or adjusts weights

### Querying Knowledge

**"what do you know about [artist/genre]?"**
- Returns stored profile

**"artists like [artist]"**
- Queries similar_to relationships + genre matches

**"compare [artist A] vs [artist B]"**
- Side-by-side profile comparison

### Using Knowledge

**"make a track like [artist]"**
- Pulls profile, uses audio_profile and production_notes to guide generation

**"mashup: [artist A] + [artist B]"**
- Combines profiles, identifies compatible elements, suggests approach

**"something new in [genre] style"**
- Uses genre definition + your preferences to guide generation

---

## Implementation Plan

### Phase 1: Foundation (This Session)
- [ ] Create Supabase schema (just use amber_state with types)
- [ ] Build `add_artist` workflow
- [ ] Build `add_genre` workflow
- [ ] Seed with 2-3 artists you name

### Phase 2: Spotify Integration (Next Session)
- [ ] Add Spotify API client
- [ ] Auto-fetch audio features when adding artists
- [ ] Pull related artists from Spotify

### Phase 3: Generation Integration (When Ready)
- [ ] Connect to track generation (909, etc.)
- [ ] Use profiles to set BPM, energy, structure
- [ ] Log what worked for future reference

### Phase 4: Premium Audio (Optional Future)
- [ ] Evaluate Cyanite/Mureka if text approach hits limits
- [ ] Add YouTube link analysis
- [ ] Richer sonic fingerprints

---

## Example Session

```
You: add artist: Johannes Brecht

Amber: Researching Johannes Brecht...

Found:
- German DJ/producer based in Berlin
- Labels: Katermukke, Einmusika, Stil Vor Talent
- Style: Melodic techno / deep house crossover
- Known for: Long hypnotic builds, warm basslines, emotional pads

Spotify audio features (avg of top tracks):
- Tempo: 122 BPM (range: 118-126)
- Energy: 0.71
- Danceability: 0.78
- Valence: 0.38 (melancholic)

I'd tag him as:
- Genres: techno, house
- Subgenres: melodic techno, deep house
- Mood: hypnotic, warm, nocturnal, melancholic
- Similar to: Stephan Bodzin, Recondite, Âme

Does this look right? Anything to add or correct?

You: yes, also add that he often uses detuned synths

Amber: Added. Johannes Brecht profile saved with note about detuned synths.

---

You: make a track inspired by Johannes Brecht

Amber: Using Johannes Brecht profile:
- Target: 122 BPM
- Energy: 0.7 (driving but not aggressive)
- Mood: hypnotic, warm, melancholic
- Key elements: rolling bassline, detuned synths, ethereal pads, gradual build

[Generates track using these parameters]
```

---

## Questions for You

1. **Start with which artists?** Name 3-5 to seed the system.

2. **Genre depth?** Should I build out a full taxonomy of electronic genres, or just the ones relevant to artists you add?

3. **Spotify API?** Do you have credentials, or should I set up a new app?

4. **Storage location?** Supabase amber_state (recommended) or separate files?
