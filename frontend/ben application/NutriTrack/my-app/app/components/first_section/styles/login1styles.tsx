import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDEAE4',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: 220,
    borderBottomLeftRadius: 150,
    borderBottomRightRadius: 150,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D8A4E',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  card: {
    width: width - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#2D8A4E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  btnOutline: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A1814',
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#1A1814',
    fontSize: 15,
    fontWeight: '500',
  },
  loginText: {
    fontSize: 13,
    color: '#6B6760',
    marginTop: 4,
  },
  loginLink: {
    color: '#2D8A4E',
    fontWeight: '600',
  },
});