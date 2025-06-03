import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 3,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    height: 56,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    height: 56,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 60,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 300,
    width: '100%',
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 280,
  },
  dropdownScrollContent: {
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSeparator: {
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 14,
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 13,
  },
  favoriteIcon: {
    margin: 0,
    marginLeft: 8,
  },
});
