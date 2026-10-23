#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/884265e98dec2a8172f99eb00b977cd226b4d282d2c5bb3c616c61e06178de8a/contract';
import endContract from '../../snapshots/884265e98dec2a8172f99eb00b977cd226b4d282d2c5bb3c616c61e06178de8a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'InvState',
        members: ['PENDING', 'ACCEPTED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ResumeState',
        members: ['PENDING', 'FAILED', 'PROCESSED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'Role',
        members: ['HR', 'VIEWER', 'ADMIN'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'State',
        members: ['PENDING', 'IN_PROGRESS', 'COMPELETED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Interview',
        columns: [
          col('InterviewLink', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('aiSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('candidateEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('candidateId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('compName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdBy', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('skills', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', '"State"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'State' } },
          }),
          col('tenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('videoLink', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Interview_skills_elem_not_null_79c19a4f',
            'array_position("skills", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Membership',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"Role"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Role' } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Message',
        columns: [
          col('assistMsg', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('intervLink', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('interviewId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('senderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('userMsg', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrgInvitation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdBy', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"Role"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Role' } },
          }),
          col('status', '"InvState"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'InvState' } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Organization',
        columns: [
          col('adminId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Report',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('interviewId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Resume',
        columns: [
          col('fileKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('skills', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('status', '"ResumeState"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ResumeState' } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Resume_skills_elem_not_null_79c19a4f',
            'array_position("skills", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currentTenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('refreshToken', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SubOrg',
        columns: [
          col('adminId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orgId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Interview',
        constraint: 'Interview_InterviewLink_key',
        columns: ['InterviewLink'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Membership',
        constraint: 'Membership_userId_organizationId_key',
        columns: ['userId', 'organizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'OrgInvitation',
        constraint: 'OrgInvitation_email_organizationId_key',
        columns: ['email', 'organizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Report',
        constraint: 'Report_interviewId_key',
        columns: ['interviewId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Interview',
        index: 'Interview_candidateId_idx_462b5869',
        columns: ['candidateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Interview',
        index: 'Interview_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Interview',
        index: 'Interview_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Membership',
        index: 'Membership_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Membership',
        index: 'Membership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_intervLink_idx_eccfa3d6',
        columns: ['intervLink'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_interviewId_idx_766b64f2',
        columns: ['interviewId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrgInvitation',
        index: 'OrgInvitation_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrgInvitation',
        index: 'OrgInvitation_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Organization',
        index: 'Organization_adminId_idx_530179db',
        columns: ['adminId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resume',
        index: 'Resume_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_currentTenantId_idx_21ead34c',
        columns: ['currentTenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SubOrg',
        index: 'SubOrg_adminId_idx_530179db',
        columns: ['adminId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SubOrg',
        index: 'SubOrg_orgId_idx_c5e5aabe',
        columns: ['orgId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Interview',
        foreignKey: {
          name: 'Interview_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Interview',
        foreignKey: {
          name: 'Interview_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Interview',
        foreignKey: {
          name: 'Interview_candidateId_fkey',
          columns: ['candidateId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Membership',
        foreignKey: {
          name: 'Membership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Membership',
        foreignKey: {
          name: 'Membership_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_intervLink_fkey',
          columns: ['intervLink'],
          references: { schema: 'public', table: 'Interview', columns: ['InterviewLink'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_interviewId_fkey',
          columns: ['interviewId'],
          references: { schema: 'public', table: 'Interview', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrgInvitation',
        foreignKey: {
          name: 'OrgInvitation_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrgInvitation',
        foreignKey: {
          name: 'OrgInvitation_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Organization',
        foreignKey: {
          name: 'Organization_adminId_fkey',
          columns: ['adminId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Report',
        foreignKey: {
          name: 'Report_interviewId_fkey',
          columns: ['interviewId'],
          references: { schema: 'public', table: 'Interview', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Resume',
        foreignKey: {
          name: 'Resume_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_currentTenantId_fkey',
          columns: ['currentTenantId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SubOrg',
        foreignKey: {
          name: 'SubOrg_adminId_fkey',
          columns: ['adminId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SubOrg',
        foreignKey: {
          name: 'SubOrg_orgId_fkey',
          columns: ['orgId'],
          references: { schema: 'public', table: 'Organization', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
