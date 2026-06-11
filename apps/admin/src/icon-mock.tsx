import React from 'react';
import { Text } from 'react-native';

const IconMock = ({ name, size, color, style }: any) => {
  // On affiche un simple caractère ou rien pour éviter le crash
  return <Text style={[{ fontSize: size, color: color }, style]}>•</Text>;
};

export default IconMock;
