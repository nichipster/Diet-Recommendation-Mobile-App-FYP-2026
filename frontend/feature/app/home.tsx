import { Stack } from "expo-router";
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View>
        <Text>Home Screen</Text>
      </View>
    </>
  );
}