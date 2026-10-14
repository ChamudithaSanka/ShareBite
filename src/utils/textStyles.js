import { StyleSheet } from 'react-native';

export function scaleTextStyle(style, scale) {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = typeof flatStyle.fontSize === 'number' ? flatStyle.fontSize : 14;

  return {
    ...flatStyle,
    fontSize: fontSize * scale,
    ...(typeof flatStyle.lineHeight === 'number' ? { lineHeight: flatStyle.lineHeight * scale } : {}),
  };
}
