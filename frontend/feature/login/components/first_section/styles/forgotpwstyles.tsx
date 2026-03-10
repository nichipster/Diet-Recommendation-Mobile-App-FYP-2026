import { StyleSheet } from 'react-native';

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
    marginBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  btnPrimary: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D0CBC3',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryText: {
    color: '#1A1814',
    fontSize: 15,
    fontWeight: '500',
  },
});