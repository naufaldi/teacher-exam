import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  BulkCreateStudentsInputSchema,
  ClassSchema,
  ClassWithStudentsSchema,
  CreateClassInputSchema,
  ListClassesUrlParamsSchema,
  StudentSchema,
  UpdateClassInputSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiNotFound } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)
const studentIdParam = HttpApiSchema.param("studentId", Schema.String)

export const ClassesGroup = HttpApiGroup.make("classes")
  .add(
    HttpApiEndpoint.get("listClasses", "/classes")
      .setUrlParams(ListClassesUrlParamsSchema)
      .addSuccess(Schema.Array(Schema.Union(ClassWithStudentsSchema, ClassSchema)))
  )
  .add(
    HttpApiEndpoint.post("createClass", "/classes")
      .setPayload(CreateClassInputSchema)
      .addSuccess(ClassSchema, { status: 201 })
  )
  .add(
    HttpApiEndpoint.patch("updateClass")`/classes/${idParam}`
      .setPayload(UpdateClassInputSchema)
      .addSuccess(ClassSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.del("deleteClass")`/classes/${idParam}`
      .addSuccess(Schema.Void)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("listStudents")`/classes/${idParam}/students`
      .addSuccess(Schema.Array(StudentSchema))
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("bulkCreateStudents")`/classes/${idParam}/students`
      .setPayload(BulkCreateStudentsInputSchema)
      .addSuccess(Schema.Array(StudentSchema), { status: 201 })
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.del("removeStudent")`/classes/${idParam}/students/${studentIdParam}`
      .addSuccess(Schema.Void)
      .addError(ApiNotFound, { status: 404 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
