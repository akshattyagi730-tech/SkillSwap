const Message  = require("../models/Message");
const User     = require("../models/User");
const Block    = require("../models/Block");
const mongoose = require("mongoose");
const { notifyNewMessage } = require("../utils/notifyUtils");

// POST /chat/send
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, type, callStatus } = req.body;
    if (!receiverId || !content) return res.status(400).json({ success: false, message: "receiverId and content are required." });
    if (receiverId === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot message yourself." });
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found." });
    const block = await Block.findOne({ $or: [{ blocker: req.user._id, blocked: receiverId }, { blocker: receiverId, blocked: req.user._id }] });
    if (block) return res.status(403).json({ success: false, message: "Cannot send message." });
    const message = await Message.create({ sender: req.user._id, receiver: receiverId, content, type: type || 'text', callStatus: callStatus || null });
    await message.populate("sender", "name email");
    await message.populate("receiver", "name email");
    if (type !== 'call') notifyNewMessage({ toUser: receiver, fromUser: req.user, preview: content });
    res.status(201).json({ success: true, message: "Message sent.", data: message });
  } catch (error) { next(error); }
};

// GET /chat/:userId
const getChatHistory = async (req, res, next) => {
  try {
    const otherUserId   = req.params.userId;
    const currentUserId = req.user._id;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) return res.status(404).json({ success: false, message: "User not found." });

    const block = await Block.findOne({ $or: [{ blocker: currentUserId, blocked: otherUserId }, { blocker: otherUserId, blocked: currentUserId }] });
    if (block) return res.status(403).json({ success: false, message: "Cannot view messages with a blocked user." });

    // Get all messages, then filter out ones deleted for current user in JS
    // (avoids MongoDB ObjectId/string comparison issues with $elemMatch)
    const allMessages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId,   receiver: currentUserId },
      ],
    }).sort({ createdAt: 1 })
      .populate("sender",   "name email")
      .populate("receiver", "name email");

    // Filter: exclude messages where current user is in deletedFor
    const myIdStr = currentUserId.toString();
    const messages = allMessages.filter(m =>
      !m.deletedFor || !m.deletedFor.some(id => id.toString() === myIdStr)
    );

    await Message.updateMany({ sender: otherUserId, receiver: currentUserId, read: false }, { read: true });
    res.status(200).json({ success: true, count: messages.length, chatWith: { id: otherUser._id, name: otherUser.name }, messages });
  } catch (error) { next(error); }
};

// DELETE /chat/message/:id
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deleteFor } = req.body;
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found." });
    const isOwner = msg.sender.toString() === req.user._id.toString();
    if (deleteFor === 'everyone' && isOwner) {
      await Message.findByIdAndUpdate(id, { content: '🚫 This message was deleted', deletedFor: [] });
    } else {
      await Message.findByIdAndUpdate(id, { $addToSet: { deletedFor: req.user._id } });
    }
    res.status(200).json({ success: true, message: "Message deleted." });
  } catch (error) { next(error); }
};

// GET /chat/deleteall/:userId/:forAll — no body needed, all in URL
const deleteChat = async (req, res, next) => {
  try {
    const { userId, forAll } = req.params;
    const forEveryone = forAll === 'true';
    const myId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const otherObjId = new mongoose.Types.ObjectId(userId);

    const query = {
      $or: [
        { sender: myId,      receiver: otherObjId },
        { sender: otherObjId, receiver: myId },
      ],
    };

    if (forEveryone) {
      const r = await Message.deleteMany(query);
      console.log(`✅ Hard deleted ${r.deletedCount} messages`);
    } else {
      const r = await Message.updateMany(query, { $addToSet: { deletedFor: myId } });
      console.log(`✅ Soft deleted ${r.modifiedCount} messages`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('deleteChat error:', error.message);
    next(error);
  }
};

// PATCH /chat/call/:id/end
const updateCallStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { callStatus, callDuration } = req.body;
    const msg = await Message.findByIdAndUpdate(id, { callStatus, callDuration }, { new: true })
      .populate("sender", "name email").populate("receiver", "name email");
    if (!msg) return res.status(404).json({ success: false, message: "Message not found." });
    res.status(200).json({ success: true, data: msg });
  } catch (error) { next(error); }
};

// GET /chat/deleteallmine — soft delete all messages for current user
const deleteAllMine = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const result = await Message.updateMany(
      { $or: [{ sender: myId }, { receiver: myId }] },
      { $addToSet: { deletedFor: myId } }
    );
    console.log(`🗑️ Cleared all chats for ${myId}: ${result.modifiedCount} messages`);
    res.status(200).json({ success: true, cleared: result.modifiedCount });
  } catch (error) {
    console.error('deleteAllMine error:', error.message);
    next(error);
  }
};

module.exports = { sendMessage, getChatHistory, deleteMessage, deleteChat, deleteAllMine, updateCallStatus };