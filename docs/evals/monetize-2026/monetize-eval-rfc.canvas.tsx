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
  ["Fidelity", "9", "8"],
  ["Arch", "10", "8"],
  ["Edges", "9", "8"],
  ["Phasing", "9", "8"],
  ["Implementable", "9", "8"],
  ["Total", "46", "40"],
] as const;

export default function MonetizeEvalRfcCanvas() {
  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <Pill size="sm" active>
          Slide 3 of 5 · RFC
        </Pill>
        <H1>RFC — C vs D</H1>
        <Text tone="secondary">
          Same baseline: PRD A · blind judge · swap-order consistent
        </Text>
        <Text tone="tertiary" size="small">
          Source: scores/rfc.json · WRITEUP.md · 2026-07-11
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Stat value="46" label="C · Opus 4.8 · Winner" tone="success" />
        <Stat value="40" label="D · Kimi K2.7" />
      </Grid>

      <Callout tone="info" title="Shared input">
        Both models wrote RFCs from the same PRD A baseline — scores measure RFC
        skill, not who got the luckier PRD.
      </Callout>

      <Callout tone="success" title="Winner: Slot C (Opus 4.8)">
        Promoted as shared RFC baseline for Code E/F (always C).
      </Callout>

      <Stack gap={12}>
        <H2>Dimension scores (1–10)</H2>
        <BarChart
          categories={[
            "Fidelity",
            "Arch",
            "Edges",
            "Phasing",
            "Implementable",
          ]}
          series={[
            { name: "C · Opus 4.8", data: [9, 10, 9, 9, 9], tone: "success" },
            { name: "D · Kimi K2.7", data: [8, 8, 8, 8, 8], tone: "neutral" },
          ]}
          height={220}
          yMin={0}
          yMax={10}
        />
        <Text tone="tertiary" size="small">
          Source: scores/rfc.json · dimension means · out of 10
        </Text>
      </Stack>

      <Table
        headers={["Dimension", "C", "D"]}
        rows={DIM_ROWS.map((r) => [...r])}
        columnAlign={["left", "right", "right"]}
        rowTone={["neutral", "success", "neutral", "neutral", "neutral", "success"]}
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm" active>C</Pill>}>
            Essay — Opus 4.8
          </CardHeader>
          <CardBody>
            <Text size="small">
              PRD-faithful entitlement + usage ledger with deep monorepo fit and
              clear MVP phases.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm">D</Pill>}>
            Essay — Kimi K2.7
          </CardHeader>
          <CardBody>
            <Text size="small">
              Capability-matrix + middleware design; good but more
              reinterpretation and thinner async quota detail.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3>Slide takeaway</H3>
        <Text size="small">
          Clearest gap on Architecture (10 vs 8). C stayed closer to Effect /
          Drizzle / AppLayer seams and reserve/commit/release.
        </Text>
      </Stack>

      <Divider />
      <Text tone="tertiary" size="small">
        Artifacts: rfc-eval-model-c @ 48c740a · rfc-eval-model-d @ 25f3c84 ·
        artifacts/rfc-c.md · rfc-d.md
      </Text>
      <Spacer height={8} />
    </Stack>
  );
}
