// --- models/Order.js ---

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    // Primary link to Razorpay
    razorpay_order_id: {
        type: String,
        required: true,
        unique: true,
    },
    razorpay_payment_id: {
        type: String,
        default: null, // Filled only after successful verification
        unique: true, 
        sparse: true, // Allows multiple documents to have null payment_id
    },
    amount: {
        type: Number, // Total amount in Rupees (e.g., 550.00)
        required: true,
    },
    // Embedded document structure for the items purchased
    items: [{
        name: String,
        price: Number,
        quantity: Number,
    }],
    // Embedded document structure for customer details at time of order
    customerDetails: {
        name: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        pincode: String,
    },
    // Status tracking: 'created', 'paid', 'failed', 'shipped', 'delivered'
    status: {
        type: String,
        required: true,
        enum: ['created', 'paid', 'failed', 'shipped', 'delivered'],
        default: 'created',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Update the updatedAt field whenever the document is saved/updated
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;