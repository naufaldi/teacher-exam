import { Schema } from "effect"

export const DeleteAccountInputSchema = Schema.Struct({
  confirm: Schema.Literal("HAPUS")
})
export type DeleteAccountInput = typeof DeleteAccountInputSchema.Type

export const DeleteAccountResultSchema = Schema.Struct({
  deleted: Schema.Literal(true)
})
export type DeleteAccountResult = typeof DeleteAccountResultSchema.Type
