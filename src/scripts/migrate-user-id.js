const mongoose = require('mongoose');

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Donation = require('../models/Donation');
const Event = require('../models/Event');
const Giving = require('../models/Giving');
const Notification = require('../models/Notification');
const PasswordResetToken = require('../models/PasswordResetToken');
const PrayerComment = require('../models/PrayerComment');
const PrayerRequest = require('../models/PrayerRequest');
const SyncItem = require('../models/SyncItem');

const scalarRefs = [
  { model: Attendance, field: 'userId' },
  { model: Donation, field: 'userId' },
  { model: Notification, field: 'userId' },
  { model: PrayerComment, field: 'userId' },
  { model: PrayerRequest, field: 'userId' },
  { model: SyncItem, field: 'userId' },
  { model: Giving, field: 'user' },
  { model: PasswordResetToken, field: 'user' },
];

const arrayRefs = [
  { model: Event, field: 'attendees' },
  { model: PrayerRequest, field: 'prayedBy' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noDb = args.includes('--no-db');
  const idArg = args.find((arg) => !arg.startsWith('--'));
  return { idArg, dryRun, noDb };
}

async function updateScalarRef({ model, field }, oldId, newId, dryRun) {
  const filter = { [field]: oldId };
  const matched = await model.countDocuments(filter);
  if (dryRun || matched === 0) {
    return { matched, modified: 0 };
  }

  const result = await model.updateMany(filter, { $set: { [field]: newId } });
  return { matched: result.matchedCount ?? matched, modified: result.modifiedCount ?? 0 };
}

async function updateArrayRef({ model, field }, oldId, newId, dryRun) {
  const filter = { [field]: oldId };
  const matched = await model.countDocuments(filter);
  if (dryRun || matched === 0) {
    return { matched, modified: 0 };
  }

  const result = await model.updateMany(
    filter,
    { $set: { [`${field}.$[elem]`]: newId } },
    { arrayFilters: [{ elem: oldId }] }
  );
  return { matched: result.matchedCount ?? matched, modified: result.modifiedCount ?? 0 };
}

async function run() {
  const { idArg, dryRun, noDb } = parseArgs();
  if (!idArg) {
    console.error('Usage: node src/scripts/migrate-user-id.js <stringObjectId> [--dry-run] [--no-db]');
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(idArg)) {
    console.error('Provided id is not a valid ObjectId string.');
    process.exit(1);
  }

  const oldId = idArg;
  const newId = new mongoose.Types.ObjectId(idArg);
  console.log(`ObjectId: ${newId.toString()}`);

  if (noDb) {
    console.log('No DB operations requested. Exiting.');
    return;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI or MONGODB_URI must be set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });

  const usersCollection = mongoose.connection.db.collection(User.collection.name);

  const existingObjectIdUser = await usersCollection.findOne({ _id: newId });
  const existingStringUser = await usersCollection.findOne({ _id: oldId });

  if (!existingStringUser && !existingObjectIdUser) {
    console.log('No user found with the provided id.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);

  if (!existingObjectIdUser && existingStringUser && !dryRun) {
    const { _id, ...rest } = existingStringUser;
    const newDoc = { ...rest, _id: newId };
    let deletedOldForInsert = false;

    try {
      await usersCollection.insertOne(newDoc);
      console.log('Inserted new user with ObjectId.');
    } catch (err) {
      if (err.code === 11000) {
        await usersCollection.deleteOne({ _id: oldId });
        deletedOldForInsert = true;
        await usersCollection.insertOne(newDoc);
        console.log('Replaced user after resolving duplicate key conflict.');
      } else {
        throw err;
      }
    }

    if (!deletedOldForInsert) {
      await usersCollection.deleteOne({ _id: oldId });
      console.log('Deleted old user with string _id.');
    }
  } else if (existingObjectIdUser && existingStringUser && !dryRun) {
    await usersCollection.deleteOne({ _id: oldId });
    console.log('Deleted old user with string _id (ObjectId version already existed).');
  }

  for (const ref of scalarRefs) {
    const result = await updateScalarRef(ref, oldId, newId, dryRun);
    if (result.matched > 0) {
      console.log(`${ref.model.collection.name}.${ref.field} matched ${result.matched}, modified ${result.modified}`);
    }
  }

  for (const ref of arrayRefs) {
    const result = await updateArrayRef(ref, oldId, newId, dryRun);
    if (result.matched > 0) {
      console.log(`${ref.model.collection.name}.${ref.field} matched ${result.matched}, modified ${result.modified}`);
    }
  }

  await mongoose.disconnect();
  console.log('Migration complete.');
}

run().catch((err) => {
  console.error(err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
