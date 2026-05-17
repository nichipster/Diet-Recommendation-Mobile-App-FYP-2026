import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import ViewAnalysis from '../../components/consult_section/ViewAnalysis';
import WriteAnalysis from '../../components/nutritionist_section/WriteAnalysis';
import { useBookings } from '../../context/BookingContext';

export default function AnalysisScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { bookings } = useBookings();

  const role = (user?.role || '').toLowerCase().trim();

  // Build clients list from confirmed bookings for this nutritionist
  const nutritionistName = `${user.firstName} ${user.lastName}`;
  const clients = bookings
    .filter(b => b.nutritionist === nutritionistName && b.status === 'confirmed')
    .map(b => ({
      id: b.userId,
      name: b.user,
      goal: b.topic,
    }))
    // deduplicate by id
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {role === 'nutritionist' ? (
        <WriteAnalysis
          onBack={() => router.back()}
          clients={clients}
        />
      ) : (
        <ViewAnalysis />
      )}
    </>
  );
}