import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLANS, PLAN_ORDER, type Plan } from "@shared/plans";
import { useT } from "@/i18n";
import { planFeatures, planName } from "@/i18n/format";
import { PlanUsage } from "@/components/PlanUsage";
import { Badge, Card, Txt } from "@/components/ui";
import { usePlan } from "@/hooks/usePlan";
import { spacing, useTheme } from "@/lib/theme";

/**
 * What each plan includes, with the student's current plan and usage. The app shows no prices
 * and no way to pay: Google Play only allows in-app sales through its own billing.
 */
export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const m = useT();
  const { status } = usePlan();
  const current = status?.plan ?? "free";

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <Stack.Screen options={{ title: m.plans.screenTitle }} />
      <Txt variant="display">{m.plans.title}</Txt>
      <Txt variant="small" style={styles.lead}>
        {m.plans.lead}
      </Txt>

      {status && <PlanUsage status={status} />}

      {PLAN_ORDER.map((id) => (
        <PlanCard key={id} plan={PLANS[id]} isCurrent={id === current} />
      ))}

      <Txt variant="small" style={styles.footnote}>
        {m.plans.footnote}
      </Txt>
    </ScrollView>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const theme = useTheme();
  const m = useT();

  return (
    <Card style={[styles.card, isCurrent && { borderColor: theme.primary, borderWidth: 2 }]}>
      <View style={styles.cardTop}>
        <Txt variant="title" style={styles.grow}>
          {planName(plan.id, m)}
        </Txt>
        {isCurrent && <Badge label={m.plans.yourPlan} icon="checkmark-circle" color={theme.good} background={theme.goodSoft} />}
      </View>
      <View style={styles.features}>
        {planFeatures(plan, m).map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={18} color={theme.good} />
            <Txt variant="small" tone="ink" style={styles.grow}>
              {feature}
            </Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  lead: { marginTop: -spacing.sm },
  card: { gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grow: { flex: 1 },
  features: { gap: spacing.sm },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  footnote: { textAlign: "center" },
});
