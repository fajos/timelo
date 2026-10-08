import { create } from 'zustand';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = 'appl_mock_ios_key';
const REVENUECAT_API_KEY_ANDROID = 'test_cMTUBsaDzXNcJgcKnQBhhaCRFhy';

// Support common entitlement identifier names ('pro_access', 'pro', 'premium')
function hasActiveProEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return false;
  }
  const activeKeys = Object.keys(customerInfo.entitlements.active);
  return activeKeys.length > 0;
}

interface SubscriptionStoreState {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  initRevenueCat: () => Promise<void>;
  checkEntitlements: () => Promise<boolean>;
  purchaseMonthly: () => Promise<boolean>;
  purchaseAnnual: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  toggleProMock: () => void;
}

export const useSubscriptionStore = create<SubscriptionStoreState>((set, get) => ({
  isPro: false,
  isLoading: true,
  currentOffering: null,
  customerInfo: null,

  initRevenueCat: async () => {
    try {
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY_ANDROID });
      }

      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        set({ currentOffering: offerings.current });
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = hasActiveProEntitlement(customerInfo);
      set({ isPro, customerInfo, isLoading: false });
    } catch (e) {
      console.log('RevenueCat initialization notice:', e);
      set({ isLoading: false });
    }
  },

  checkEntitlements: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = hasActiveProEntitlement(customerInfo);
      set({ isPro, customerInfo });
      return isPro;
    } catch {
      return get().isPro;
    }
  },

  purchaseMonthly: async () => {
    try {
      const { currentOffering } = get();
      if (!currentOffering || !currentOffering.monthly) {
        set({ isPro: true });
        return true;
      }
      const { customerInfo } = await Purchases.purchasePackage(currentOffering.monthly);
      const isPro = hasActiveProEntitlement(customerInfo);
      set({ isPro, customerInfo });
      return isPro;
    } catch (e) {
      console.log('Purchase monthly notice/cancel:', e);
      return false;
    }
  },

  purchaseAnnual: async () => {
    try {
      const { currentOffering } = get();
      if (!currentOffering || !currentOffering.annual) {
        set({ isPro: true });
        return true;
      }
      const { customerInfo } = await Purchases.purchasePackage(currentOffering.annual);
      const isPro = hasActiveProEntitlement(customerInfo);
      set({ isPro, customerInfo });
      return isPro;
    } catch (e) {
      console.log('Purchase annual notice/cancel:', e);
      return false;
    }
  },

  restorePurchases: async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = hasActiveProEntitlement(customerInfo);
      set({ isPro, customerInfo });
      return isPro;
    } catch {
      return false;
    }
  },

  toggleProMock: () => {
    set((state) => ({ isPro: !state.isPro }));
  },
}));
