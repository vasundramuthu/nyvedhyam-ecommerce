// --- models/Customer.js ---

const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    // Using a phone number as the unique identifier for simplicity
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 10, 
        maxlength: 10
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
    // Useful for tracking when the customer was added
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer;