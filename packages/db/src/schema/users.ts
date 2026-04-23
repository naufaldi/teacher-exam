import { pgTable, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core'
import { examSubjectEnum } from './enums'

export const user = pgTable('user', {
  id:               text('id').primaryKey(),
  name:             text('name').notNull(),
  email:            text('email').notNull().unique(),
  emailVerified:    boolean('email_verified').default(false).notNull(),
  image:            text('image'),

  username:         text('username').notNull().unique(),
  school:           text('school'),
  gradesTaught:     integer('grades_taught').array(),
  subjectsTaught:   examSubjectEnum('subjects_taught').array(),
  profileCompleted: boolean('profile_completed').default(false).notNull(),
  locale:           text('locale').default('id-ID').notNull(),
  timezone:         text('timezone').default('Asia/Jakarta').notNull(),
  lastLoginAt:      timestamp('last_login_at', { withTimezone: true }),

  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const session = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => [index('session_user_id_idx').on(t.userId)])

export const account = pgTable('account', {
  id:                    text('id').primaryKey(),
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  userId:                text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope:                 text('scope'),
  password:              text('password'),
  createdAt:             timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:             timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('account_user_id_idx').on(t.userId)])

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)])
