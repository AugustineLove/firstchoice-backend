"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.me = me;
const AuthService = __importStar(require("../services/auth.service"));
const auth_validator_1 = require("../validators/auth.validator");
async function register(req, res) {
    const error = (0, auth_validator_1.validateRegister)(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error });
        return;
    }
    try {
        const result = await AuthService.registerUser(req.body);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function login(req, res) {
    console.log(req.body);
    const error = (0, auth_validator_1.validateLogin)(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error });
        return;
    }
    try {
        const result = await AuthService.loginUser(req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(401).json({ success: false, message: err.message });
    }
}
async function refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token required' });
        return;
    }
    try {
        const result = await AuthService.refreshAccessToken(refreshToken);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(401).json({ success: false, message: err.message });
    }
}
async function me(req, res) {
    res.status(200).json({ success: true, data: { user: req.user } });
}
//# sourceMappingURL=auth.controller.js.map