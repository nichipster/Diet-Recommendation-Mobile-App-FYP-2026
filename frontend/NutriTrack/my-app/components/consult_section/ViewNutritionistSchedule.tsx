import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookings } from "../../context/BookingContext";
import { NUTRITIONISTS } from "../consult_section/ConsultScreen";
import { useUser } from "../../context/UserContext";

// NOTE !!! DUMMY DATA IMPORTED FROM CONSULTSCREEN. "NUTRITIONIST" REPLACE WITH REAL API DATA LATER.
// ─── Types ────────────────────────────────────────────────────────────────────

type UserStep = "browse" | "pick-time" | "confirmed";

interface AppState {
  availSlots: Record<string, string[]>;
  selectedDate: string | null;
  selectedTime: string | null;
  step: UserStep;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TODAY = new Date();

const TOPICS = ["General nutrition","Weight management","Sports nutrition","Gut health","Meal planning","Follow-up"];

// Replace with real user from UserContext later
const CURRENT_USER = { name: "Test User", initials: "TU" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[m-1].slice(0,3)} ${y}`;
}

function fmtDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return DAYS[new Date(y, m-1, d).getDay()];
}

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(h+1).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

const { width } = Dimensions.get("window");
const DAY_SIZE = Math.floor((width - 32 - 32 - 6 * 4) / 7);

// ─── Calendar ─────────────────────────────────────────────────────────────────

interface CalendarProps {
  monthOffset: number;
  onDayClick: (key: string) => void;
  availSlots: Record<string, string[]>;
  bookedDates: string[];
  selectedKey?: string | null;
  blocked?: boolean;
}

function Calendar({ monthOffset, onDayClick, availSlots, bookedDates, selectedKey, blocked }: CalendarProps) {
  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(TODAY);
  const todayDate = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  const cells: React.ReactElement[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(<View key={`e${i}`} style={{ width: DAY_SIZE, height: DAY_SIZE }} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = dateKey(date);
    const isPast = date < todayDate;
    const isToday = key === todayKey;
    const hasAvail = (availSlots[key]?.length ?? 0) > 0;
    const isUserBooked = bookedDates.includes(key);
    const isSelected = selectedKey === key;
    const isDisabled = isPast || !hasAvail || isUserBooked || blocked;

    let cellBg = "transparent";
    let textColor = isPast ? "#d1d5db" : "#374151";

    if (!isPast && isUserBooked)                   { cellBg = "#E6F1FB"; textColor = "#185FA5"; }
    else if (!isPast && hasAvail && !blocked)       { cellBg = "#E1F5EE"; textColor = "#0F6E56"; }
    else if (!isPast && hasAvail && blocked)        { cellBg = "#f3f4f6"; textColor = "#9ca3af"; }

    cells.push(
      <TouchableOpacity
        key={key}
        disabled={isDisabled}
        onPress={() => onDayClick(key)}
        style={[
          s.calCell,
          { width: DAY_SIZE, height: DAY_SIZE, backgroundColor: cellBg },
          isSelected && s.calCellSelected,
        ]}
      >
        <Text style={[s.calDayText, { color: textColor }, isToday && s.calToday]}>
          {d}
        </Text>
        {!isPast && hasAvail && !isUserBooked && !blocked && (
          <View style={s.calDot} />
        )}
        {!isPast && isUserBooked && (
          <View style={[s.calDot, { backgroundColor: "#185FA5" }]} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <Text style={s.calMonthLabel}>{MONTHS[month]} {year}</Text>
      <View style={s.calDayHeaders}>
        {DAYS.map(d => <Text key={d} style={[s.calDayHeader, { width: DAY_SIZE }]}>{d}</Text>)}
      </View>
      <View style={s.calGrid}>{cells}</View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ViewNutritionistSchedule({ onBack, nutritionist }: 
  { onBack?: () => void; nutritionist: typeof NUTRITIONISTS[0] }) {
  const { bookings, addBooking, updateBookingStatus } = useBookings();

  const NUTRITIONIST = {...nutritionist};

  const [toast, setToast] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [topicOpen, setTopicOpen] = useState(false);

  const [state, setState] = useState<AppState>({
    availSlots: nutritionist.availableSlots,
    selectedDate: null,
    selectedTime: null,
    step: "browse",
  });

  const update = (partial: Partial<AppState>) =>
    setState(prev => ({ ...prev, ...partial }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // My bookings only
  const myBookings = bookings.filter(b => b.user === CURRENT_USER.name);

  // Only 1 active (confirmed) booking at a time
  const confirmedBookings = myBookings.filter(b => b.status === "confirmed");
  const hasActiveBooking = confirmedBookings.length >= 2;
  const alreadyBookedThisNutritionist = confirmedBookings.some(
  b => b.nutritionist === NUTRITIONIST.name
);

  // Dates I've confirmed — blocks calendar
  const myBookedDates = myBookings
    .filter(b => b.status === "confirmed")
    .map(b => b.date);

  // Times already taken on selected date by anyone
  const takenTimesOnDate = bookings
    .filter(b => b.date === state.selectedDate && b.status === "confirmed")
    .map(b => b.time);

  const freeSlots = state.selectedDate
    ? (state.availSlots[state.selectedDate] ?? []).filter(t => !takenTimesOnDate.includes(t))
    : [];

  // ── Actions ───────────────────────────────────────────────────────────────

  // Update confirmBooking to check both conditions:
  const confirmBooking = () => {
  if (!state.selectedDate || !state.selectedTime) return;
  if (hasActiveBooking) {
    showToast("You can only have 2 active sessions at a time");
    return;
  }
  if (alreadyBookedThisNutritionist) {
    showToast("You already have a session booked with this nutritionist");
    return;
  }
  addBooking({
    user: CURRENT_USER.name,
    initials: CURRENT_USER.initials,
    date: state.selectedDate,
    time: state.selectedTime,
    status: "confirmed",
    topic: selectedTopic,
    nutritionist: NUTRITIONIST.name,
  });
  update({ step: "confirmed" });
};

  const cancelBooking = (id: number) => {
    Alert.alert(
      "Cancel session",
      "Are you sure you want to cancel this session?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel session", style: "destructive",
          onPress: () => {
            updateBookingStatus(id, "cancelled");
            showToast("Session cancelled");
          },
        },
      ]
    );
  };

  const resetBrowse = () =>
    update({ step: "browse", selectedDate: null, selectedTime: null });

  // ── Browse view ───────────────────────────────────────────────────────────

  const renderBrowse = () => {
    const upcoming = myBookings.filter(b => b.status === "confirmed");
    const past     = myBookings.filter(b => b.status === "cancelled");

    return (
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Nutritionist card */}
        <View style={s.nutriCard}>
          <View style={s.nutriAvatar}>
            <Text style={s.nutriAvatarText}>{NUTRITIONIST.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.nutriName}>{NUTRITIONIST.name}</Text>
            <Text style={s.nutriSpec}>{NUTRITIONIST.specialisation}</Text>
            <View style={s.nutriStats}>
              <Text style={s.nutriStat}>⭐ {NUTRITIONIST.rating}</Text>
              <Text style={s.nutriStatDivider}>·</Text>
            </View>
          </View>
        </View>

        {/* Active booking warning */}
         {hasActiveBooking && (
          <View style={s.warningBanner}>
           <Text style={s.warningTitle}>Session limit reached</Text>
           <Text style={s.warningSub}>
           You can hold up to 2 active sessions at a time. Cancel one to book another.
          </Text>
         </View>
        )}
        {!hasActiveBooking && alreadyBookedThisNutritionist && (
        <View style={s.warningBanner}>
         <Text style={s.warningTitle}>Already booked with {NUTRITIONIST.name}</Text>
          <Text style={s.warningSub}>
          You already have an upcoming session with this nutritionist.
          </Text>
         </View>
        )}
  
        {/* Calendar */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>
            {hasActiveBooking ? "Your schedule" : "Pick a date"}
          </Text>
          <View style={s.legendRow}>
            {[["#5DCAA5", "Available"], ["#85B7EB", "Your booking"]].map(([color, label]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>
          <Calendar
            monthOffset={0}
            onDayClick={key => update({ selectedDate: key, selectedTime: null, step: "pick-time" })}
            availSlots={state.availSlots}
            bookedDates={myBookedDates}
            selectedKey={state.selectedDate}
            blocked={hasActiveBooking || alreadyBookedThisNutritionist}
          />
          <View style={s.calDivider} />
          <Calendar
            monthOffset={1}
            onDayClick={key => update({ selectedDate: key, selectedTime: null, step: "pick-time" })}
            availSlots={state.availSlots}
            bookedDates={myBookedDates}
            selectedKey={state.selectedDate}
            blocked={hasActiveBooking || alreadyBookedThisNutritionist}
          />
        </View>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Your upcoming sessions</Text>
            <View style={s.card}>
              {upcoming.map((b, i) => (
                <View key={b.id} style={[s.bookingRow, i === upcoming.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.bookingDateBadge}>
                    <Text style={s.bookingDateDay}>{fmtDay(b.date)}</Text>
                    <Text style={s.bookingDateNum}>{b.date.split("-")[2]}</Text>
                  </View>
                  <View style={s.bookingInfo}>
                    <Text style={s.bookingName}>{b.topic}</Text>
                    <Text style={s.bookingMeta}>{fmtDate(b.date)} · {b.time} – {addHour(b.time)}</Text>
                    <Text style={s.bookingNutri}>{b.nutritionist}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={s.confirmedBadge}>
                      <Text style={s.confirmedBadgeText}>Confirmed ✓</Text>
                    </View>
                    <TouchableOpacity onPress={() => cancelBooking(b.id)} style={s.cancelBtn}>
                      <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Past / cancelled */}
        {past.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Past sessions</Text>
            <View style={s.card}>
              {past.map((b, i) => (
                <View key={b.id} style={[s.bookingRow, i === past.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[s.bookingDateBadge, { backgroundColor: "#f3f4f6" }]}>
                    <Text style={[s.bookingDateDay, { color: "#9ca3af" }]}>{fmtDay(b.date)}</Text>
                    <Text style={[s.bookingDateNum, { color: "#9ca3af" }]}>{b.date.split("-")[2]}</Text>
                  </View>
                  <View style={s.bookingInfo}>
                    <Text style={[s.bookingName, { color: "#9ca3af" }]}>{b.topic}</Text>
                    <Text style={s.bookingMeta}>{fmtDate(b.date)} · {b.time}</Text>
                  </View>
                  <View style={s.cancelledBadge}>
                    <Text style={s.cancelledBadgeText}>Cancelled</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── Pick time ─────────────────────────────────────────────────────────────

  const renderPickTime = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={s.backRow} onPress={resetBrowse}>
        <Text style={s.backRowText}>← Back</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.sectionLabel}>
          {state.selectedDate ? fmtDate(state.selectedDate) : ""}
        </Text>
        <Text style={s.pickTimeHeading}>Choose a time slot</Text>
        <Text style={s.pickTimeSub}>Each session is 1 hour with {NUTRITIONIST.name}</Text>
        <View style={s.timeGrid}>
          {freeSlots.length === 0 ? (
            <Text style={{ fontSize: 13, color: "#9ca3af", padding: 8 }}>No slots available for this date.</Text>
          ) : freeSlots.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => update({ selectedTime: t })}
              style={[s.timeSlot, state.selectedTime === t && s.timeSlotSelected]}
            >
              <Text style={[s.timeSlotText, state.selectedTime === t && s.timeSlotTextSelected]}>
                {t}
              </Text>
              <Text style={[s.timeSlotSub, state.selectedTime === t && s.timeSlotSubSelected]}>
                – {addHour(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Topic picker */}
      {state.selectedTime && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>Session topic</Text>
          <TouchableOpacity
            style={s.topicSelector}
            onPress={() => setTopicOpen(!topicOpen)}
          >
            <Text style={s.topicSelectorText}>{selectedTopic}</Text>
            <Text style={s.topicChevron}>{topicOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {topicOpen && (
            <View style={s.topicDropdown}>
              {TOPICS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.topicOption, selectedTopic === t && s.topicOptionActive]}
                  onPress={() => { setSelectedTopic(t); setTopicOpen(false); }}
                >
                  <Text style={[s.topicOptionText, selectedTopic === t && s.topicOptionTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Confirm panel */}
      {state.selectedTime && (
        <View style={s.confirmPanel}>
          <Text style={s.confirmTitle}>Booking summary</Text>
          {[
            ["Date",         fmtDate(state.selectedDate!)],
            ["Time",         `${state.selectedTime} – ${addHour(state.selectedTime)}`],
            ["Duration",     "1 hour"],
            ["Nutritionist", NUTRITIONIST.name],
            ["Topic",        selectedTopic],
          ].map(([label, value]) => (
            <View key={label} style={s.confirmRow}>
              <Text style={s.confirmLabel}>{label}</Text>
              <Text style={s.confirmValue}>{value}</Text>
            </View>
          ))}
          <TouchableOpacity style={s.btnConfirm} onPress={confirmBooking}>
            <Text style={s.btnConfirmText}>Confirm booking</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // ── Confirmed screen ──────────────────────────────────────────────────────

  const renderConfirmed = () => (
    <View style={s.confirmedScreen}>
      <View style={s.confirmedIcon}>
        <Text style={s.confirmedIconText}>✓</Text>
      </View>
      <Text style={s.confirmedTitle}>You're booked!</Text>
      <Text style={s.confirmedSub}>
        Your session with {NUTRITIONIST.name} on {fmtDate(state.selectedDate!)} at {state.selectedTime} is confirmed.
      </Text>
      <View style={s.confirmedCard}>
        {[
          ["Date",   fmtDate(state.selectedDate!)],
          ["Time",   `${state.selectedTime} – ${addHour(state.selectedTime!)}`],
          ["Topic",  selectedTopic],
          ["Status", "Confirmed ✓"],
        ].map(([label, value]) => (
          <View key={label} style={s.confirmRow}>
            <Text style={s.confirmLabel}>{label}</Text>
            <Text style={[s.confirmValue, label === "Status" && { color: "#0F6E56" }]}>{value}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.btnSecondary} onPress={resetBrowse}>
        <Text style={s.btnSecondaryText}>Back to schedule</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>Book a session</Text>
        <Text style={s.headerSub}>Premium · 1-on-1 nutrition consultation</Text>
      </View>

      <View style={s.content}>
        {state.step === "browse"    && renderBrowse()}
        {state.step === "pick-time" && renderPickTime()}
        {state.step === "confirmed" && renderConfirmed()}
      </View>

      {toast != null && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 14, color: "#10b981", fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },

  card: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 0.5, borderColor: "#e5e7eb",
    padding: 16, marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "600", color: "#9ca3af",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
  },

  warningBanner: {
    backgroundColor: "#fef3c7", borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 0.5, borderColor: "#fcd34d",
  },
  warningTitle: { fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 4 },
  warningSub: { fontSize: 12, color: "#b45309", lineHeight: 18 },

  nutriCard: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 0.5, borderColor: "#e5e7eb",
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  nutriAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#E1F5EE", alignItems: "center", justifyContent: "center",
  },
  nutriAvatarText: { fontSize: 16, fontWeight: "700", color: "#0F6E56" },
  nutriName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  nutriSpec: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  nutriStats: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  nutriStat: { fontSize: 12, color: "#374151", fontWeight: "500" },
  nutriStatDivider: { fontSize: 12, color: "#d1d5db" },

  legendRow: { flexDirection: "row", gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: "#6b7280" },

  calMonthLabel: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8 },
  calDayHeaders: { flexDirection: "row", marginBottom: 4 },
  calDayHeader: { textAlign: "center", fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  calCell: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  calCellSelected: { borderWidth: 2, borderColor: "#1D9E75" },
  calDayText: { fontSize: 13 },
  calToday: { fontWeight: "700" },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#1D9E75", position: "absolute", bottom: 3 },
  calDivider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 },

  bookingRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
  },
  bookingDateBadge: {
    width: 42, height: 48, borderRadius: 10,
    backgroundColor: "#E1F5EE", alignItems: "center", justifyContent: "center",
  },
  bookingDateDay: { fontSize: 10, fontWeight: "600", color: "#0F6E56" },
  bookingDateNum: { fontSize: 18, fontWeight: "700", color: "#0F6E56", lineHeight: 22 },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  bookingMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  bookingNutri: { fontSize: 11, color: "#10b981", marginTop: 1, fontWeight: "500" },

  confirmedBadge: { backgroundColor: "#E1F5EE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  confirmedBadgeText: { fontSize: 10, fontWeight: "600", color: "#0F6E56" },
  cancelBtn: {
    borderWidth: 0.5, borderColor: "#fca5a5",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  cancelText: { fontSize: 11, color: "#dc2626", fontWeight: "500" },
  cancelledBadge: { backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cancelledBadgeText: { fontSize: 11, fontWeight: "600", color: "#9ca3af" },

  backRow: { marginBottom: 12 },
  backRowText: { fontSize: 14, color: "#10b981", fontWeight: "600" },

  pickTimeHeading: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  pickTimeSub: { fontSize: 12, color: "#6b7280", marginBottom: 14 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeSlot: {
    width: "47%", paddingVertical: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: "#e5e7eb",
    backgroundColor: "#fff", alignItems: "center",
  },
  timeSlotSelected: { backgroundColor: "#E1F5EE", borderColor: "#1D9E75" },
  timeSlotText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  timeSlotTextSelected: { color: "#0F6E56" },
  timeSlotSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  timeSlotSubSelected: { color: "#1D9E75" },

  topicSelector: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 0.5, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
  },
  topicSelectorText: { fontSize: 14, color: "#374151" },
  topicChevron: { fontSize: 11, color: "#9ca3af" },
  topicDropdown: {
    borderWidth: 0.5, borderColor: "#e5e7eb", borderRadius: 8,
    marginTop: 6, overflow: "hidden",
  },
  topicOption: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  topicOptionActive: { backgroundColor: "#E1F5EE" },
  topicOptionText: { fontSize: 14, color: "#374151" },
  topicOptionTextActive: { color: "#0F6E56", fontWeight: "600" },

  confirmPanel: {
    backgroundColor: "#E1F5EE", borderWidth: 0.5, borderColor: "#5DCAA5",
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  confirmTitle: { fontSize: 14, fontWeight: "700", color: "#085041", marginBottom: 12 },
  confirmRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 8, alignItems: "center",
  },
  confirmLabel: { fontSize: 13, color: "#0F6E56" },
  confirmValue: { fontSize: 13, fontWeight: "600", color: "#085041", flexShrink: 1, textAlign: "right" },

  btnConfirm: {
    backgroundColor: "#10b981", paddingVertical: 12,
    borderRadius: 10, alignItems: "center", marginTop: 4,
  },
  btnConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  confirmedScreen: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24,
  },
  confirmedIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#E1F5EE", alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  confirmedIconText: { fontSize: 28, color: "#1D9E75" },
  confirmedTitle: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 8 },
  confirmedSub: {
    fontSize: 14, color: "#6b7280", textAlign: "center",
    lineHeight: 20, marginBottom: 24,
  },
  confirmedCard: {
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 0.5, borderColor: "#e5e7eb",
    padding: 16, width: "100%", marginBottom: 20,
  },
  btnSecondary: {
    borderWidth: 0.5, borderColor: "#d1d5db",
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 10, alignItems: "center",
  },
  btnSecondaryText: { fontSize: 14, color: "#374151", fontWeight: "500" },

  toast: {
    position: "absolute", bottom: 24, alignSelf: "center",
    backgroundColor: "#1f2937", paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: "#fff", fontSize: 13 },
});
