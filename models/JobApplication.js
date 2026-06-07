// models/JobApplication.js
const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
    candidateId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Tumchya User model che naav
        required: true 
    },
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job',  // Tumchya Job/Post model che naav
        required: true 
    },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' } // Default status 'Pending' rahel
});

module.exports = mongoose.model('JobApplication', JobApplicationSchema);