import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const DIM_ROWS = [
  ["RFC fit", "6", "8"],
  ["Stack", "9", "9"],
  ["Correctness", "6", "8"],
  ["Edges", "5", "8"],
  ["Diff", "8", "7"],
  ["Total", "34", "40"],
] as const;

export default function MonetizeEvalCodeCanvas() {
  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <Pill size="sm" active>
          Slide 4 of 5 · Code
        </Pill>
        <H1>Code — E vs F</H1>
        <Text tone="secondary">
          Same baselines: PRD A + RFC C · real commits · focused tests PASS both
        </Text>
        <Text tone="tertiary" size="small">
          Source: scores/code.json · WRITEUP.md · 2026-07-11
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Stat value="34" label="E · GPT 5.5 · Review baseline" tone="info" />
        <Stat value="40" label="F · Kimi K2.7 · Winner" tone="success" />
      </Grid>

      <Callout tone="warning" title="Baseline ≠ winner">
        F won scoring, but Review G/H still reviewed Code E (fixed baseline
        rule). Fair “who reviews better,” not “who got the better code.”
      </Callout>

      <Callout tone="success" title="Winner: Slot F (Kimi K2.7)">
        Closer to RFC C: usage ledger, reserve/commit, PlanLimitExceeded on
        generate.
      </Callout>

      <Stack gap={12}>
        <H2>Dimension scores (1–10)</H2>
        <BarChart
          categories={["RFC fit", "Stack", "Correctness", "Edges", "Diff"]}
          series={[
            { name: "E · GPT 5.5", data: [6, 9, 6, 5, 8], tone: "info" },
            { name: "F · Kimi K2.7", data: [8, 9, 8, 8, 7], tone: "success" },
          ]}
          height={220}
          yMin={0}
          yMax={10}
        />
        <Text tone="tertiary" size="small">
          Source: scores/code.json · dimension means · out of 10
        </Text>
      </Stack>

      <Table
        headers={["Dimension", "E", "F"]}
        rows={DIM_ROWS.map((r) => [...r])}
        columnAlign={["left", "right", "right"]}
        rowTone={["info", "neutral", "info", "info", "neutral", "success"]}
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="info" size="sm">E</Pill>}>
            Essay — GPT 5.5
          </CardHeader>
          <CardBody>
            <Text size="small">
              Strong stack/UI entitlement surface; missing RFC C usage ledger
              reserve/commit. Quota often static (used: 0).
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm" active>F</Pill>}>
            Essay — Kimi K2.7
          </CardHeader>
          <CardBody>
            <Text size="small">
              Closer RFC C services + generate quota enforcement; thinner
              generate UI gates than E.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3>Hard evidence (not soft scores)</H3>
        <Text size="small">
          E tests: entitlement.test + shared billing.test PASS
        </Text>
        <Text size="small">
          F tests: billing-services + ai.generate-monetization PASS (6)
        </Text>
      </Stack>

      <Stack gap={8}>
        <H3>Slide takeaway</H3>
        <Text size="small">
          Biggest gaps: Edges (5 vs 8) and RFC fit (6 vs 8). E polished the
          read model/UI; F implemented enforcement closer to the RFC.
        </Text>
      </Stack>

      <Divider />
      <Text tone="tertiary" size="small">
        Tips: code-eval-model-e @ f57b11b · code-eval-model-f @ f566914
      </Text>
      <Spacer height={8} />
    </Stack>
  );
}
