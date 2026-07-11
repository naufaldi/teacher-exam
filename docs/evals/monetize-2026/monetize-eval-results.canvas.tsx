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

const SLOT_ROWS = [
  ["A", "PRD", "GPT 5.5", "44", "Winner"],
  ["B", "PRD", "GLM 5.2", "43", ""],
  ["C", "RFC", "Opus 4.8", "46", "Winner"],
  ["D", "RFC", "Kimi K2.7", "40", ""],
  ["E", "Code", "GPT 5.5", "34", "Baseline only"],
  ["F", "Code", "Kimi K2.7", "40", "Winner"],
  ["G", "Review", "Opus 4.8", "45", "Winner"],
  ["H", "Review", "GLM 5.2", "44", ""],
] as const;

const PRD_ROWS = [
  ["Case fit", "9", "9"],
  ["Edges", "9", "9"],
  ["Pain", "9", "9"],
  ["Scope", "8", "7"],
  ["Acceptance", "9", "9"],
  ["Total", "44", "43"],
] as const;

const RFC_ROWS = [
  ["Fidelity", "9", "8"],
  ["Arch", "10", "8"],
  ["Edges", "9", "8"],
  ["Phasing", "9", "8"],
  ["Implementable", "9", "8"],
  ["Total", "46", "40"],
] as const;

const CODE_ROWS = [
  ["RFC fit", "6", "8"],
  ["Stack", "9", "9"],
  ["Correctness", "6", "8"],
  ["Edges", "5", "8"],
  ["Diff", "8", "7"],
  ["Total", "34", "40"],
] as const;

const REVIEW_ROWS = [
  ["Bugs", "9", "9"],
  ["Severity", "9", "9"],
  ["Grounding", "10", "9"],
  ["Actionable", "9", "9"],
  ["FP control", "8", "8"],
  ["Total", "45", "44"],
] as const;

const TAKEAWAYS = [
  "Opus 4.8 strong on RFC + Review (architecture + critique).",
  "GPT 5.5 strong on PRD; Code E polished UI/read model but incomplete vs RFC C.",
  "Kimi K2.7 weaker on RFC prose; stronger on Code fidelity to RFC C.",
  "GLM 5.2 competitive on PRD and Review; close seconds, not stage winners.",
  "Fixed baselines (A/C/E) mattered: Review judged incomplete E even though F won Code.",
] as const;

export default function MonetizeEvalResultsCanvas() {
  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <Pill size="sm" active>
          Slide 1 of 5 · Overview
        </Pill>
        <H1>Monetize eval results</H1>
        <Text tone="secondary">
          Free / Pro feature gates · teacher-exam · 2026-07-11 · research-only
        </Text>
        <Text tone="tertiary" size="small">
          Source: docs/evals/monetize-2026/scores/*.json · WRITEUP.md · 2026-07-11
        </Text>
        <Text size="small" tone="secondary">
          One-by-one: monetize-eval-prd · monetize-eval-rfc · monetize-eval-code ·
          monetize-eval-review
        </Text>
      </Stack>

      <Stack gap={12}>
        <H2>Headline winners</H2>
        <Grid columns={4} gap={12}>
          <Stat value="A 44" label="PRD · GPT 5.5" tone="success" />
          <Stat value="C 46" label="RFC · Opus 4.8" tone="success" />
          <Stat value="F 40" label="Code · Kimi K2.7" tone="success" />
          <Stat value="G 45" label="Review · Opus 4.8" tone="success" />
        </Grid>
      </Stack>

      <Callout tone="warning" title="Baseline rule (not winners)">
        Downstream stages always used PRD A → RFC C → Code E, even when F won
        Code scoring. Fair stage comparison by design.
      </Callout>

      <Stack gap={12}>
        <H2>Slot map</H2>
        <Table
          headers={["Slot", "Stage", "Model", "Total", "Role"]}
          rows={SLOT_ROWS.map((r) => [...r])}
          columnAlign={["left", "left", "left", "right", "left"]}
          rowTone={[
            "success",
            "neutral",
            "success",
            "neutral",
            "info",
            "success",
            "success",
            "neutral",
          ]}
        />
      </Stack>

      <Stack gap={12}>
        <H2>Stage totals (sum of 5×1–10)</H2>
        <BarChart
          categories={["PRD", "RFC", "Code", "Review"]}
          series={[
            {
              name: "First slot (A/C/E/G)",
              data: [44, 46, 34, 45],
              tone: "info",
            },
            {
              name: "Second slot (B/D/F/H)",
              data: [43, 40, 40, 44],
              tone: "neutral",
            },
          ]}
          height={220}
          yMin={0}
          yMax={50}
        />
        <Text tone="tertiary" size="small">
          Source: merged scores · totals out of 50 · 2026-07-11
        </Text>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>PRD — A vs B</H2>
        <RowPills winner="A · GPT 5.5" loser="B · GLM 5.2" />
        <Table
          headers={["Dimension", "A", "B"]}
          rows={PRD_ROWS.map((r) => [...r])}
          columnAlign={["left", "right", "right"]}
        />
        <Text size="small" tone="secondary">
          Takeaway: A tighter MVP scope; B stronger Indonesia payment/seam
          detail but heavier scope.
        </Text>
      </Stack>

      <Stack gap={12}>
        <H2>RFC — C vs D (baseline PRD A)</H2>
        <RowPills winner="C · Opus 4.8" loser="D · Kimi K2.7" />
        <Table
          headers={["Dimension", "C", "D"]}
          rows={RFC_ROWS.map((r) => [...r])}
          columnAlign={["left", "right", "right"]}
        />
        <Text size="small" tone="secondary">
          Takeaway: C deep monorepo fit + usage ledger; D capability-matrix /
          middleware reinterpretation.
        </Text>
      </Stack>

      <Stack gap={12}>
        <H2>Code — E vs F (baseline PRD A + RFC C)</H2>
        <RowPills winner="F · Kimi K2.7" loser="E · GPT 5.5 (review baseline)" />
        <Table
          headers={["Dimension", "E", "F"]}
          rows={CODE_ROWS.map((r) => [...r])}
          columnAlign={["left", "right", "right"]}
        />
        <Text size="small" tone="secondary">
          Takeaway: F closer to RFC C reserve/commit; E stronger generate UI
          entitlement surface, weaker real quota. Focused tests PASS both.
        </Text>
      </Stack>

      <Stack gap={12}>
        <H2>Review — G vs H (baseline Code E)</H2>
        <RowPills winner="G · Opus 4.8" loser="H · GLM 5.2" />
        <Table
          headers={["Dimension", "G", "H"]}
          rows={REVIEW_ROWS.map((r) => [...r])}
          columnAlign={["left", "right", "right"]}
        />
        <Text size="small" tone="secondary">
          Takeaway: Both agree Code E is solid M1 read model but not full MVP
          enforcement (no usage ledger / PLAN_LIMIT / sourceMode gate).
        </Text>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Cross-stage takeaways</H2>
        <Card>
          <CardHeader>What the eval showed</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">{TAKEAWAYS[0]}</Text>
              <Text size="small">{TAKEAWAYS[1]}</Text>
              <Text size="small">{TAKEAWAYS[2]}</Text>
              <Text size="small">{TAKEAWAYS[3]}</Text>
              <Text size="small">{TAKEAWAYS[4]}</Text>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={12}>
        <H2>Limitations</H2>
        <Stack gap={6}>
          <Text size="small">
            Judge was the ops agent (same family); swap-order used, not a
            separate vendor judge.
          </Text>
          <Text size="small">
            Full monorepo type-check not archived; focused tests only.
          </Text>
          <Text size="small">
            Transient working-tree route wipes during Code E / Review G —
            reverted; agent contamination risk.
          </Text>
          <Text size="small">Research-only — no merge to main.</Text>
        </Stack>
      </Stack>

      <Stack gap={12}>
        <H3>Where artifacts live (eval-ops)</H3>
        <Text
          size="small"
          style={{ fontFamily: "monospace" }}
          tone="secondary"
        >
          docs/evals/monetize-2026/WRITEUP.md · PRESENTATION.md · scores/*.json
          · artifacts/
        </Text>
      </Stack>

      <Spacer height={8} />
    </Stack>
  );
}

function RowPills({ winner, loser }: { winner: string; loser: string }) {
  return (
    <Stack gap={8}>
      <Pill tone="success" size="sm" active>
        {winner}
      </Pill>
      <Text size="small" tone="tertiary">
        vs {loser}
      </Text>
    </Stack>
  );
}
