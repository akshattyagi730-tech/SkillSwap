const express = require("express");
const router  = express.Router();
const { sendMessage, getChatHistory, deleteMessage, deleteChat, deleteAllMine, updateCallStatus } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

router.post("/chat/send",                     protect, sendMessage);
router.get("/chat/deleteallmine",             protect, deleteAllMine);
router.get("/chat/deleteall/:userId/:forAll", protect, deleteChat);
router.get("/chat/:userId",                   protect, getChatHistory);
router.delete("/chat/message/:id",            protect, deleteMessage);
router.patch("/chat/call/:id/end",            protect, updateCallStatus);

module.exports = router;