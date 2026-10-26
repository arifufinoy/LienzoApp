import { Platform, StyleSheet } from 'react-native';
export const palette = {
  background: '#E8EDF3', text: '#26364A', muted: '#56687D', accent: '#466B83', error: '#9B3546',
};
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, gap: 22, paddingBottom: 40, width: '100%', maxWidth: 740, alignSelf: 'center' },
  card: {
    backgroundColor: palette.background, borderRadius: 24, padding: 18, gap: 12,
    // Native Fabric boxShadow supports multiple shadows on Android 9+.
    boxShadow: [
      { offsetX: 6, offsetY: 6, blurRadius: 12, color: '#C5CEDA' },
      { offsetX: -5, offsetY: -5, blurRadius: 12, color: '#FFFFFF' },
    ],
    borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#F8FAFD',
    ...(Platform.OS === 'android' && Number(Platform.Version) < 28 ? { elevation: 5 } : {}),
  },
  title: { color: palette.text, fontSize: 29, fontWeight: '700' },
  heading: { color: palette.text, fontSize: 20, fontWeight: '700' },
  text: { color: palette.text, fontSize: 16, lineHeight: 24 },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  error: { color: palette.error, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  button: { paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderRadius: 18, minHeight: 48 },
  buttonText: { color: palette.accent, fontWeight: '700', fontSize: 16 },
  input: {
    borderRadius: 16, padding: 16, minHeight: 120, textAlignVertical: 'top',
    color: palette.text, backgroundColor: '#E1E7EF', fontSize: 16,
    borderColor: '#CCD6E2', borderWidth: 1,
  },
  image: { width: '100%', height: 250, borderRadius: 16, backgroundColor: '#DCE3EC' },
  badge: { color: palette.accent, fontSize: 13, fontWeight: '700' },
});
