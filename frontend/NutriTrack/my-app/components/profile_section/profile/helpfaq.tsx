import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable animation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function HelpFAQScreen() {
  const [openIndex, setOpenIndex] = React.useState<string | null>(null);

  const faqSections = [
    {
      title: 'General',
      data: [
        {
          question: 'What is NutriTrack and how does it work?',
          answer:
            'NutriTrack is a Singapore-based nutrition tracking app that helps you log meals, track macros, and work towards your dietary goals. Simply create an account, complete a short health survey, and start logging your meals from our local food database.',
        },
        {
          question: 'Is NutriTrack free to use?',
          answer:
            'NutriTrack offers a free tier with core tracking features. A premium plan is available for advanced analytics, personalised meal recommendations, and more.',
        },
        {
          question: 'Is my health data stored securely?',
          answer:
            'Yes. All personal and health data is encrypted and stored securely. We do not sell your data to third parties.',
        },
      ],
    },
    {
      title: 'Diet & Health',
      data: [
        {
          question:
            'Is NutriTrack suitable for people with dietary restrictions like halal or vegetarian?',
          answer:
            'Absolutely. NutriTrack supports halal, vegetarian, vegan, gluten-free, and several other dietary preferences. You can set your restrictions during onboarding and our food suggestions will reflect them.',
        },
        {
          question:
            'How does NutriTrack calculate my daily calorie and nutrition targets?',
          answer:
            "We use your age, height, weight, gender, and activity level to calculate your Total Daily Energy Expenditure (TDEE), then adjust based on your goal — whether that's losing, maintaining, or gaining weight.",
        },
        {
          question:
            'Can I use NutriTrack if I have a medical condition like diabetes or high cholesterol?',
          answer:
            'NutriTrack can support diabetes-friendly and heart-healthy goals with low GI and low sodium tracking. However, we always recommend consulting a healthcare professional for personalised medical advice.',
        },
      ],
    },
    {
      title: 'Food & Tracking',
      data: [
        {
          question:
            'Can I track hawker centre and local restaurant meals?',
          answer:
            "Yes — this is one of NutriTrack's strengths. Our database includes a wide range of Singapore hawker dishes like chicken rice, laksa, nasi lemak, char kway teow, and more, with localised nutrition data.",
        },
        {
          question:
            "How do I log a meal I can't find in the database?",
          answer:
            "You can manually enter nutrition details for any meal not in our database. We're constantly expanding our local food library based on user feedback.",
        },
        {
          question:
            'How do I update my weight or health goals over time?',
          answer:
            'You can update your profile, weight, and goals at any time from the Edit Profile section in the app. Your calorie targets will automatically recalculate.',
        },
      ],
    },
  ];

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(prev => (prev === id ? null : id));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Help & FAQ</Text>

      {faqSections.map((section, sectionIndex) => (
        <View key={sectionIndex}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.data.map((item, index) => {
            const id = `${sectionIndex}-${index}`;
            const isOpen = openIndex === id;

            return (
              <TouchableOpacity
                key={id}
                style={styles.faqItem}
                onPress={() => toggleItem(id)}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  <Text style={styles.question}>{item.question}</Text>
                  <Text style={styles.icon}>
                    {isOpen ? '−' : '+'}
                  </Text>
                </View>

                {isOpen && (
                  <Text style={styles.answer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  icon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
  },
  answer: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});