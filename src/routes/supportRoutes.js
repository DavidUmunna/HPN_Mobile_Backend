const express = require('express');
const { getSupportDirectoryController } = require('../controllers/supportController');

const router = express.Router();

router.get('/', getSupportDirectoryController);

module.exports = router;