import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanGesturer
} from 'react-native';
import AudioManager from '../AudioManager';

const ColorMixerWidget = () => {
  const [selectedColor, setSelectedColor] = useState('#ff6b6b');
  const [mixedColors, setMixedColors] = useState([]);
  const colorAnimation = useRef(new Animated.Value(0)).current;

  const baseColors = [
    { name: 'Red', color: '#ff6b6b', note: 'C' },
    { name: 'Orange', color: '#ff8e53', note: 'D' },
    { name: 'Yellow', color: '#ffeaa7', note: 'E' },
    { name: 'Green', color: '#00d2d3', note: 'F' },
    { name: 'Blue', color: '#0984e3', note: 'G' },
    { name: 'Purple', color: '#a29bfe', note: 'A' },
    { name: 'Pink', color: '#fd79a8', note: 'B' }
  ];

  const selectColor = (colorObj) => {
    setSelectedColor(colorObj.color);
    
    // Play corresponding note
    AudioManager.playNote(colorObj.note, 4, 0.5);
    
    // Color selection animation
    Animated.sequence([
      Animated.timing(colorAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const mixColors = (color1, color2) => {
    // Simple color mixing algorithm
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const rMix = Math.round((r1 + r2) / 2);
    const gMix = Math.round((g1 + g2) / 2);
    const bMix = Math.round((b1 + b2) / 2);
    
    return `#${rMix.toString(16).padStart(2, '0')}${gMix.toString(16).padStart(2, '0')}${bMix.toString(16).padStart(2, '0')}`;
  };

  const addToMix = (colorObj) => {
    if (mixedColors.length < 6) {
      const newMix = [...mixedColors, colorObj];
      setMixedColors(newMix);
      
      // Play ascending notes for mixing
      AudioManager.playNote(colorObj.note, 4 + Math.floor(newMix.length / 2), 0.3);
    }
  };

  const playColorChord = async () => {
    if (mixedColors.length === 0) return;
    
    const notes = mixedColors.map(c => c.note);
    await AudioManager.playChord(notes, 4, 2.0);
  };

  const clearMix = () => {
    setMixedColors([]);
    AudioManager.playNote('C', 2, 0.3); // Low note for clear
  };

  const getFinalMixedColor = () => {
    if (mixedColors.length === 0) return '#ffffff';
    if (mixedColors.length === 1) return mixedColors[0].color;
    
    let result = mixedColors[0].color;
    for (let i = 1; i < mixedColors.length; i++) {
      result = mixColors(result, mixedColors[i].color);
    }
    return result;
  };

  const backgroundInterpolation = colorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.1)', selectedColor + '30'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: backgroundInterpolation }]}>
      <Text style={styles.title}>🎨 Color Music Mixer</Text>
      <Text style={styles.subtitle}>Mix colors and create harmonious sounds</Text>

      {/* Color Palette */}
      <View style={styles.paletteContainer}>
        <Text style={styles.sectionTitle}>Color Palette</Text>
        <View style={styles.colorGrid}>
          {baseColors.map((colorObj, index) => (
            <TouchableOpacity
              key={colorObj.name}
              style={[
                styles.colorButton,
                { backgroundColor: colorObj.color },
                selectedColor === colorObj.color && styles.selectedColorButton
              ]}
              onPress={() => selectColor(colorObj)}
              onLongPress={() => addToMix(colorObj)}
            >
              <Text style={styles.colorNote}>{colorObj.note}</Text>
              <Text style={styles.colorName}>{colorObj.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.instructionText}>Tap to select • Long press to add to mix</Text>
      </View>

      {/* Color Mix */}
      <View style={styles.mixContainer}>
        <Text style={styles.sectionTitle}>Your Mix ({mixedColors.length}/6)</Text>
        <View style={styles.mixPreview}>
          <View 
            style={[
              styles.mixedColorPreview,
              { backgroundColor: getFinalMixedColor() }
            ]}
          >
            <Text style={styles.mixedColorText}>
              {mixedColors.length === 0 ? 'Empty' : 'Mixed Color'}
            </Text>
          </View>
        </View>
        
        <View style={styles.mixedColorsRow}>
          {mixedColors.map((colorObj, index) => (
            <View
              key={index}
              style={[
                styles.mixedColorDot,
                { backgroundColor: colorObj.color }
              ]}
            >
              <Text style={styles.mixedColorNote}>{colorObj.note}</Text>
            </View>
          ))}
          {/* Empty slots */}
          {Array.from({ length: 6 - mixedColors.length }, (_, i) => (
            <View key={`empty-${i}`} style={styles.emptyColorDot} />
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.playButton,
            mixedColors.length === 0 && styles.disabledButton
          ]}
          onPress={playColorChord}
          disabled={mixedColors.length === 0}
        >
          <Text style={styles.actionButtonText}>
            🎵 Play Color Chord
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.clearButton,
            mixedColors.length === 0 && styles.disabledButton
          ]}
          onPress={clearMix}
          disabled={mixedColors.length === 0}
        >
          <Text style={styles.actionButtonText}>
            🗑️ Clear Mix
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Selected: {baseColors.find(c => c.color === selectedColor)?.name || 'None'}
        </Text>
        <Text style={styles.infoText}>
          Mixed Notes: {mixedColors.map(c => c.note).join(', ') || 'None'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  paletteContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedColorButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  colorNote: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  colorName: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  instructionText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mixContainer: {
    marginBottom: 20,
  },
  mixPreview: {
    alignItems: 'center',
    marginBottom: 15,
  },
  mixedColorPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mixedColorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mixedColorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  mixedColorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedColorNote: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  emptyColorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderStyle: 'dashed',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#6c5ce7',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 2,
  },
});

export default ColorMixerWidget;