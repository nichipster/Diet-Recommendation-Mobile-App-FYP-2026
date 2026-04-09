import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getActivePromotion, Promotion } from "@/constants/promotions";

const PROMO_LAST_SHOWN_KEY = "nutritrack_promo_last_shown";
const PROMO_CLAIMED_KEY = "nutritrack_promo_claimed";
const PROMO_CODE_APPLIED_KEY = "nutritrack_promo_code_applied"; // add
const COOLDOWN_DAYS = 3;

export function usePromotion() {
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);   // add
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);               // add

  useEffect(() => {
    checkPromotion();
    loadAppliedCode();  // add
  }, []);

  async function loadAppliedCode() {
    try {
      const stored = await AsyncStorage.getItem(PROMO_CODE_APPLIED_KEY);
      if (stored) {
        const { code, discount, promoId, endDate } = JSON.parse(stored);

        // Clear if the promotion period has ended
        if (new Date() > new Date(endDate)) {
          await AsyncStorage.removeItem(PROMO_CODE_APPLIED_KEY);
          return;
        }

        // Clear if a different promo is now active
        const activePromo = getActivePromotion();
        if (!activePromo || activePromo.id !== promoId) {
          await AsyncStorage.removeItem(PROMO_CODE_APPLIED_KEY);
          return;
        }

        setAppliedPromoCode(code);
        setAppliedDiscount(discount);
      }
    } catch (e) {
      console.error("Error loading applied promo code:", e);
    }
  }

  async function saveAppliedCode(code: string, discount: number) {
    const promo = getActivePromotion();
    if (!promo) return;
    try {
      await AsyncStorage.setItem(
        PROMO_CODE_APPLIED_KEY,
        JSON.stringify({
          code,
          discount,
          promoId: promo.id,
          endDate: promo.endDate,  // used to auto-expire
        })
      );
      setAppliedPromoCode(code);
      setAppliedDiscount(discount);
    } catch (e) {
      console.error("Error saving applied promo code:", e);
    }
  }

  async function removeAppliedCode() {
    try {
      await AsyncStorage.removeItem(PROMO_CODE_APPLIED_KEY);
    } catch (e) {
      console.error("Error removing applied promo code:", e);
    }
    setAppliedPromoCode(null);
    setAppliedDiscount(0);
  }

  async function checkPromotion() {
    const promo = getActivePromotion();
    if (!promo) return;

    try {
      const claimedId = await AsyncStorage.getItem(PROMO_CLAIMED_KEY);
      if (claimedId === promo.id) return;

      const lastShownRaw = await AsyncStorage.getItem(PROMO_LAST_SHOWN_KEY);
      const now = Date.now();

      if (lastShownRaw) {
        const daysSince = (now - parseInt(lastShownRaw, 10)) / (1000 * 60 * 60 * 24);
        if (daysSince < COOLDOWN_DAYS) return;
      }

      setActivePromotion(promo);
      setShowModal(true);
    } catch (e) {
      console.error("Error checking promotion:", e);
    }
  }

  async function dismissPromotion() {
    try {
      await AsyncStorage.setItem(PROMO_LAST_SHOWN_KEY, Date.now().toString());
    } catch (e) {
      console.error("Error saving promo dismiss time:", e);
    }
    setShowModal(false);
  }

  async function claimPromotion() {
    if (!activePromotion) return;
    try {
      await AsyncStorage.setItem(PROMO_CLAIMED_KEY, activePromotion.id);
    } catch (e) {
      console.error("Error saving claimed promo:", e);
    }
    setShowModal(false);
  }

  return {
    activePromotion,
    showModal,
    dismissPromotion,
    claimPromotion,
    appliedPromoCode,   // add
    appliedDiscount,    // add
    saveAppliedCode,    // add
    removeAppliedCode,  // add
  };
}