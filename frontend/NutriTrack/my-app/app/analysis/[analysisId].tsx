import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import ViewAnalysis from '../../components/consult_section/ViewAnalysis';
import WriteAnalysis from '../../components/nutritionist_section/WriteAnalysis';

export default function AnalysisScreen() {
  const router = useRouter();
  const { user } = useUser();

  const { analysisId: rawId, nutritionistName } = useLocalSearchParams();
  const analysisId = Array.isArray(rawId) ? rawId[0] : rawId;

  const role = (user?.role || '').toLowerCase().trim();

  if (role === 'nutritionist') {
    return <WriteAnalysis onBack={() => router.back()} />;
  }

  return (
    <ViewAnalysis
      analysisId={analysisId}
      nutritionistName={Array.isArray(nutritionistName) ? nutritionistName[0] : nutritionistName}
      onBack={() => router.back()}
    />
  );
}