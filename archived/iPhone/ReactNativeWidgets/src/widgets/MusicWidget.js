import React, { useState, useRef, useEffect } from 'react';
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

const MusicWidget = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const colorAnimation = useRef(new Animated.Value(0)).current;

  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];

  useEffect(() => {
    if (isPlaying) {
      // Create pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Color cycling animation
      Animated.loop(
        Animated.timing(colorAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      pulseAnimation.setValue(1);
      colorAnimation.setValue(0);
    }
  }, [isPlaying, pulseAnimation, colorAnimation]);

  const playNote = async (note, index) => {
    setCurrentNote(note);
    setIsPlaying(true);
    
    try {
      await AudioManager.playNote(note, 4, 0.8);
    } catch (error) {
      console.error('Error playing note:', error);
    }
    
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentNote(null);
    }, 800);
  };

  const playRandomMelody = async () => {
    setIsPlaying(true);
    
    // Play a beautiful random melody
    const melody = [];
    for (let i = 0; i < 8; i++) {
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      melody.push(randomNote);
    }
    
    for (let i = 0; i < melody.length; i++) {
      setCurrentNote(melody[i]);
      await AudioManager.playNote(melody[i], 4 + Math.floor(i / 4), 0.4);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsPlaying(false);
    setCurrentNote(null);
  };

  const backgroundColorInterpolation = colorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,107,107,0.1)', 'rgba(78,205,196,0.1)'],
  });

  return (
    <View style={[styles.container, { backgroundColor: isPlaying ? backgroundColorInterpolation : '#f8f9fa' }]}>
      <Text style={styles.title}>🎵 Musical Widget</Text>
      <Text style={styles.subtitle}>Tap notes to create beautiful sounds</Text>
      
      <View style={styles.notesContainer}>
        {notes.map((note, index) => {
          const isActive = currentNote === note;
          return (
            <Animated.View
              key={note}
              style={[
                isActive && { transform: [{ scale: pulseAnimation }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.noteButton,
                  { backgroundColor: colors[index] },
                  isActive && styles.activeNote
                ]}
                onPress={() => playNote(note, index)}
                activeOpacity={0.8}
              >
                <Text style={styles.noteText}>{note}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.melodyButton, isPlaying && styles.playingButton]}
        onPress={playRandomMelody}
        disabled={isPlaying}
      >
        <Text style={styles.melodyText}>
          {isPlaying ? '🎶 Playing...' : '✨ Play Random Melody'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {currentNote ? `Playing: ${currentNote}` : 'Ready to make music!'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  notesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 30,
  },
  noteButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeNote: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  noteText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  melodyButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playingButton: {
    backgroundColor: '#a29bfe',
  },
  melodyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
  },
});

export default MusicWidget;