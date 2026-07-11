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
  ["Bugs", "9", "9"],
  ["Severity", "9", "9"],
  ["Grounding", "10", "9"],
  ["Actionable", "9", "9"],
  ["FP control", "8", "8"],
  ["Total", "45", "44"],
] as const;

export default function MonetizeEvalReviewCanvas() {
  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <Pill size="sm" active>
          Slide 5 of 5 · Review
        </Pill>
        <H1>Review — G vs H</H1>
        <Text tone="secondary">
          Same baseline: Code E (+ PRD A + RFC C) · blind judge · swap-order
          consistent
        </Text>
        <Text tone="tertiary" size="small">
          Source: scores/review.json · WRITEUP.md · 2026-07-11
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Stat value="45" label="G · Opus 4.8 · Winner" tone="success" />
        <Stat value="44" label="H · GLM 5.2" />
      </Grid>

      <Callout tone="info" title="Shared input">
        Both reviewed the same Code E tip (f57b11b) — not F’s winning
        implementation.
      </Callout>

      <Callout tone="success" title="Winner: Slot G (Opus 4.8)">
        Strongest on Spec grounding (10). Caught working-tree route wipe +
        missing quota ledger.
      </Callout>

      <Stack gap={12}>
        <H2>Dimension scores (1–10)</H2>
        <BarChart
          categories={[
            "Bugs",
            "Severity",
            "Grounding",
            "Actionable",
            "FP control",
          ]}
          series={[
            { name: "G · Opus 4.8", data: [9, 9, 10, 9, 8], tone: "success" },
            { name: "H · GLM 5.2", data: [9, 9, 9, 9, 8], tone: "neutral" },
          ]}
          height={220}
          yMin={0}
          yMax={10}
        />
        <Text tone="tertiary" size="small">
          Source: scores/review.json · dimension means · out of 10
        </Text>
      </Stack>

      <Table
        headers={["Dimension", "G", "H"]}
        rows={DIM_ROWS.map((r) => [...r])}
        columnAlign={["left", "right", "right"]}
        rowTone={["neutral", "neutral", "success", "neutral", "neutral", "success"]}
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm" active>G</Pill>}>
            Essay — Opus 4.8
          </CardHeader>
          <CardBody>
            <Text size="small">
              Caught WT route wipe + missing quota ledger; outstanding RFC phase
              grounding.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm">H</Pill>}>
            Essay — GLM 5.2
          </CardHeader>
          <CardBody>
            <Text size="small">
              Clean committed-code review of missing quota/sourceMode gates with
              concrete fixes.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3>Agreement</H3>
        <Text size="small">
          Both: Code E is solid M1 read model but not full MVP enforcement (no
          usage ledger / PLAN_LIMIT / sourceMode gate).
        </Text>
      </Stack>

      <Stack gap={8}>
        <H3>Slide takeaway</H3>
        <Text size="small">
          Closest race of the eval (45 vs 44). Grounding was the only dimension
          that separated them.
        </Text>
      </Stack>

      <Divider />
      <Text tone="tertiary" size="small">
        Artifacts: review-eval-model-g @ 73a126c · review-eval-model-h @
        8b2c37e · artifacts/review-g.md · review-h.md
      </Text>
      <Spacer height={8} />
    </Stack>
  );
}
