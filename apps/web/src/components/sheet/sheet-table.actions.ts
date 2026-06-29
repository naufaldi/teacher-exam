import { KOREKSI_DISABLED_TITLE, KOREKSI_ENABLED } from "../../lib/feature-flags.js"
import type { SheetActionDef, SheetActionId, SheetColumnId, SheetTableRow, SheetTableVariant } from "./sheet-table.types.js"

function getSheetColumns(variant: SheetTableVariant): ReadonlyArray<SheetColumnId> {
  switch (variant) {
    case "dashboard-recent":
      return ["lembar", "subject", "date", "status", "actions"]
    case "history":
      return ["lembar", "subject", "date", "soal", "status", "actions"]
    case "bank-mine":
      return ["lembar", "subject", "date", "soal", "visibility", "actions"]
    case "bank-public":
      return ["lembar", "subject", "date", "soal", "author", "actions"]
    default: {
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}

function showExamTypeInSubtitle(variant: SheetTableVariant): boolean {
  return variant !== "dashboard-recent"
}

function isDraft(row: SheetTableRow): boolean {
  return row.status === "draft"
}

function isFinal(row: SheetTableRow): boolean {
  return row.status === "final" || row.source === "bank"
}

function pushAction(actions: Array<SheetActionDef>, action: SheetActionDef | null): void {
  if (action) {
    actions.push(action)
  }
}

function getSheetActions(
  variant: SheetTableVariant,
  row: SheetTableRow,
  options?: { readOnly?: boolean }
): ReadonlyArray<SheetActionDef> {
  const readOnly = options?.readOnly ?? false
  const actions: Array<SheetActionDef> = []
  const draft = isDraft(row)
  const final = isFinal(row)

  if (variant === "bank-mine" || variant === "bank-public") {
    if (!readOnly) {
      pushAction(actions, {
        id: "use-sheet",
        placement: "primary",
        label: "Pakai lembar"
      })
    }
    pushAction(actions, {
      id: "preview",
      placement: "icon",
      label: "Pratinjau"
    })
    if (variant === "bank-mine" && row.visibility !== undefined) {
      pushAction(actions, {
        id: "toggle-public",
        placement: "overflow",
        label: row.visibility === "public" ? "Jadikan privat" : "Jadikan publik"
      })
    }
    return actions
  }

  if (draft) {
    pushAction(actions, {
      id: "edit",
      placement: "primary",
      label: "Edit"
    })
    pushAction(actions, {
      id: "duplicate",
      placement: variant === "dashboard-recent" ? "primary" : "icon",
      label: "Duplikat"
    })
    pushAction(actions, {
      id: "delete",
      placement: "overflow",
      label: "Hapus lembar"
    })
    return actions
  }

  if (final) {
    pushAction(actions, {
      id: "preview",
      placement: variant === "dashboard-recent" ? "icon" : "primary",
      label: variant === "history" ? "Preview" : "Pratinjau"
    })
    pushAction(actions, {
      id: "correction",
      placement: variant === "dashboard-recent" ? "primary" : "icon",
      label: "Koreksi",
      disabled: !KOREKSI_ENABLED,
      ...(KOREKSI_ENABLED ? {} : { disabledTitle: KOREKSI_DISABLED_TITLE })
    })
    if (variant === "history") {
      pushAction(actions, {
        id: "share",
        placement: "icon",
        label: "Bagikan"
      })
    }
    pushAction(actions, {
      id: "duplicate-overflow",
      placement: "overflow",
      label: "Duplikat sebagai draft"
    })
    pushAction(actions, {
      id: "delete",
      placement: "overflow",
      label: "Hapus lembar"
    })
  }

  return actions
}

function resolveTitleClickAction(row: SheetTableRow): SheetActionId {
  if (isDraft(row)) {
    return "edit"
  }
  return "preview"
}

export { getSheetActions, getSheetColumns, resolveTitleClickAction, showExamTypeInSubtitle }
