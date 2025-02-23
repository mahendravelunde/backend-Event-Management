const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  eventDate: {
    type: Date,
    required: false
  },
  eventType: {
    type: String,
    enum: ['image', 'video'],
    required: false
  },
  eventFile: {
    type: String,
    required: false
  },
  attendeeListFile: String,
  eventWebLink: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  attendees: [{
    type: String,
    trim: false
  }]
}, {
  timestamps: false
});

module.exports = mongoose.model('Event', eventSchema);
