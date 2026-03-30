import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDEAE4' },
  keyboardView: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginTop: 12, marginBottom: 32 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { fontSize: 18, color: '#1A1814' },
  backText: { fontSize: 14, color: '#1A1814', fontWeight: '500' },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1814', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#6B6560', lineHeight: 22, marginBottom: 40 },
  emailHighlight: { color: '#2D5A3D', fontWeight: '600' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
  codeInput: {
    width: 48, height: 56, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D0CBC3',
    backgroundColor: '#F5F2ED', fontSize: 22,
    fontWeight: '700', color: '#1A1814', textAlign: 'center',
  },
  codeInputFilled: { borderColor: '#2D5A3D', backgroundColor: '#EAF2EC' },
  codeInputError: { borderColor: '#C8522A', backgroundColor: '#FDF0EC' },
  errorText: { fontSize: 13, color: '#C8522A', textAlign: 'center', marginBottom: 16 },
  btnPrimary: {
    backgroundColor: '#2D5A3D', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 20 },
  resendText: { fontSize: 14, color: '#6B6560' },
  resendLink: { color: '#2D5A3D', fontWeight: '600' },
});