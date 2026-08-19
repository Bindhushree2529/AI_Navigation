import { Tabs } from "expo-router";
import { Eye, Map, Settings, AlertTriangle } from "lucide-react-native";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0f172a", borderTopColor: "#1e293b" },
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Navigate",
          tabBarIcon: ({ color, size }) => <Eye size={size} color={color} />,
          tabBarAccessibilityLabel: "Navigate screen",
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
          tabBarAccessibilityLabel: "Map screen",
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} />,
          tabBarAccessibilityLabel: "SOS and emergency screen",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          tabBarAccessibilityLabel: "Settings screen",
        }}
      />
    </Tabs>
  );
}
