const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');


dotenv.config();


const app = express();
app.use(cors());
app.use(bodyParser.json());


// Routes
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const vehicleRoutes = require('./routes/vehicles');
// const tripRoutes = require('./routes/tripRoutes');
// const tripRoutes = require('./routes/trip');
const tripRoutes = require('./routes/trip.routes.js');
// const tripReports = require('./routes/trip.reports');


app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
// app.use('/api/trips', tripRoutes);
app.use('/api/trips', tripRoutes);
// app.use('/api/trips/reports', tripReports);


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