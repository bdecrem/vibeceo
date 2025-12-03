import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import AudioManager from '../AudioManager';

const { width: screenWidth } = Dimensions.get('window');

const PianoWidget = () => {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const keyAnimations = useRef({});

  // Create white and black keys
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackKeys = [
    { note: 'C#', position: 0.5 },
    { note: 'D#', position: 1.5 },
    { note: 'F#', position: 3.5 },
    { note: 'G#', position: 4.5 },
    { note: 'A#', position: 5.5 }
  ];

  const initKeyAnimation = (key) => {
    if (!keyAnimations.current[key]) {
      keyAnimations.current[key] = new Animated.Value(1);
    }
    return keyAnimations.current[key];
  };

  const playKey = async (note) => {
    const animValue = initKeyAnimation(note);
    
    // Visual feedback
    setPressedKeys(prev => new Set(prev).add(note));
    
    // Animation
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();

    // Play sound
    try {
      await AudioManager.playNote(note, 4, 0.6);
    } catch (error) {
      console.error('Piano key error:', error);
    }

    // Remove pressed state
    setTimeout(() => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }, 200);
  };

  const playChord = async (chordType) => {
    const chords = {
      'C Major': ['C', 'E', 'G'],
      'F Major': ['F', 'A', 'C'],
      'G Major': ['G', 'B', 'D'],
      'Am': ['A', 'C', 'E']
    };

    const chord = chords[chordType];
    if (!chord) return;

    // Visual feedback for all keys in chord
    chord.forEach(note => {
      setPressedKeys(prev => new Set(prev).add(note));
    });

    try {
      await AudioManager.playChord(chord, 4, 1.5);
    } catch (error) {
      console.error('Chord error:', error);
    }

    // Remove pressed states
    setTimeout(() => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        chord.forEach(note => newSet.delete(note));
        return newSet;
      });
    }, 300);
  };

  const keyWidth = (screenWidth - 40) / 7;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎹 Piano Widget</Text>
      <Text style={styles.subtitle}>Play beautiful piano sounds</Text>

      {/* Piano Keys Container */}
      <View style={styles.pianoContainer}>
        {/* White Keys */}
        <View style={styles.whiteKeysContainer}>
          {whiteKeys.map((note, index) => {
            const isPressed = pressedKeys.has(note);
            const animValue = initKeyAnimation(note);
            
            return (
              <Animated.View
                key={note}
                style={[
                  styles.whiteKey,
                  { width: keyWidth, transform: [{ scale: animValue }] },
                  isPressed && styles.whiteKeyPressed
                ]}
              >
                <TouchableOpacity
                  style={styles.keyTouchable}
                  onPress={() => playKey(note)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.whiteKeyText, isPressed && styles.whiteKeyTextPressed]}>
                    {note}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Black Keys */}
        <View style={styles.blackKeysContainer}>
          {blackKeys.map(({ note, position }) => {
            const isPressed = pressedKeys.has(note);
            const animValue = initKeyAnimation(note);
            
            return (
              <Animated.View
                key={note}
                style={[
                  styles.blackKey,
                  { 
                    left: position * keyWidth,
                    transform: [{ scale: animValue }]
                  },
                  isPressed && styles.blackKeyPressed
                ]}
              >
                <TouchableOpacity
                  style={styles.keyTouchable}
                  onPress={() => playKey(note)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.blackKeyText}>{note}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Chord Buttons */}
      <View style={styles.chordsContainer}>
        <Text style={styles.chordsTitle}>Quick Chords:</Text>
        <View style={styles.chordButtons}>
          {['C Major', 'F Major', 'G Major', 'Am'].map(chord => (
            <TouchableOpacity
              key={chord}
              style={styles.chordButton}
              onPress={() => playChord(chord)}
            >
              <Text style={styles.chordButtonText}>{chord}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
  },
  pianoContainer: {
    position: 'relative',
    height: 120,
    marginBottom: 30,
  },
  whiteKeysContainer: {
    flexDirection: 'row',
    height: 120,
  },
  whiteKey: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginHorizontal: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  whiteKeyPressed: {
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  blackKeysContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  blackKey: {
    position: 'absolute',
    width: 30,
    height: 80,
    backgroundColor: '#2c2c54',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  blackKeyPressed: {
    backgroundColor: '#1a1a40',
  },
  keyTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  whiteKeyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  whiteKeyTextPressed: {
    color: '#333',
  },
  blackKeyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  chordsContainer: {
    alignItems: 'center',
  },
  chordsTitle: {
    fontSize: 16,
    color: '#eee',
    marginBottom: 12,
    fontWeight: '600',
  },
  chordButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chordButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  chordButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PianoWidget;