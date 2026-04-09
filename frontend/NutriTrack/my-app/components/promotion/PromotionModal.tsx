import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Clipboard,
} from "react-native";
import { Promotion } from "@/constants/promotions";

type Props = {
  promotion: Promotion;
  visible: boolean;
  onDismiss: () => void;
  onClaim?: () => void;
};

export default function PromotionModal({ promotion, visible, onDismiss, onClaim }: Props) {
  const [copied, setCopied] = React.useState(false);

  function handleCopyCode() {
    Clipboard.setString(promotion.discountCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accent = promotion.accentColor ?? "#4CAF50";

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <View style={styles.centeredView}>
        <View style={styles.card}>
          {/* Accent bar */}
          <View style={[styles.accentBar, { backgroundColor: accent }]} />

          <View style={styles.content}>
            <Text style={styles.title}>{promotion.title}</Text>
            <Text style={styles.description}>{promotion.description}</Text>

            {/* Discount badge */}
            <View style={[styles.badge, { backgroundColor: accent + "20", borderColor: accent }]}>
              <Text style={[styles.badgeText, { color: accent }]}>
                {promotion.discountPercent}% OFF
              </Text>
            </View>

            {/* Discount code */}
            <Text style={styles.codeLabel}>Use code at checkout:</Text>
            <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
              <Text style={styles.codeText}>{promotion.discountCode}</Text>
              <Text style={styles.copyHint}>{copied ? "Copied!" : "Tap to copy"}</Text>
            </TouchableOpacity>

            {/* End date */}
            <Text style={styles.expiry}>
              Offer ends:{" "}
              {new Date(promotion.endDate).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: accent }]}
              onPress={onClaim ?? onDismiss}
            >
              <Text style={styles.ctaText}>Claim Now</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    maxWidth: 360,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  accentBar: {
    height: 6,
    width: "100%",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 16,
    lineHeight: 20,
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  codeBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  codeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 3,
    color: "#1a1a1a",
  },
  copyHint: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
  },
  expiry: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 20,
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  dismissText: {
    color: "#aaa",
    fontSize: 13,
  },
});