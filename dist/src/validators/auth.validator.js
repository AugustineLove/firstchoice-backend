"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = validateRegister;
exports.validateLogin = validateLogin;
exports.validateForgotPassword = validateForgotPassword;
exports.validateResetPassword = validateResetPassword;
function validateRegister(data) {
    const { name, phone, password, role } = data;
    if (!name || typeof name !== 'string' || name.trim().length < 2)
        return 'Name must be at least 2 characters';
    if (!phone || typeof phone !== 'string' || phone.trim().length < 9)
        return 'Valid phone number is required';
    if (!password || typeof password !== 'string' || password.length < 6)
        return 'Password must be at least 6 characters';
    const allowedRoles = ['CUSTOMER', 'RIDER', 'VENDOR', 'ADMIN'];
    if (role && !allowedRoles.includes(role))
        return 'Role must be CUSTOMER, RIDER, or VENDOR';
    return null;
}
function validateLogin(data) {
    const { phone, password } = data;
    if (!phone || typeof phone !== 'string')
        return 'Phone number is required';
    if (!password || typeof password !== 'string')
        return 'Password is required';
    return null;
}
function validateForgotPassword(body) {
    if (!body.phone)
        return 'Phone number is required';
    return null;
}
function validateResetPassword(phone) {
    if (!phone)
        return 'Phone number is required';
    // if (!body.otp || body.otp.length !== 6) return 'A valid 6-digit code is required';
    // if (!body.newPassword || body.newPassword.length < 6) return 'Password must be at least 6 characters';
    return null;
}
//# sourceMappingURL=auth.validator.js.map