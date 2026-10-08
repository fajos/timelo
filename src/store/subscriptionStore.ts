import { create } from 'zustand';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = 'appl_mock_ios_key';
const REVENUECAT_API_KEY_ANDROID = 'goog_mock_android_key';
const PRO_ENTITLEMENT_ID = 'pro_access';

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
  toggleProMock: () => void; // Developer toggle for testing Pro features
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
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
      set({ isPro, customerInfo, isLoading: false });
    } catch (e) {
      // Sandbox fallback / Offline dev mode
      console.log('RevenueCat initialization notice:', e);
      set({ isLoading: false });
    }
  },

  checkEntitlements: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
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
        // Fallback for dev/sandbox simulation
        set({ isPro: true });
        return true;
      }
      const { customerInfo } = await Purchases.purchasePackage(currentOffering.monthly);
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
      set({ isPro, customerInfo });
      return isPro;
    } catch {
      return false;
    }
  },

  purchaseAnnual: async () => {
    try {
      const { currentOffering } = get();
      if (!currentOffering || !currentOffering.annual) {
        // Fallback for dev/sandbox simulation
        set({ isPro: true });
        return true;
      }
      const { customerInfo } = await Purchases.purchasePackage(currentOffering.annual);
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
      set({ isPro, customerInfo });
      return isPro;
    } catch {
      return false;
    }
  },

  restorePurchases: async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
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
