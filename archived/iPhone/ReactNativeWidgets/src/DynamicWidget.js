import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView
} from 'react-native';
import AudioManager from './AudioManager';
import MusicWidget from './widgets/MusicWidget';
import PianoWidget from './widgets/PianoWidget';
import ChordPlayerWidget from './widgets/ChordPlayerWidget';
import ColorMixerWidget from './widgets/ColorMixerWidget';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DynamicWidget = ({ widgetCode, widgetType, ...props }) => {
  const [error, setError] = useState(null);
  const [widget, setWidget] = useState(null);

  useEffect(() => {
    try {
      if (widgetCode) {
        // Parse and render dynamic JSX code from LLM
        const parsedWidget = parseJSXWidget(widgetCode);
        setWidget(parsedWidget);
      } else {
        // Default to a demo widget based on type
        setWidget(getDefaultWidget(widgetType || 'music'));
      }
    } catch (err) {
      console.error('Widget parsing error:', err);
      setError(err.message);
    }
  }, [widgetCode, widgetType]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Widget Error</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setWidget(getDefaultWidget('music'));
            }}
          >
            <Text style={styles.retryText}>Load Demo Widget</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {widget || <MusicWidget />}
    </SafeAreaView>
  );
};

const parseJSXWidget = (jsxCode) => {
  // Simple JSX parser - in production this would use a proper JSX transformer
  // For now, we'll return predefined widgets based on content analysis
  
  if (jsxCode.includes('piano') || jsxCode.includes('Piano')) {
    return <PianoWidget />;
  } else if (jsxCode.includes('chord') || jsxCode.includes('Chord')) {
    return <ChordPlayerWidget />;
  } else if (jsxCode.includes('color') || jsxCode.includes('Color')) {
    return <ColorMixerWidget />;
  } else {
    return <MusicWidget />;
  }
};

const getDefaultWidget = (type) => {
  switch (type) {
    case 'piano':
      return <PianoWidget />;
    case 'chord':
      return <ChordPlayerWidget />;
    case 'color':
      return <ColorMixerWidget />;
    case 'music':
    default:
      return <MusicWidget />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    width: screenWidth,
    height: screenHeight * 0.6, // 3:2 aspect ratio constraint
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default DynamicWidget;