const {
  getPrayers,
  addPrayer,
  togglePray,
  listComments,
  addComment,
  deleteComment,
  listPrayingUsers,
} = require('../services/prayerService');

async function listPrayersController(req, res, next) {
  try {
    const prayers = await getPrayers({ userId: req.session.userId, category: req.query.category });
    res.json({ prayers });
  } catch (err) {
    next(err);
  }
}

async function createPrayerController(req, res, next) {
  try {
    const prayer = await addPrayer({
      userId: req.session.userId,
      request: req.body.request,
      category: req.body.category,
      authorName: req.body.authorName,
    });
    res.status(201).json({ prayer });
  } catch (err) {
    next(err);
  }
}

async function togglePrayController(req, res, next) {
  try {
    const result = await togglePray({ prayerId: req.params.id, userId: req.session.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listPrayerCommentsController(req, res, next) {
  try {
    const comments = await listComments({
      prayerId: req.params.id,
      userId: req.session.userId,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

async function addPrayerCommentController(req, res, next) {
  try {
    const comment = await addComment({
      prayerId: req.params.id,
      userId: req.session.userId,
      body: req.body.body,
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function deletePrayerCommentController(req, res, next) {
  try {
    const result = await deleteComment({
      prayerId: req.params.id,
      commentId: req.params.commentId,
      userId: req.session.userId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listPrayingUsersController(req, res, next) {
  try {
    const result = await listPrayingUsers({
      prayerId: req.params.id,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPrayersController,
  createPrayerController,
  togglePrayController,
  listPrayerCommentsController,
  addPrayerCommentController,
  deletePrayerCommentController,
  listPrayingUsersController,
};
