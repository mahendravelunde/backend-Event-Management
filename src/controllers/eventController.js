const Event = require("../models/Event");
const xlsx = require('xlsx'); 
const { encrypt, decrypt } = require("../utils/encryption");

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

exports.getEvents = async (req, res) => {
  try {
    let { search, eventDate, page = 1, limit = 10 } = req.query;
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
    
    // Import decrypt function to handle encrypted links
    const { decrypt } = require('../utils/encryption');
    
    // Process events to handle encrypted fields
    const processedEvents = events.map(event => {
      const eventObj = event.toObject();
      
      // Handle eventWebLink if it exists
      if (eventObj.eventWebLink) {
        try {
          // Try to decrypt, but won't fail if not encrypted or improperly formatted
          eventObj.eventWebLink = decrypt(eventObj.eventWebLink);
        } catch (error) {
          console.warn(`Non-critical error with event ${eventObj._id} link:`, error.message);
          // Keep original value if decryption fails
        }
      }
      
      return eventObj;
    });
    
    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents,
      role: req.user.role,
      events: processedEvents,
    });
  } catch (error) {
    console.error('Error in getEvents controller:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve events',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventName, eventType, eventWebLink } = req.body;

    console.log("req",req.body)
    // Only admin can update events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update events' });
    }

    let eventData = {
      eventName,
      //eventDate: new Date(eventDate),
      eventType
    };

    // Handle file updates
    if (req.files) {
      if (req.files.eventFile) {
        eventData.eventFile = req.files.eventFile[0].filename;
      }
      if (req.files.attendeeList) {
        eventData.attendeeListFile = req.files.attendeeList[0].filename;

        // Process Excel file
        const workbook = xlsx.readFile(req.files.attendeeList[0].path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        console.log("jsonData",jsonData)
        eventData.attendees = jsonData.map(row => row.Email || row.Name);
      }
    }

    // Encrypt web link if provided
    if (eventWebLink) {
      eventData.eventWebLink = await encrypt(eventWebLink);
    }

    // Find and update event
    const updatedEvent = await Event.findByIdAndUpdate(eventId, eventData, { new: true });
    console.log("updatedEvent",updatedEvent)
    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

