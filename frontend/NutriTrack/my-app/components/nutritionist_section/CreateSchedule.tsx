import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from "react-native";
import { useBookings } from "../../context/BookingContext";
import { Alert } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewTab = "nutritionist" | "dashboard";

interface AppState {
  nutritionistSlots: Record<string, string[]>;
  currentView: ViewTab;
  nutriSelDate: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const ALL_TIMES = ["08:00", "09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];

const TODAY = new Date();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[m-1].slice(0,3)} ${y}`;
}

const { width } = Dimensions.get("window");
const DAY_SIZE = Math.floor((width - 32 - 32 - 6 * 4) / 7);

// ─── Calendar ─────────────────────────────────────────────────────────────────

interface CalendarProps {
  monthOffset: number;
  onDayClick: (key: string) => void;
  availSlots: Record<string, string[]>;
  bookedSlots: Record<string, string[]>;
  selectedKey?: string | null;
}
function Calendar({ monthOffset, onDayClick, availSlots, bookedSlots, selectedKey }: CalendarProps) {
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
    const hasBooked = (bookedSlots[key]?.length ?? 0) > 0;
    const isSelected = selectedKey === key;

    let cellBg = "transparent";
    let textColor = "#374151";
    if (isPast) { textColor = "#d1d5db"; }
    else if (hasBooked) { cellBg = "#E6F1FB"; textColor = "#185FA5"; }
    else if (hasAvail)  { cellBg = "#E1F5EE"; textColor = "#0F6E56"; }

    cells.push(
      <TouchableOpacity
        key={key}
        disabled={isPast}
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
        {!isPast && hasAvail && (
          <View style={[s.calDot, { backgroundColor: hasBooked ? "#185FA5" : "#1D9E75" }]} />
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
// FALLBACK DATA — shown while backend is not yet connected.
// TODO (Backend): This mapping should come from GET /nutritionists
// The id field in each nutritionist object is what maps the name to an ID.
// Once /nutritionists is connected in ConsultScreen, pass the nutritionist id
// directly as a prop instead of looking it up from this hardcoded map.

export default function CreateSchedule({ onBack, nutritionistName, nutritionistId }: { 
  onBack?: () => void;
  nutritionistName: string;
  nutritionistId: number;
}) {
  const { bookings, updateBookingStatus, getSlots, saveSlots: saveSlotsToContext } = useBookings();
  const [toast, setToast] = useState<string | null>(null);
  const [state, setState] = useState<AppState>({
    nutritionistSlots: {},
    currentView: "nutritionist",
    nutriSelDate: null,
  });

  useEffect(() => {
    update({ nutritionistSlots: getSlots(nutritionistId) });  // ← use prop
  }, []);

  const update = (partial: Partial<AppState>) =>
    setState(prev => ({ ...prev, ...partial }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Only show confirmed bookings (auto-confirmed from user side)
  const bookedByDate: Record<string, string[]> = {};
bookings
  .filter(b => b.status === "confirmed" && b.nutritionist.includes(nutritionistName))
  .forEach(b => {
    if (!bookedByDate[b.date]) bookedByDate[b.date] = [];
    bookedByDate[b.date].push(b.time);
  });

  // ── Nutritionist actions ──────────────────────────────────────────────────

  const toggleNutriSlot = (date: string, time: string) => {
    if (bookedByDate[date]?.includes(time)) return;
    const current = state.nutritionistSlots[date] ?? [];
    const updated = current.includes(time)
      ? current.filter(t => t !== time)
      : [...current, time].sort();
    update({ nutritionistSlots: { ...state.nutritionistSlots, [date]: updated } });
  };

  const saveSlots = () => {
  saveSlotsToContext(nutritionistId, state.nutritionistSlots);
  showToast("Availability saved");
  update({ nutriSelDate: null });
};

  // ── Dashboard actions ─────────────────────────────────────────────────────

  // Nutritionist can cancel a confirmed booking
  const cancelBooking = (id: number) => {
  Alert.alert(
    "Cancel session",
    "Are you sure you want to cancel this booking?",
    [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: () => {
          updateBookingStatus(id, "cancelled");
          showToast("Session cancelled");
        },
      },
    ]
  );
};

  // ── Nutritionist view ─────────────────────────────────────────────────────

  const renderNutritionist = () => {
    const currentMonth = MONTHS[TODAY.getMonth()];
    const nextMonth = MONTHS[(TODAY.getMonth() + 1) % 12];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.rangeLabel}>
            {currentMonth} – {nextMonth} {TODAY.getFullYear()}
          </Text>
          <View style={s.legendRow}>
            {[["#5DCAA5", "Available"], ["#85B7EB", "Booked"]].map(([color, label]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>
          <Calendar
            monthOffset={0}
            onDayClick={key => update({ nutriSelDate: key })}
            availSlots={state.nutritionistSlots}
            bookedSlots={bookedByDate}
            selectedKey={state.nutriSelDate}
          />
          <View style={s.calDivider} />
          <Calendar
            monthOffset={1}
            onDayClick={key => update({ nutriSelDate: key })}
            availSlots={state.nutritionistSlots}
            bookedSlots={bookedByDate}
            selectedKey={state.nutriSelDate}
          />
        </View>

        {state.nutriSelDate != null && (() => {
          const existing = state.nutritionistSlots[state.nutriSelDate] ?? [];
          const booked   = bookedByDate[state.nutriSelDate] ?? [];
          return (
            <View style={s.card}>
              <Text style={s.sectionLabel}>Time slots · {fmtDate(state.nutriSelDate)}</Text>
              <View style={s.timeGrid}>
                {ALL_TIMES.map(t => {
                  const isBooked  = booked.includes(t);
                  const isEnabled = existing.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      disabled={isBooked}
                      onPress={() => toggleNutriSlot(state.nutriSelDate!, t)}
                      style={[
                        s.timeSlot,
                        isEnabled && !isBooked && s.timeSlotEnabled,
                        isBooked && s.timeSlotBooked,
                      ]}
                    >
                      <Text style={[
                        s.timeSlotText,
                        isEnabled && !isBooked && s.timeSlotTextEnabled,
                        isBooked && s.timeSlotTextBooked,
                      ]}>
                        {t}{isBooked ? " (booked)" : isEnabled ? " ✓" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.actionRow}>
                <TouchableOpacity style={s.btnPrimary} onPress={saveSlots}>
                  <Text style={s.btnPrimaryText}>Save availability</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── Dashboard ─────────────────────────────────────────────────────────────

  const renderDashboard = () => {
    const todayKey = new Date().toISOString().split('T')[0];
    const confirmed = bookings.filter(b => 
      b.status === "confirmed" && 
      b.nutritionist.includes(nutritionistName) &&
      b.date >= todayKey
);
    const cancelled = bookings.filter(b => b.status === "cancelled" && b.nutritionist.includes(nutritionistName));

    const BookingRow = ({ b, showCancel }: { b: typeof bookings[0]; showCancel?: boolean }) => (
      <View style={s.bookingRow}>
        <View style={[s.avatar, { backgroundColor: "#E1F5EE" }]}>
          <Text style={[s.avatarText, { color: "#0F6E56" }]}>{b.initials}</Text>
        </View>
        <View style={s.bookingInfo}>
          <Text style={s.bookingName}>{b.user}</Text>
          <Text style={s.bookingMeta}>{fmtDate(b.date)} · {b.time} · {b.topic}</Text>
        </View>
        {showCancel ? (
          <TouchableOpacity style={s.btnDangerSmall} onPress={() => cancelBooking(b.id)}>
            <Text style={s.btnDangerText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.cancelledBadge}>
            <Text style={s.cancelledBadgeText}>Cancelled</Text>
          </View>
        )}
      </View>
    );

    return (
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={s.statsRow}>
          {([
            ["Confirmed", confirmed.length],
            ["Cancelled", cancelled.length],
          ] as [string, number][]).map(([label, val]) => (
            <View key={label} style={s.statCard}>
              <Text style={s.statVal}>{val}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {confirmed.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Upcoming sessions</Text>
            <View style={s.card}>
              {confirmed.map(b => <BookingRow key={b.id} b={b} showCancel />)}
            </View>
          </>
        )}

        {confirmed.length === 0 && (
          <View style={s.card}>
            <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", paddingVertical: 12 }}>
              No upcoming sessions
            </Text>
          </View>
        )}

        {cancelled.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Cancelled</Text>
            <View style={s.card}>
              {cancelled.map(b => <BookingRow key={b.id} b={b} />)}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
  <TouchableOpacity onPress={onBack} style={s.backBtn}>
    <Text style={s.backText}>← Back</Text>
  </TouchableOpacity>
  <Text style={s.headerTitle}>Session Scheduler</Text>
  <Text style={s.headerSub}>1-hour Personalised Nutrition Sessions</Text>

      <View style={s.tabBar}>
        {([
          { key: "nutritionist", label: "Set availability" },
          { key: "dashboard",    label: "Bookings"         },
        ] as { key: ViewTab; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, state.currentView === t.key && s.tabActive]}
            onPress={() => update({ currentView: t.key })}
          >
            <Text style={[s.tabText, state.currentView === t.key && s.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.content}>
        {state.currentView === "nutritionist" && renderNutritionist()}
        {state.currentView === "dashboard"    && renderDashboard()}
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
  backText: { fontSize: 14, color: "#10b981", fontWeight: "600" },
  backBtn: { paddingHorizontal: 16, paddingTop: 8, marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16 },
  headerSub: { fontSize: 12, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#e5e7eb", borderRadius: 10, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#111827" },

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
  rangeLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 12 },

  legendRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
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
  calDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 3 },
  calDivider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 },

  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  timeSlot: {
    width: "47%", paddingVertical: 10, borderRadius: 8, alignItems: "center",
    borderWidth: 0.5, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  timeSlotEnabled: { backgroundColor: "#E1F5EE", borderColor: "#1D9E75" },
  timeSlotBooked:  { backgroundColor: "#f9fafb" },
  timeSlotText:        { fontSize: 13, color: "#6b7280" },
  timeSlotTextEnabled: { color: "#0F6E56", fontWeight: "600" },
  timeSlotTextBooked:  { color: "#d1d5db", textDecorationLine: "line-through" },

  actionRow: { flexDirection: "row", gap: 8 },
  btnPrimary: {
    backgroundColor: "#10b981", paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  btnSecondary: {
    borderWidth: 0.5, borderColor: "#d1d5db",
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, alignItems: "center",
  },
  btnSecondaryText: { color: "#374151", fontSize: 13, fontWeight: "500" },
  btnDangerSmall: {
    borderWidth: 0.5, borderColor: "#fca5a5",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 7, alignItems: "center",
  },
  btnDangerText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 10,
    padding: 12, borderWidth: 0.5, borderColor: "#e5e7eb",
  },
  statVal:   { fontSize: 22, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  bookingRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "700" },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  bookingMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  cancelledBadge: { backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  cancelledBadgeText: { fontSize: 11, fontWeight: "600", color: "#9ca3af" },

  toast: {
    position: "absolute", bottom: 24, alignSelf: "center",
    backgroundColor: "#1f2937", paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: "#fff", fontSize: 13 },
});
