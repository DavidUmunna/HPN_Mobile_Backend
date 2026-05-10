const mongoose = require('mongoose');
const {
  listPrayers,
  createPrayer,
  findPrayerById,
  updatePrayer,
  incrementPrayerComments,
} = require('../repositories/prayerRepository');
const {
  listPrayerComments,
  createPrayerComment,
  findPrayerCommentById,
  deletePrayerCommentById,
} = require('../repositories/prayerCommentRepository');
const { findById, findByIds } = require('../repositories/userRepository');
const { AppError } = require('../utils/errors');

function toPrayerResponse(prayer, userId) {
  const prayedBy = prayer.prayedBy || [];
  const isPraying = userId ? prayedBy.some((id) => id.toString() === userId.toString()) : false;
  return {
    id: prayer._id.toString(),
    authorName: prayer.authorName,
    request: prayer.request,
    category: prayer.category,
    prayersCount: prayedBy.length,
    commentsCount: prayer.commentsCount || 0,
    isPraying,
    createdAt: prayer.createdAt,
  };
}

function toCommentResponse(comment, currentUserId) {
  return {
    id: comment._id.toString(),
    prayerId: comment.prayerId.toString(),
    authorName: comment.authorName || 'Anonymous',
    body: comment.body,
    createdAt: comment.createdAt,
    isAuthor: currentUserId ? comment.userId.toString() === currentUserId.toString() : false,
  };
}

async function getPrayers({ userId, category }) {
  const items = await listPrayers({ category });
  return items.map((item) => toPrayerResponse(item, userId));
}

async function addPrayer({ userId, request, category, authorName }) {
  const prayer = await createPrayer({
    userId,
    request,
    category: category || 'General',
    authorName,
    prayedBy: [],
  });
  return toPrayerResponse(prayer, userId);
}

async function togglePray({ prayerId, userId }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const prayedBy = (prayer.prayedBy || []).map((id) => id.toString());
  const alreadyPraying = prayedBy.includes(userId.toString());
  let status = 'praying';
  let updatedList;

  if (alreadyPraying) {
    status = 'not-praying';
    updatedList = prayedBy.filter((id) => id !== userId.toString());
  } else {
    updatedList = [...prayedBy, userId.toString()];
  }

  const updated = await updatePrayer(prayerId, {
    prayedBy: updatedList.map((id) => new mongoose.Types.ObjectId(id)),
  });

  return { prayer: toPrayerResponse(updated, userId), status };
}

async function listComments({ prayerId, userId, limit = 20, offset = 0 }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const comments = await listPrayerComments(prayerId, { limit, offset });
  return comments.map((comment) => toCommentResponse(comment, userId));
}

async function addComment({ prayerId, userId, body }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const user = await findById(userId);
  const authorName = user?.name || prayer.authorName || 'Anonymous';

  const created = await createPrayerComment({
    prayerId,
    userId,
    body,
    authorName,
  });

  await incrementPrayerComments(prayerId, 1);

  return toCommentResponse(created, userId);
}

async function deleteComment({ prayerId, commentId, userId }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const comment = await findPrayerCommentById(commentId);
  if (!comment || comment.prayerId.toString() !== prayerId.toString()) {
    throw new AppError('Comment not found', 404);
  }

  const user = await findById(userId);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin && comment.userId.toString() !== userId.toString()) {
    throw new AppError('Forbidden', 403);
  }

  await deletePrayerCommentById(commentId);
  if ((prayer.commentsCount || 0) > 0) {
    await incrementPrayerComments(prayerId, -1);
  }
  return { deleted: true };
}

async function listPrayingUsers({ prayerId, limit = 20, offset = 0 }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const prayedBy = prayer.prayedBy || [];
  const total = prayedBy.length;
  const slice = prayedBy.slice(offset, offset + limit);
  const users = await findByIds(slice);

  return {
    count: total,
    users: users.map((user) => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name || 'Anonymous',
    })),
  };
}

module.exports = {
  getPrayers,
  addPrayer,
  togglePray,
  listComments,
  addComment,
  deleteComment,
  listPrayingUsers,
};
