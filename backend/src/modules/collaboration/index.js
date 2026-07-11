const { Router } = require("express");
const requireAuth = require("../../api/middlewares/requireAuth");
const controller = require("./collaborationController");

const router = Router();

// Middleware to attach normalized auth info to req.user
function attachAuthUser(req, _res, next) {
  if (req.auth) {
    req.user = {
      id: Number(req.auth.sub),
      email: req.auth.email,
      role: req.auth.role,
    };
  }
  next();
}

// All collaboration endpoints require authentication
router.use(requireAuth, attachAuthUser);

// Annotations
router.get("/documents/:docId/annotations", controller.getAnnotations);
router.post("/annotations", controller.createAnnotation);
router.delete("/annotations/:id", controller.deleteAnnotation);
router.post("/annotations/:id/replies", controller.createReply);
router.get("/documents/:docId/annotations/export", controller.exportAnnotations);

// Virtual Reading Rooms
router.post("/rooms", controller.createReadingRoom);
router.get("/documents/:docId/rooms", controller.getReadingRooms);
router.get("/users/search", controller.searchUsers);
router.post("/rooms/:roomId/invite", controller.inviteToRoom);
router.get("/rooms/:roomId/members", controller.getRoomMembers);
router.post("/rooms/:roomId/messages", controller.postRoomMessage);
router.get("/rooms/:roomId/messages", controller.getRoomMessages);
router.post("/rooms/:roomId/presence", controller.updatePresence);
router.get("/rooms/:roomId/presence", controller.getPresence);

module.exports = router;
