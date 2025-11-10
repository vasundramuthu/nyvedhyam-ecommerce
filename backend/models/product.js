// --- models/Product.js ---

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    price: {
        type: Number, // Stored in Rupees (e.g., 250.00)
        required: true,
        min: 0,
    },
    // Optional: a short description of the product
    description: {
        type: String,
    },
    // Optional: image URL or path for display
    image: {
        type: String, 
    }
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;