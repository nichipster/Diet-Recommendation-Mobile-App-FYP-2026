import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDEAE4',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Header ──
  header: {
    marginTop: 12,
    marginBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 18,
    color: '#1A1814',
  },
  backText: {
    fontSize: 14,
    color: '#1A1814',
    fontWeight: '500',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1814',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // ── Form ──
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1814',
  },
  forgotText: {
    fontSize: 13,
    color: '#2D8A4E',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    backgroundColor: '#E8E4DE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0CBC3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A1814',
  },

  // ── Buttons ──
  btnPrimary: {
    width: '100%',
    backgroundColor: '#2D8A4E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0CBC3',
  },
  dividerText: {
    fontSize: 13,
    color: '#6B6760',
    fontWeight: '500',
  },

  // ── Google Button ──
  btnGoogle: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D0CBC3',
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 16,
  },
  btnGoogleText: {
    fontSize: 15,
    color: '#1A1814',
    fontWeight: '500',
  },

  // ── Sign Up Link ──
  signupText: {
    fontSize: 13,
    color: '#6B6760',
    textAlign: 'center',
  },
  signupLink: {
    color: '#2D8A4E',
    fontWeight: '600',
  },


  inputError: {
    borderColor: '#C8522A',
    backgroundColor: '#FDF0EC',
  },
  errorText: {
    fontSize: 12,
    color: '#C8522A',
    marginTop: 4,
  },
});