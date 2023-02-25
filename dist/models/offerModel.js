"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let offerSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    info: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    },
    dates: {
        type: [],
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    authorId: { type: mongoose_1.default.Schema.Types.String, ref: "User" },
    acceptedBy: {
        type: [],
        required: false
    }
}, { collection: "offers" });
const Offer = mongoose_1.default.model("Offer", offerSchema, "offers");
exports.default = Offer;
//# sourceMappingURL=offerModel.js.map