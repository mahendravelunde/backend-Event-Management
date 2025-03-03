const express = require('express');
const router = express.Router();
const multer = require("multer");
const { getEvents, createEvent, deleteEvent,updateEvent } = require('../controllers/eventController');
// const auth = require('../middleware/auth');
const  {auth , isAdmin}  = require('../middleware/auth');
// const upload = require("../config/multer");
const upload = multer({ dest: "uploads/" });

router.get('/', auth, getEvents);

router.delete('/:eventId', auth, deleteEvent);

// router.put('/:eventId', auth, updateEvent);
router.put(
  "/:eventId",
  auth,
  upload.fields([
    { name: "eventFile", maxCount: 1 },
    { name: "attendeeList", maxCount: 1 }
  ]),
  updateEvent
);

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
