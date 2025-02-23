const express = require('express');
const router = express.Router();
const { getEvents, createEvent } = require('../controllers/eventController');
// const auth = require('../middleware/auth');
const  {auth , isAdmin}  = require('../middleware/auth');
const upload = require("../config/multer");


router.get('/', auth, getEvents);

router.post(
  '/',
  auth,
  isAdmin,
  upload.fields([
    { name: 'eventFile', maxCount: 1 },
    { name: 'attendeeList', maxCount: 1 }
  ]),
  createEvent
);
// router.post(
//   '/',
//   authenticateToken,
//   upload.fields([
//     { name: 'eventFile', maxCount: 1 },
//     { name: 'attendeeList', maxCount: 1 }
//   ]),
//   createEvent
// );

module.exports = router;
