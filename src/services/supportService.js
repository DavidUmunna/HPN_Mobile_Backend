const SupportDirectory = require('../models/SupportDirectory');

const DEFAULT_KEY = 'default';

function toSupportDepartment(department = {}) {
  return {
    name: department.name || '',
    phone: department.phone || '',
    description: department.description || '',
  };
}

function toSupportDirectory(directory) {
  return {
    churchName: directory.churchName || 'His Presence Newcastle',
    mainPhone: directory.mainPhone || '',
    email: directory.email || '',
    address: directory.address || '',
    departments: Array.isArray(directory.departments)
      ? directory.departments.map(toSupportDepartment)
      : [],
    updatedAt: directory.updatedAt,
  };
}

async function getOrCreateSupportDirectory() {
  let directory = await SupportDirectory.findOne({ key: DEFAULT_KEY });
  if (!directory) {
    directory = await SupportDirectory.create({ key: DEFAULT_KEY });
  }
  return directory;
}

async function getSupportDirectory() {
  const directory = await getOrCreateSupportDirectory();
  return toSupportDirectory(directory);
}

async function updateSupportDirectory(payload = {}) {
  const directory = await getOrCreateSupportDirectory();
  directory.churchName = payload.churchName?.trim?.() || directory.churchName;
  directory.mainPhone = payload.mainPhone?.trim?.() || '';
  directory.email = payload.email?.trim?.() || '';
  directory.address = payload.address?.trim?.() || '';
  directory.departments = Array.isArray(payload.departments)
    ? payload.departments.map((department) => ({
        name: department.name.trim(),
        phone: department.phone.trim(),
        description: department.description?.trim?.() || '',
      }))
    : [];

  await directory.save();
  return toSupportDirectory(directory);
}

module.exports = {
  getSupportDirectory,
  updateSupportDirectory,
};