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
  ["Case fit", "9", "9"],
  ["Edges", "9", "9"],
  ["Pain", "9", "9"],
  ["Scope", "8", "7"],
  ["Acceptance", "9", "9"],
  ["Total", "44", "43"],
] as const;

export default function MonetizeEvalPrdCanvas() {
  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <Pill size="sm" active>
          Slide 2 of 5 · PRD
        </Pill>
        <H1>PRD — A vs B</H1>
        <Text tone="secondary">
          Free / Pro monetize PRD · blind judge · swap-order consistent
        </Text>
        <Text tone="tertiary" size="small">
          Source: scores/prd.json · WRITEUP.md · 2026-07-11
        </Text>
      </Stack>

      <Grid columns={2} gap={12}>
        <Stat value="44" label="A · GPT 5.5 · Winner" tone="success" />
        <Stat value="43" label="B · GLM 5.2" />
      </Grid>

      <Callout tone="success" title="Winner: Slot A (GPT 5.5)">
        Promoted as shared baseline for all RFC+ stages (always A, not “whoever
        won” — here A also won).
      </Callout>

      <Stack gap={12}>
        <H2>Dimension scores (1–10)</H2>
        <BarChart
          categories={["Case fit", "Edges", "Pain", "Scope", "Acceptance"]}
          series={[
            { name: "A · GPT 5.5", data: [9, 9, 9, 8, 9], tone: "success" },
            { name: "B · GLM 5.2", data: [9, 9, 9, 7, 9], tone: "neutral" },
          ]}
          height={220}
          yMin={0}
          yMax={10}
        />
        <Text tone="tertiary" size="small">
          Source: scores/prd.json · dimension means · out of 10
        </Text>
      </Stack>

      <Table
        headers={["Dimension", "A", "B"]}
        rows={DIM_ROWS.map((r) => [...r])}
        columnAlign={["left", "right", "right"]}
        rowTone={["neutral", "neutral", "neutral", "info", "neutral", "success"]}
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm" active>A</Pill>}>
            Essay — GPT 5.5
          </CardHeader>
          <CardBody>
            <Text size="small">
              Excellent product-fit PRD with clear pain, strong edge cases
              (quota reservation, async, grace), and testable DoD. Slightly
              tighter MVP scope than B.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm">B</Pill>}>
            Essay — GLM 5.2
          </CardHeader>
          <CardBody>
            <Text size="small">
              Strong Indonesia-native monetize PRD with QRIS/VA, school-year
              pricing, seam mapping, and thorough AC/edge tables. Slightly
              heavier MVP scope (trial + many gates).
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3>Slide takeaway</H3>
        <Text size="small">
          Margin was Scope (8 vs 7). Both strong on fit, edges, pain, and
          acceptance. A wins on MVP realism.
        </Text>
      </Stack>

      <Divider />
      <Text tone="tertiary" size="small">
        Artifacts: prd-eval-model-a @ 34d903f · prd-eval-model-b @ 22393f7 ·
        artifacts/prd-a.md · prd-b.md
      </Text>
      <Spacer height={8} />
    </Stack>
  );
}
