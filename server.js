const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');


dotenv.config();


const app = express();
app.use(cors());
app.use(bodyParser.json());

// Add this after middleware and before routes
app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Happy Travelling</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: white;
              text-align: center;
            }
            h1 {
              font-size: 3rem;
              margin-bottom: 0.5rem;
            }
            p {
              font-size: 1.2rem;
              margin-top: 0;
            }
            .emoji {
              font-size: 4rem;
            }
          </style>
        </head>
        <body>
          <div>
            <div class="emoji">🚌✨🌍</div>
            <h1>Happy Travelling</h1>
            <p>🚀 Your journey starts here. Safe rides ahead! 🌟</p>
          </div>
        </body>
      </html>
    `);
  });
  

// Routes
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const vehicleRoutes = require('./routes/vehicles');
const tripRoutes = require('./routes/trip.routes.js');
const maintenanceRoutes = require('./routes/maintenance.js');
const adsRoutes = require('./routes/ads');



app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/ads', adsRoutes);



const PORT = process.env.PORT || 5047;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/role_auth_db';


mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('MongoDB connection error', err);
        process.exit(1);
    });
