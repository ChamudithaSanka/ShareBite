import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocalizedText from '../../components/LocalizedText';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';

export default function LanguageSelectionScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, userProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [saving, setSaving] = useState(false);

  const continueToApp = async () => {
    setSaving(true);
    try {
      await setLanguage(selectedLanguage);
      if (!user || !userProfile) navigation.replace('Onboard');
    } catch (error) {
      console.error('Failed to save selected language:', error);
      Alert.alert(t('language.saveErrorTitle'), t('language.saveErrorMessage'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View>
          <LocalizedText style={[styles.title, { color: colors.text }]}>{t('language.title')}</LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: colors.textSecondary }]}>{t('language.subtitle')}</LocalizedText>
        </View>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = selectedLanguage === option.code;
            return (
              <Pressable
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setSelectedLanguage(option.code)}
                style={[
                  styles.option,
                  { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
                ]}
              >
                <View style={styles.optionText}>
                  <LocalizedText style={[styles.nativeName, { color: colors.text }]}>{option.nativeName}</LocalizedText>
                  <LocalizedText style={[styles.englishName, { color: colors.textSecondary }]}>{option.name}</LocalizedText>
                </View>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                  {selected ? <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={continueToApp}
          style={[styles.continueButton, { backgroundColor: colors.primary }, saving && styles.disabled]}
        >
          <LocalizedText style={[styles.continueText, { color: colors.surface }]}>{t('language.continue')}</LocalizedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 32 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 10 },
  options: { gap: 14 },
  option: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    paddingHorizontal: 18,
  },
  optionText: { gap: 3 },
  nativeName: { fontSize: 20, fontWeight: '700' },
  englishName: { fontSize: 13 },
  radio: { alignItems: 'center', borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 },
  radioSelected: { borderRadius: 5, height: 10, width: 10 },
  continueButton: { alignItems: 'center', borderRadius: 14, paddingVertical: 16 },
  continueText: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.65 },
});
