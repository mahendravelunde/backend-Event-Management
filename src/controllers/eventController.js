const Event = require("../models/Event");
const xlsx = require('xlsx'); 
const { encrypt, decrypt } = require("../utils/encryption");

exports.createEvent1 = async (req, res) => {
  try {
    const { eventName, eventDate, eventType, eventWebLink } = req.body;
    const event = new Event({
      eventName,
      eventDate: new Date(eventDate),
      eventType,
      eventWebLink: eventWebLink ? await encrypt(eventWebLink) : null,
      createdBy: req.user._id,
    });

    if (req.file) {
      event.fileUrl = `/uploads/${req.file.filename}`;
    }

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getEvents1 = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id });
    for (let event of events) {
      if (event.eventWebLink) {
        event.eventWebLink = await decrypt(event.eventWebLink);
      }
    }
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.createEventWork = async (req, res) => {
  try {
    const { eventName, eventDate, eventType, eventWebLink } = req.body;
    
    // Only admin can create events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create events' });
    }

    const eventData = {
      eventName,
      eventDate: new Date(eventDate),
      eventType,
      createdBy: req.user._id
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.eventFile) {
        eventData.eventFile = req.files.eventFile[0].filename;
      }
      if (req.files.attendeeList) {
        eventData.attendeeListFile = req.files.attendeeList[0].filename;
        // Process Excel file to extract attendees
        // Add implementation for Excel processing here
      }
    }

    // Encrypt web link if provided
    if (eventWebLink) {
      eventData.eventWebLink = await encrypt(eventWebLink);
    }

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        ...event.toObject(),
        eventWebLink: eventWebLink // Return unencrypted link in response
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { eventName, eventDate, eventType, eventWebLink } = req.body;
    
    // Only admin can create events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create events' });
    }

    const eventData = {
      eventName,
      eventDate: new Date(eventDate),
      eventType,
      createdBy: req.user._id,
      attendees: [] // Initialize attendees list
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.eventFile) {
        eventData.eventFile = req.files.eventFile[0].filename;
      }
      
      if (req.files.attendeeList) {
        eventData.attendeeListFile = req.files.attendeeList[0].filename;

        // **Process Excel file**
        const workbook = xlsx.readFile(req.files.attendeeList[0].path);
        const sheetName = workbook.SheetNames[0]; // Get the first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet data to JSON
        const jsonData = xlsx.utils.sheet_to_json(sheet);

        // Extract attendee emails or names
        eventData.attendees = jsonData.map(row => row.Email || row.Name);
      }
    }

    // Encrypt web link if provided
    if (eventWebLink) {
      eventData.eventWebLink = await encrypt(eventWebLink);
    }

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        ...event.toObject(),
        eventWebLink: eventWebLink // Return unencrypted link in response
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getEventsWorking = async (req, res) => {
  try {
    let events;
    
    if (req.user.role === 'admin') {
      events = await Event.find().populate('createdBy', 'name email');
    } else {
      events = await Event.find({
        attendees: req.user.email
      }).populate('createdBy', 'name email');
    }

    console.log("events",Event)


    // Decrypt web links
    const decryptedEvents = await Promise.all(events.map(async (event) => {
      const eventObj = event.toObject();
      eventObj.role = req.user.role;
      if (eventObj.eventWebLink) {
        eventObj.eventWebLink = await decrypt(eventObj.eventWebLink);
      }
      return eventObj;
    }));
    // res.json({
    //   role: req.user.role,  // Include the role in the response
    //   events: decryptedEvents
    // });
    res.json(decryptedEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    let { search, eventDate, page = 1, limit = 2 } = req.query;
    let filter = {};

    // Ensure page & limit are numbers
    page = parseInt(page);
    limit = parseInt(limit);

    // Admin sees all events, users see only their events
    if (req.user.role !== 'admin') {
      filter.attendees = req.user.email;
    }

    // Search by event name (case-insensitive)
    if (search) {
      filter.eventName = { $regex: search, $options: 'i' };
    }

    // Filter by event date
    if (eventDate) {
      filter.eventDate = new Date(eventDate);
    }

    // Pagination (skip and limit)
    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total event count for pagination metadata
    const totalEvents = await Event.countDocuments(filter);
    
    // Decrypt web links
    const decryptedEvents = await Promise.all(events.map(async (event) => {
      const eventObj = event.toObject();
      if (eventObj.eventWebLink) {
        eventObj.eventWebLink = await decrypt(eventObj.eventWebLink);
      }
      return eventObj;
    }));

    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents,
      role: req.user.role,
      events: decryptedEvents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    
    const { eventId } = req.params;
    
    // Only admin can delete events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete events' });
    }

    // Find and delete event
    const event = await Event.findByIdAndDelete(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
