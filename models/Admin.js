const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const adminSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin'], default: 'admin' }
    },
    { timestamps: true }
);


// hash password before save
adminSchema.pre('save', async function (next) {
    const admin = this;
    if (!admin.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);
    next();
});


// method to compare password
adminSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};


module.exports = mongoose.model('Admin', adminSchema);