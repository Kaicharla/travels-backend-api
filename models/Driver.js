const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        phone: { type: String },
        role: { type: String, enum: ['driver'], default: 'driver' },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// hash password before save
driverSchema.pre('save', async function (next) {
    const driver = this;
    if (!driver.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    driver.password = await bcrypt.hash(driver.password, salt);
    next();
});

// compare password
driverSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
