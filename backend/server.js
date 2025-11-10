require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Models
const Customer = require('./models/customer');
const Order = require('./models/order');
const Product = require('./models/product');

// App setup
const app = express();
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.DB_URI;

// Allowed Origins
const allowedOrigins = [
  'https://nyvedhyam.co.in',
  'https://www.nyvedhyam.co.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  }
}));

// MongoDB Connect
mongoose.connect(DB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

// Middleware
app.use(bodyParser.json());

// ✅ Serve static frontend files correctly
const publicPath = path.join(__dirname, '../frontend/public');
app.use(express.static(publicPath));
console.log('Serving static from:', publicPath);

// ✅ HOME PAGE
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index3.html'));
});

// ✅ PAYMENT PAGE
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

// Save Customer
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
    res.status(500).json({ success: false });
  }
});

// Create Razorpay Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, items, customerDetails } = req.body;
    const options = {
      amount: Number(amount),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);

    const newOrder = new Order({
      razorpay_order_id: order.id,
      amount: amount / 100,
      items,
      customerDetails,
      status: 'created'
    });
    await newOrder.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Order failed' });
  }
});

// Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);

  if (hmac.digest('hex') === razorpay_signature) {
    const order = await Order.findOne({ razorpay_order_id });
    order.status = 'paid';
    order.razorpay_payment_id = razorpay_payment_id;
    await order.save();
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server Running: http://localhost:${PORT}`);
});
