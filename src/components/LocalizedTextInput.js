import React from 'react';
import { TextInput as NativeTextInput } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { translateText } from '../i18n/translations';
import { scaleTextStyle } from '../utils/textStyles';

export default function LocalizedTextInput({ style, ...props }) {
  const { fontFamily, fontScale, language } = useLanguage();
  return (
    <NativeTextInput
      {...props}
      placeholder={props.placeholder ? translateText(language, props.placeholder) : props.placeholder}
      style={[fontFamily ? { fontFamily } : null, scaleTextStyle(style, fontScale)]}
    />
  );
}
