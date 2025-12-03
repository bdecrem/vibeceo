import React from 'react';
import { AppRegistry } from 'react-native';
import DynamicWidget from './src/DynamicWidget';

const WebtoysWidget = (props) => {
  return <DynamicWidget {...props} />;
};

AppRegistry.registerComponent('WebtoysWidget', () => WebtoysWidget);

export default WebtoysWidget;