import {
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
  Row,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

const STAGE_ROWS = [
  ["PRD", "A vs B", "theme brief + context pack", "PRD A*, PRD B"],
  ["RFC", "C vs D", "shared PRD A only", "RFC C*, RFC D"],
  ["Code", "E vs F", "PRD A + RFC C", "real commits E*, F"],
  ["Review", "G vs H", "PRD A + RFC C + code E", "reviews G, H"],
] as const;

function PipelineDag() {
  const theme = useHostTheme();
  const nodeW = 132;
  const nodeH = 52;

  const layout = computeDAGLayout({
    nodes: [
      { id: "prdSetup" },
      { id: "prdA" },
      { id: "prdB" },
      { id: "rfcSetup" },
      { id: "rfcC" },
      { id: "rfcD" },
      { id: "codeSetup" },
      { id: "codeE" },
      { id: "codeF" },
      { id: "reviewSetup" },
      { id: "reviewG" },
      { id: "reviewH" },
      { id: "ops" },
    ],
    edges: [
      { from: "prdSetup", to: "prdA" },
      { from: "prdSetup", to: "prdB" },
      { from: "prdA", to: "rfcSetup" },
      { from: "rfcSetup", to: "rfcC" },
      { from: "rfcSetup", to: "rfcD" },
      { from: "rfcC", to: "codeSetup" },
      { from: "codeSetup", to: "codeE" },
      { from: "codeSetup", to: "codeF" },
      { from: "codeE", to: "reviewSetup" },
      { from: "reviewSetup", to: "reviewG" },
      { from: "reviewSetup", to: "reviewH" },
      { from: "prdA", to: "ops" },
      { from: "prdB", to: "ops" },
      { from: "rfcC", to: "ops" },
      { from: "rfcD", to: "ops" },
      { from: "codeE", to: "ops" },
      { from: "codeF", to: "ops" },
      { from: "reviewG", to: "ops" },
      { from: "reviewH", to: "ops" },
    ],
    direction: "vertical",
    nodeWidth: nodeW,
    nodeHeight: nodeH,
    rankGap: 56,
    nodeGap: 28,
    padding: 16,
  });

  const labels: Record<
    string,
    { line1: string; line2: string; kind: "setup" | "result" | "ops" }
  > = {
    prdSetup: { line1: "prd-eval", line2: "setup", kind: "setup" },
    prdA: { line1: "model-a", line2: "PRD A*", kind: "result" },
    prdB: { line1: "model-b", line2: "PRD B", kind: "result" },
    rfcSetup: { line1: "rfc-eval", line2: "PRD A in", kind: "setup" },
    rfcC: { line1: "model-c", line2: "RFC C*", kind: "result" },
    rfcD: { line1: "model-d", line2: "RFC D", kind: "result" },
    codeSetup: { line1: "code-eval", line2: "A+C in", kind: "setup" },
    codeE: { line1: "model-e", line2: "code E*", kind: "result" },
    codeF: { line1: "model-f", line2: "code F", kind: "result" },
    reviewSetup: { line1: "review-eval", line2: "E in", kind: "setup" },
    reviewG: { line1: "model-g", line2: "review G", kind: "result" },
    reviewH: { line1: "model-h", line2: "review H", kind: "result" },
    ops: { line1: "eval-ops", line2: "judge + writeup", kind: "ops" },
  };

  const fillFor = (kind: "setup" | "result" | "ops") => {
    if (kind === "ops") return theme.accent.primary;
    if (kind === "setup") return theme.fill.secondary;
    return theme.fill.tertiary;
  };

  const textFor = (kind: "setup" | "result" | "ops") => {
    if (kind === "ops") return theme.text.onAccent;
    return theme.text.primary;
  };

  return (
    <Stack gap={12}>
      <Row gap={12} align="center" wrap>
        <Pill size="sm">setup branch</Pill>
        <Pill tone="info" size="sm">
          result branch
        </Pill>
        <Pill tone="warning" size="sm" active>
          eval-ops (hidden)
        </Pill>
        <Text tone="secondary" size="small">
          * = shared baseline for next stage
        </Text>
      </Row>
      <svg
        width="100%"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ maxWidth: layout.width, display: "block" }}
      >
        {layout.edges.map((e, i) => (
          <line
            key={`${e.from}-${e.to}-${i}`}
            x1={e.sourceX}
            y1={e.sourceY}
            x2={e.targetX}
            y2={e.targetY}
            stroke={
              e.to === "ops" ? theme.stroke.tertiary : theme.stroke.secondary
            }
            strokeWidth={e.to === "ops" ? 1 : 1.5}
            strokeDasharray={e.to === "ops" ? "4 3" : undefined}
          />
        ))}
        {layout.nodes.map((n) => {
          const meta = labels[n.id]!;
          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width={nodeW}
                height={nodeH}
                rx={6}
                fill={fillFor(meta.kind)}
                stroke={theme.stroke.primary}
                strokeWidth={1}
              />
              <text
                x={nodeW / 2}
                y={20}
                textAnchor="middle"
                fill={textFor(meta.kind)}
                fontSize={11}
                fontWeight={600}
              >
                {meta.line1}
              </text>
              <text
                x={nodeW / 2}
                y={38}
                textAnchor="middle"
                fill={textFor(meta.kind)}
                fontSize={10}
                opacity={0.85}
              >
                {meta.line2}
              </text>
            </g>
          );
        })}
      </svg>
      <Text tone="tertiary" size="small">
        Source: Monetize Stage-Pair Model Eval plan · solid = generation chain ·
        dashed = score copy into eval-ops
      </Text>
    </Stack>
  );
}

function IsolationPanel() {
  return (
    <Grid columns={2} gap={16}>
      <Card>
        <CardHeader trailing={<Pill tone="success" size="sm">models A–H</Pill>}>
          Generator-visible
        </CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text size="small">theme-brief.md</Text>
            <Text size="small">context-pack.md (allowlist)</Text>
            <Text size="small">prompts/&lt;active-stage&gt;.md only</Text>
            <Text size="small">baselines/ for this stage only</Text>
            <Text size="small">product files on allowlist</Text>
            <Divider />
            <Text tone="secondary" size="small">
              Fresh worktree + fresh chat per candidate. Pre-run: no rubrics,
              judge, scores, or rival artifacts.
            </Text>
          </Stack>
        </CardBody>
      </Card>
      <Card>
        <CardHeader trailing={<Pill tone="warning" size="sm" active>hidden</Pill>}>
          Operator-only (eval-ops)
        </CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text size="small">rubrics/ (5 dims + essay)</Text>
            <Text size="small">judge/ + scorecards</Text>
            <Text size="small">EVAL-PLAN.md (scoring contract)</Text>
            <Text size="small">scores/ + rival artifacts</Text>
            <Text size="small">WRITEUP.md</Text>
            <Divider />
            <Text tone="secondary" size="small">
              Blind judge: Candidate X/Y, swap order twice. Never paste into
              generator chats.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Grid>
  );
}

export default function MonetizeModelEvalCanvas() {
  const theme = useHostTheme();

  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <H1>Monetize model eval</H1>
        <Text tone="secondary">
          Free / Pro subscription theme · research writeup only · stage-specialized
          model pairs · shared baselines for fair scoring
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="4" label="Stages" />
        <Stat value="8" label="Models A–H" />
        <Stat value="5+1" label="Scores + essay" />
        <Stat value="Blind" label="LLM judge" tone="info" />
      </Grid>

      <Callout tone="warning" title="Isolation rule">
        Generators must not see rubrics, judge prompts, scores, writeup, or rival
        outputs. Only intentional baselines (PRD A → RFC; PRD A+RFC C → Code;
        +code E → Review) are shared.
      </Callout>

      <Stack gap={12}>
        <H2>Pipeline and branches</H2>
        <PipelineDag />
      </Stack>

      <Stack gap={12}>
        <H2>What each stage sees</H2>
        <Table
          headers={["Stage", "Pair", "Shared baseline", "Output"]}
          rows={STAGE_ROWS.map((r) => [...r])}
          rowTone={["neutral", "neutral", "info", "neutral"]}
          columnAlign={["left", "left", "left", "left"]}
        />
        <Text tone="tertiary" size="small">
          * becomes the fixed baseline for the next stage (always A / C / E —
          not the stage winner).
        </Text>
      </Stack>

      <Stack gap={12}>
        <H2>Visibility split</H2>
        <IsolationPanel />
      </Stack>

      <Stack gap={12}>
        <H2>Score shape (every artifact)</H2>
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader>Five 1–10 dimensions</CardHeader>
            <CardBody>
              <Stack gap={6}>
                <Text size="small">
                  PRD: case fit · edges · pain · scope · acceptance
                </Text>
                <Text size="small">
                  RFC: fidelity · arch · edges · phasing · implementable
                </Text>
                <Text size="small">
                  Code: RFC fit · stack · correctness · edges · diff
                </Text>
                <Text size="small">
                  Review: bugs · severity · grounding · fixes · FP control
                </Text>
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Essay</CardHeader>
            <CardBody>
              <Text size="small">
                Blind opinion: is this artifact good or bad, and why — no model
                names. Plus hard evidence for Code: type-check / tests pass or
                fail (recorded, not a sixth soft score).
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={12}>
        <H2>How to run (checkout → prompt → promote)</H2>
        <Callout tone="info" title="A vs B identity">
          Slot = branch + filename. prd-eval-model-a → artifacts/prd-a.md is
          always A (baseline). model-b → prd-b.md is always B. Winner never
          becomes A.
        </Callout>
        <Callout tone="success" title="Your loop (PRD example)">
          Ops chat: “Start PRD” → on model-a · you paste 01-prd in Model A chat
          · “PRD A done. Continue to B” → ops commits A, checks out model-b ·
          you paste same prompt in Model B · “A and B done. Continue” → ops
          scores, promotes A, hands rfc-eval-model-c + 02-rfc.md
        </Callout>
        <Callout tone="info" title="Per candidate">
          Checkout result branch · new chat · paste one prompt file · commit ·
          never open eval-ops in that chat
        </Callout>
        <Callout tone="warning" title="Ops / judge agents">
          On eval-ops, load EVAL-PLAN.md first (locked contract), then the stage
          rubric + judge prompt. Never copy EVAL-PLAN.md onto generator branches.
          Human can say “PRD A and B done. Continue.” — agent promotes + hands
          next prompt paths.
        </Callout>
        <Table
          headers={["You say", "Ops agent does", "You paste next"]}
          rows={[
            [
              "PRD A/B done. Continue.",
              "Score PRD → promote PRD A → rfc-eval",
              "02-rfc.md on model-c / model-d",
            ],
            [
              "RFC C/D done. Continue.",
              "Score RFC → promote A+C → code-eval",
              "03-code.md on model-e / model-f",
            ],
            [
              "Code E/F done. Continue.",
              "Score Code → review-eval from E",
              "04-review.md on model-g / model-h",
            ],
            [
              "Reviews done. Continue.",
              "Score Review → WRITEUP",
              "(ops only)",
            ],
            [
              "Where are we?",
              "Show progress checklist",
              "—",
            ],
          ]}
          columnAlign={["left", "left", "left"]}
        />
        <Table
          headers={["Run", "Checkout", "Paste", "Then promote"]}
          rows={[
            [
              "PRD A / B",
              "prd-eval-model-a|b",
              "prompts/01-prd.md",
              "PRD A → rfc-eval baselines",
            ],
            [
              "RFC C / D",
              "rfc-eval-model-c|d",
              "prompts/02-rfc.md",
              "RFC C → code-eval baselines",
            ],
            [
              "Code E / F",
              "code-eval-model-e|f",
              "prompts/03-code.md",
              "code E branch → review-eval",
            ],
            [
              "Review G / H",
              "review-eval-model-g|h",
              "prompts/04-review.md",
              "scores → eval-ops WRITEUP",
            ],
            [
              "Judge",
              "eval-ops",
              "EVAL-PLAN + judge + rubric + X/Y",
              "scores/<stage>.json",
            ],
          ]}
          columnAlign={["left", "left", "left", "left"]}
        />
        <H3>Promote always fixed baselines</H3>
        <Text size="small" tone="secondary">
          RFC setup gets PRD A (not winner). Code setup gets PRD A + RFC C. Review
          setup is based on code-eval-model-e tip. Score every stage on eval-ops
          in a separate chat.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H3>Home in repo</H3>
        <Text
          size="small"
          style={{ fontFamily: "monospace", color: theme.text.secondary }}
        >
          docs/evals/monetize-2026/ · full kit on eval-ops · subset on stage
          branches
        </Text>
      </Stack>

      <Spacer height={8} />
    </Stack>
  );
}
