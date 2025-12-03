import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView
} from 'react-native';
import AudioManager from '../AudioManager';

const ChordPlayerWidget = () => {
  const [selectedChord, setSelectedChord] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progression, setProgression] = useState([]);
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const chordTypes = [
    { name: 'Major', intervals: [0, 4, 7], color: '#ff6b6b' },
    { name: 'Minor', intervals: [0, 3, 7], color: '#4ecdc4' },
    { name: 'Dim', intervals: [0, 3, 6], color: '#45b7d1' },
    { name: 'Aug', intervals: [0, 4, 8], color: '#96ceb4' },
    { name: '7th', intervals: [0, 4, 7, 10], color: '#ffeaa7' },
    { name: 'Maj7', intervals: [0, 4, 7, 11], color: '#dda0dd' }
  ];

  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const popularProgressions = [
    { name: 'I-V-vi-IV (Pop)', chords: ['C Major', 'G Major', 'Am', 'F Major'] },
    { name: 'vi-IV-I-V (Hit Song)', chords: ['Am', 'F Major', 'C Major', 'G Major'] },
    { name: 'ii-V-I (Jazz)', chords: ['Dm', 'G 7th', 'C Maj7'] },
    { name: 'I-vi-IV-V (50s)', chords: ['C Major', 'Am', 'F Major', 'G Major'] }
  ];

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isPlaying, pulseAnimation]);

  const getChordNotes = (root, chordType) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(root);
    if (rootIndex === -1) return [];

    return chordType.intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return noteNames[noteIndex];
    });
  };

  const playChord = async (root, chordType) => {
    const chordName = `${root} ${chordType.name}`;
    setSelectedChord(chordName);
    setIsPlaying(true);

    try {
      const notes = getChordNotes(root, chordType);
      await AudioManager.playChord(notes, 4, 1.5);
    } catch (error) {
      console.error('Chord playback error:', error);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, 1500);
  };

  const playProgression = async (progChords) => {
    setIsPlaying(true);
    setProgression(progChords);

    for (let i = 0; i < progChords.length; i++) {
      const [root, ...typeWords] = progChords[i].split(' ');
      const typeName = typeWords.join(' ');
      
      // Find matching chord type
      let chordType = chordTypes.find(t => t.name === typeName);
      if (!chordType) {
        // Handle special cases
        if (typeName.endsWith('m') && typeName !== 'Dim') {
          chordType = chordTypes.find(t => t.name === 'Minor');
        } else {
          chordType = chordTypes[0]; // Default to Major
        }
      }

      setSelectedChord(progChords[i]);
      
      try {
        const notes = getChordNotes(root, chordType);
        await AudioManager.playChord(notes, 4, 1.2);
      } catch (error) {
        console.error('Progression chord error:', error);
      }
      
      // Wait between chords
      if (i < progChords.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    setIsPlaying(false);
    setProgression([]);
    setSelectedChord(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>🎸 Chord Player</Text>
      <Text style={styles.subtitle}>Explore beautiful chord progressions</Text>

      {/* Chord Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chord Types</Text>
        <View style={styles.chordTypesGrid}>
          {chordTypes.map(chordType => (
            <View key={chordType.name} style={styles.chordTypeRow}>
              <Text style={[styles.chordTypeLabel, { color: chordType.color }]}>
                {chordType.name}
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.rootNotesScroll}
              >
                {rootNotes.map(root => {
                  const chordName = `${root} ${chordType.name}`;
                  const isSelected = selectedChord === chordName;
                  
                  return (
                    <Animated.View
                      key={`${root}-${chordType.name}`}
                      style={[
                        isSelected && isPlaying && { transform: [{ scale: pulseAnimation }] }
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.chordButton,
                          { backgroundColor: chordType.color },
                          isSelected && styles.selectedChord
                        ]}
                        onPress={() => playChord(root, chordType)}
                        disabled={isPlaying}
                      >
                        <Text style={styles.chordButtonText}>{root}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>
      </View>

      {/* Popular Progressions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Progressions</Text>
        {popularProgressions.map((prog, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.progressionButton,
              progression.length > 0 && styles.progressionPlaying
            ]}
            onPress={() => playProgression(prog.chords)}
            disabled={isPlaying}
          >
            <Text style={styles.progressionName}>{prog.name}</Text>
            <Text style={styles.progressionChords}>
              {prog.chords.join(' → ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {selectedChord 
            ? `Playing: ${selectedChord}`
            : progression.length > 0
            ? `Progression: ${progression.join(' → ')}`
            : 'Select a chord or progression'
          }
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  chordTypesGrid: {
    // Grid layout for chord types
  },
  chordTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chordTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
    marginRight: 15,
  },
  rootNotesScroll: {
    flex: 1,
  },
  chordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedChord: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  chordButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressionButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderWidth: 1,
    borderColor: '#6c5ce7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  progressionPlaying: {
    backgroundColor: 'rgba(108, 92, 231, 0.4)',
    borderColor: '#a29bfe',
  },
  progressionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressionChords: {
    color: '#bbb',
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 15,
    marginTop: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ChordPlayerWidget;