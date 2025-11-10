require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Models (Assuming these files are correctly linked in your project)
const Customer = require('./models/customer');
const Order = require('./models/order');
const Product = require('./models/product');

// App setup
const app = express();
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.DB_URI;

// 🛑 CRITICAL FIX: CONSOLIDATED Allowed Origins List
const allowedOrigins = [
  'https://nyvedhyam-ecommerce.onrender.com', // ⬅️ REQUIRED LIVE RENDER URL
  'https://nyvedhyam.co.in',
  'https://www.nyvedhyam.co.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like Postman or local file access)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Block requests from unapproved domains
    return callback(new Error('Not allowed by CORS'), false);
  }
}));

// MongoDB Connect
mongoose.connect(DB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

// Middleware
app.use(bodyParser.json());

// Serve static frontend files correctly (relative path to 'frontend/public' from the 'backend' folder)
const publicPath = path.join(__dirname, '../frontend/public');
app.use(express.static(publicPath));
console.log('Serving static from:', publicPath);

// HOME PAGE
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index3.html'));
});

// PAYMENT PAGE
app.get('/payment', (req, res) => {
  res.sendFile(path.join(publicPath, 'payment.html'));
});

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Save Customer (API endpoint)
app.post('/api/save-details', async (req, res) => {
  try {
    const { name, email, phone, address, city, pincode } = req.body;
    if (!name || !email || !phone || !address || !city || !pincode)
      return res.status(400).json({ success: false, message: 'All fields required.' });

    let customer = await Customer.findOne({ email });
    if (customer) Object.assign(customer, { name, phone, address, city, pincode });
    else customer = new Customer({ name, email, phone, address, city, pincode });

    await customer.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Customer Save Error:", err);
    res.status(500).json({ success: false });
  }
});

// Create Razorpay Order (API endpoint)
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, items, customerDetails } = req.body;
    const options = {
      amount: Number(amount), // Amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);

    const newOrder = new Order({
      razorpay_order_id: order.id,
      amount: amount / 100, // Save in Rupees
      items,
      customerDetails,
      status: 'created'
    });
    await newOrder.save();

    res.json(order);
  } catch (err) {
    console.error("Order Creation Error:", err);
    res.status(500).json({ error: 'Order failed' });
  }
});

// Verify Payment (API endpoint)
app.post('/api/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);

  if (hmac.digest('hex') === razorpay_signature) {
    try {
      const order = await Order.findOne({ razorpay_order_id });
      if (order) {
        order.status = 'paid';
        order.razorpay_payment_id = razorpay_payment_id;
        await order.save();
        
        // You would typically send the order email here!
        // await sendOrderEmail(order.customerDetails, order); 

        res.json({ success: true, message: "Payment verified, order updated." });
      } else {
        res.status(404).json({ success: false, message: 'Order not found.' });
      }
    } catch (err) {
      console.error("Verification DB Error:", err);
      res.status(500).json({ success: false, message: 'Server verification failed.' });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server Running: http://localhost:${PORT}`);
});