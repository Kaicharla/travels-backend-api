const { body } = require('express-validator');


const adminRegisterValidators = [
    body('name').isLength({ min: 2 }).withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
];


const loginValidators = [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').exists().withMessage('Password required')
];


const driverCreateValidators = [
    body('name').isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
];


module.exports = {
    adminRegisterValidators,
    loginValidators,
    driverCreateValidators
};