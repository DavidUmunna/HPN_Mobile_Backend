#!/usr/bin/env node

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const mongoose = require('mongoose');

const { connectMongo } = require('../src/config/database');
const { signup } = require('../src/services/authService');

const rowSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().allow('').optional(),
  role: Joi.string().valid('member', 'staff', 'admin').default('member'),
}).required();

function printUsage() {
  console.log(`
Bulk user registration

Usage:
  npm run bulk:users -- --file ./data/users.json
  npm run bulk:users -- --file ./data/users.csv --default-password ChangeMe123 --skip-existing
  npm run bulk:users -- --file ./data/users.csv --dry-run

Supported formats:
  JSON: array of objects with keys name,email,password,phone,role
  CSV:  header row with columns name,email,password,phone,role

Options:
  --file <path>              Required. Absolute or relative path to the import file.
  --default-password <text>  Used when a row has no password.
  --default-role <role>      member | staff | admin. Defaults to member.
  --skip-existing            Skip rows whose email already exists.
  --dry-run                  Validate and preview only. Do not create users.
  --help                     Show this message.
`);
}

function parseArgs(argv) {
  const args = {
    file: null,
    defaultPassword: null,
    defaultRole: 'member',
    skipExisting: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--file') {
      args.file = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (value === '--default-password') {
      args.defaultPassword = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (value === '--default-role') {
      args.defaultRole = argv[index + 1] || 'member';
      index += 1;
      continue;
    }

    if (value === '--skip-existing') {
      args.skipExisting = true;
      continue;
    }

    if (value === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (value === '--help' || value === '-h') {
      args.help = true;
    }
  }

  return args;
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseJson(content) {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON import file must contain an array of user objects.');
  }
  return parsed;
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

function loadRows(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const extension = path.extname(resolvedPath).toLowerCase();
  const content = fs.readFileSync(resolvedPath, 'utf8');

  if (extension === '.json') {
    return { resolvedPath, rows: parseJson(content) };
  }

  if (extension === '.csv') {
    return { resolvedPath, rows: parseCsv(content) };
  }

  throw new Error('Unsupported import file. Use .json or .csv.');
}

function normalizeRow(rawRow, defaults) {
  return {
    name: typeof rawRow.name === 'string' ? rawRow.name.trim() : rawRow.name,
    email: typeof rawRow.email === 'string' ? rawRow.email.trim().toLowerCase() : rawRow.email,
    password:
      typeof rawRow.password === 'string' && rawRow.password.trim().length > 0
        ? rawRow.password.trim()
        : defaults.defaultPassword,
    phone: typeof rawRow.phone === 'string' ? rawRow.phone.trim() : rawRow.phone,
    role:
      typeof rawRow.role === 'string' && rawRow.role.trim().length > 0
        ? rawRow.role.trim().toLowerCase()
        : defaults.defaultRole,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const roleValidation = rowSchema.extract('role');
  const { error: roleError } = roleValidation.validate(args.defaultRole);
  if (roleError) {
    throw new Error(`Invalid --default-role value: ${args.defaultRole}`);
  }

  const { resolvedPath, rows } = loadRows(args.file);
  console.log(`Loaded ${rows.length} row(s) from ${resolvedPath}`);

  await connectMongo();

  const results = {
    created: 0,
    skipped: 0,
    failed: 0,
    validated: 0,
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const candidate = normalizeRow(rows[index], args);
    const { value, error } = rowSchema.validate(candidate, { abortEarly: false, stripUnknown: true });

    if (error) {
      results.failed += 1;
      console.error(`Row ${rowNumber} failed validation: ${error.message}`);
      continue;
    }

    if (args.dryRun) {
      console.log(`[dry-run] row ${rowNumber}: would create ${value.email} (${value.role})`);
      results.validated += 1;
      continue;
    }

    try {
      await signup(value);
      results.created += 1;
      console.log(`Created user ${value.email} (${value.role})`);
    } catch (error) {
      if (args.skipExisting && error && error.message === 'Email already registered') {
        results.skipped += 1;
        console.log(`Skipped existing user ${value.email}`);
        continue;
      }

      results.failed += 1;
      console.error(`Failed to create ${value.email}: ${error.message}`);
    }
  }

  console.log('');
  console.log('Bulk registration summary');
  if (args.dryRun) {
    console.log(`Validated: ${results.validated}`);
  } else {
    console.log(`Created: ${results.created}`);
  }
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });