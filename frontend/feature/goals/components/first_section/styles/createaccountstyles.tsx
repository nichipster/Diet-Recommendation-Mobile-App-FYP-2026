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
  header: {
    marginTop: 12,
    marginBottom: 32,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1814',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  form: {
    gap: 16,
    marginBottom: 28,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1814',
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
  inputError: {
    borderColor: '#C8522A',
    backgroundColor: '#FAE8E0',
  },
  errorText: {
    fontSize: 12,
    color: '#C8522A',
    marginTop: 2,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#2D5A3D',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#2D5A3D',
  },
  checkmark: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#6B6760',
    lineHeight: 20,
  },
  termsLink: {
    color: '#1A1814',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#2D8A4E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loginText: {
    fontSize: 13,
    color: '#6B6760',
    textAlign: 'center',
  },
  loginLink: {
    color: '#2D8A4E',
    fontWeight: '600',
  },
});