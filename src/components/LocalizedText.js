import React from 'react';
import { Text as NativeText } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { translateText } from '../i18n/translations';
import { scaleTextStyle } from '../utils/textStyles';

export default function LocalizedText({ style, ...props }) {
  const { fontFamily, fontScale, language } = useLanguage();
  const children = React.Children.map(props.children, (child) => (
    typeof child === 'string' ? translateText(language, child) : child
  ));
  return (
    <NativeText
      {...props}
      children={children}
      style={[fontFamily ? { fontFamily } : null, scaleTextStyle(style, fontScale)]}
    />
  );
}
