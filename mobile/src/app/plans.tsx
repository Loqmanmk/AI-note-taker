import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLANS, PLAN_ORDER, planPrice, type Billing, type Plan, type PlanId } from "@shared/plans";
import { PlanUsage } from "@/components/PlanUsage";
import { Badge, Button, Card, Txt } from "@/components/ui";
import { usePlan } from "@/hooks/usePlan";
import { showMessage } from "@/lib/confirm";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

const RANK: Record<PlanId, number> = { free: 0, premium: 1, pro: 2 };

/** What each plan includes and costs, with the student's current plan and usage. */
export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const { status } = usePlan();
  const [billing, setBilling] = useState<Billing>("monthly");
  const current = status?.plan ?? "free";

  function choose(plan: Plan) {
    // Payments go through Google Play once the app is published there.
    showMessage(
      `${plan.name} is coming soon`,
      "Payments will open when FocusNotes is on Google Play. Until then, enjoy the Free plan.",
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <Txt variant="display">Choose your plan</Txt>
      <Txt variant="small" style={styles.lead}>
        Every plan writes the same notes: summary, focus topics, quiz and re-explanations. Paid plans give you more and
        longer classes.
      </Txt>

      {status && <PlanUsage status={status} />}

      <BillingSwitch value={billing} onChange={setBilling} />

      {PLAN_ORDER.map((id) => (
        <PlanCard
          key={id}
          plan={PLANS[id]}
          billing={billing}
          isCurrent={id === current}
          isUpgrade={RANK[id] > RANK[current]}
          highlighted={id === "premium"}
          onChoose={choose}
        />
      ))}

      <Txt variant="small" style={styles.footnote}>
        Prices in dirhams, with dollars for reference. Google Play shows the final price in your currency before you
        pay. Cancel anytime from Google Play. Classes reset on the 1st of each month.
      </Txt>
    </ScrollView>
  );
}

function BillingSwitch({ value, onChange }: { value: Billing; onChange: (value: Billing) => void }) {
  const theme = useTheme();
  const options: { id: Billing; label: string }[] = [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly · 2 months free" },
  ];
  return (
    <View style={[styles.switch, { backgroundColor: theme.cardAlt }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={[styles.switchOption, selected && { backgroundColor: theme.card, boxShadow: theme.shadow }]}
          >
            <Text style={[styles.switchText, { color: selected ? theme.ink : theme.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PlanCardProps = {
  plan: Plan;
  billing: Billing;
  isCurrent: boolean;
  isUpgrade: boolean;
  highlighted: boolean;
  onChoose: (plan: Plan) => void;
};

function PlanCard({ plan, billing, isCurrent, isUpgrade, highlighted, onChoose }: PlanCardProps) {
  const theme = useTheme();
  const price = planPrice(plan, billing);
  const period = billing === "yearly" ? "year" : "month";

  return (
    <Card style={[styles.card, highlighted && { borderColor: theme.primary, borderWidth: 2 }]}>
      <View style={styles.cardTop}>
        <Txt variant="title" style={styles.grow}>
          {plan.name}
        </Txt>
        {isCurrent ? (
          <Badge label="Your plan" icon="checkmark-circle" color={theme.good} background={theme.goodSoft} />
        ) : highlighted ? (
          <Badge label="Most popular" icon="star" color={theme.primary} background={theme.primarySoft} />
        ) : null}
      </View>

      {price ? (
        <View>
          <Text style={[styles.price, { color: theme.ink }]}>
            {price.mad} MAD<Text style={[styles.period, { color: theme.muted }]}> / {period}</Text>
          </Text>
          <Txt variant="small">
            ≈ ${price.usd.toFixed(2)}
            {billing === "yearly" && plan.price ? ` · ${Math.round(price.mad / 12)} MAD a month` : ""}
          </Txt>
        </View>
      ) : (
        <View>
          <Text style={[styles.price, { color: theme.ink }]}>
            0 MAD<Text style={[styles.period, { color: theme.muted }]}> / {period}</Text>
          </Text>
          <Txt variant="small">No card needed</Txt>
        </View>
      )}

      <View style={styles.features}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={18} color={theme.good} />
            <Txt variant="small" tone="ink" style={styles.grow}>
              {feature}
            </Txt>
          </View>
        ))}
      </View>

      {isUpgrade && (
        <Button
          kind={highlighted ? "primary" : "secondary"}
          icon="diamond-outline"
          label={`Get ${plan.name}`}
          onPress={() => onChoose(plan)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  lead: { marginTop: -spacing.sm },
  switch: { flexDirection: "row", borderRadius: radius.md, padding: 4 },
  switchOption: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  switchText: { fontFamily: fonts.bold, fontSize: 14 },
  card: { gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grow: { flex: 1 },
  price: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  period: { fontFamily: fonts.semibold, fontSize: 16 },
  features: { gap: spacing.sm },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  footnote: { textAlign: "center" },
});
