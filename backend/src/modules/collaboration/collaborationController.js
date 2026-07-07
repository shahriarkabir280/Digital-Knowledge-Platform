const db = require("../../db");

// Helper: Get user's identifier
async function getUserIdentifier(userId) {
  try {
    const user = await db("users").where({ id: userId }).first();
    return user ? (user.name || user.email) : "Unknown User";
  } catch (err) {
    return "Unknown User";
  }
}

// 1. Get annotations for a document
async function getAnnotations(req, res, next) {
  try {
    const { docId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch annotations
    let query = db("annotations")
      .select("annotations.*", "users.name as author_name", "users.email as author_email")
      .leftJoin("users", "annotations.user_id", "users.id")
      .where({ document_id: String(docId) });

    // Permissions: non-admins only see public annotations OR their own private ones
    if (userRole !== "ADMIN" && userRole !== "STAFF" && userRole !== "REVIEWER") {
      query = query.andWhere((builder) => {
        builder.where({ is_public: true }).orWhere({ user_id: userId });
      });
    }

    const annotations = await query.orderBy("annotations.created_at", "asc");

    // Fetch replies for these annotations
    const annotationIds = annotations.map(a => a.id);
    let replies = [];
    if (annotationIds.length > 0) {
      replies = await db("annotation_replies")
        .select("annotation_replies.*", "users.name as author_name", "users.email as author_email")
        .leftJoin("users", "annotation_replies.user_id", "users.id")
        .whereIn("annotation_id", annotationIds)
        .orderBy("created_at", "asc");
    }

    // Map replies to their parent annotations
    const annotationsWithReplies = annotations.map(anno => ({
      ...anno,
      is_public: Boolean(anno.is_public),
      replies: replies.filter(r => String(r.annotation_id) === String(anno.id))
    }));

    return res.status(200).json({ success: true, data: annotationsWithReplies });
  } catch (error) {
    return next(error);
  }
}

// 2. Create annotation
async function createAnnotation(req, res, next) {
  try {
    const userId = req.user.id;
    const { documentId, sectionRef, quotedText, commentText, highlightColor, isPublic } = req.body;

    if (!documentId || !sectionRef || !commentText) {
      return res.status(400).json({ success: false, message: "Missing required fields (documentId, sectionRef, commentText)" });
    }

    const [annotation] = await db("annotations")
      .insert({
        document_id: String(documentId),
        user_id: userId,
        section_ref: sectionRef,
        quoted_text: quotedText || null,
        comment_text: commentText,
        highlight_color: highlightColor || "yellow",
        is_public: isPublic !== undefined ? Boolean(isPublic) : true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning("*");

    const authorName = await getUserIdentifier(userId);

    return res.status(201).json({
      success: true,
      data: { ...annotation, is_public: Boolean(annotation.is_public), author_name: authorName, replies: [] }
    });
  } catch (error) {
    return next(error);
  }
}

// 3. Delete annotation
async function deleteAnnotation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const annotation = await db("annotations").where({ id }).first();
    if (!annotation) {
      return res.status(404).json({ success: false, message: "Annotation not found" });
    }

    // Permission check: only author or admin can delete
    if (annotation.user_id !== userId && userRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this annotation" });
    }

    await db("annotations").where({ id }).delete();
    return res.status(200).json({ success: true, message: "Annotation deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

// 4. Create reply to annotation
async function createReply(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params; // annotation ID
    const { replyText } = req.body;

    if (!replyText || !replyText.trim()) {
      return res.status(400).json({ success: false, message: "Reply text is required" });
    }

    const annotation = await db("annotations").where({ id }).first();
    if (!annotation) {
      return res.status(404).json({ success: false, message: "Annotation not found" });
    }

    const [reply] = await db("annotation_replies")
      .insert({
        annotation_id: id,
        user_id: userId,
        reply_text: replyText.trim(),
        created_at: db.fn.now()
      })
      .returning("*");

    const authorName = await getUserIdentifier(userId);

    // Notify annotation owner if someone else replies
    if (annotation.user_id !== userId) {
      await db("notifications").insert({
        user_id: annotation.user_id,
        document_id: null,
        event_type: "annotation_reply",
        title: "New reply on your annotation",
        message: `${authorName} replied to your annotation: "${replyText.substring(0, 30)}..."`,
        is_read: false,
        created_at: db.fn.now()
      }).catch(err => console.warn("Failed to notify annotation owner:", err.message));
    }

    return res.status(201).json({
      success: true,
      data: { ...reply, author_name: authorName }
    });
  } catch (error) {
    return next(error);
  }
}

// 5. Export annotations
async function exportAnnotations(req, res, next) {
  try {
    const { docId } = req.params;
    const { format = "txt" } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch document info to get a title
    const research = await db("research_resources").where({ id: docId }).first();
    const academic = await db("academic_resources").where({ id: docId }).first();
    const docTitle = research?.title || academic?.title || `Document_${docId}`;

    let query = db("annotations")
      .select("annotations.*", "users.name as author_name")
      .leftJoin("users", "annotations.user_id", "users.id")
      .where({ document_id: String(docId) });

    if (userRole !== "ADMIN" && userRole !== "STAFF" && userRole !== "REVIEWER") {
      query = query.andWhere((builder) => {
        builder.where({ is_public: true }).orWhere({ user_id: userId });
      });
    }

    const annotations = await query.orderBy("annotations.created_at", "asc");

    let fileContent = "";
    let contentType = "text/plain";
    let filename = `${docTitle}_annotations.${format}`;

    if (format === "html") {
      contentType = "text/html";
      fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>Annotations for ${docTitle}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 20px auto; padding: 20px; }
    .annotation { border-left: 4px solid #f59e0b; padding-left: 15px; margin-bottom: 25px; }
    .quoted { background: #fef3c7; font-style: italic; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }
    .meta { font-size: 0.85em; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Annotations for ${docTitle}</h1>
  <hr />
  ${annotations.map(a => `
    <div class="annotation">
      <div class="meta"><strong>${a.author_name || "User"}</strong> at ${new Date(a.created_at).toLocaleString()} (${a.section_ref})</div>
      ${a.quoted_text ? `<div class="quoted">"${a.quoted_text}"</div>` : ""}
      <p class="comment">${a.comment_text}</p>
    </div>
  `).join("")}
</body>
</html>`;
    } else if (format === "md") {
      contentType = "text/markdown";
      fileContent = `# Annotations for ${docTitle}\n\n`;
      annotations.forEach(a => {
        fileContent += `### ${a.section_ref} - By ${a.author_name || "User"}\n`;
        fileContent += `*Date: ${new Date(a.created_at).toLocaleString()}*\n\n`;
        if (a.quoted_text) {
          fileContent += `> "${a.quoted_text}"\n\n`;
        }
        fileContent += `${a.comment_text}\n\n---\n\n`;
      });
    } else {
      // Plain text default
      fileContent = `Annotations for ${docTitle}\n========================================\n\n`;
      annotations.forEach(a => {
        fileContent += `[${a.section_ref}] By ${a.author_name || "User"} on ${new Date(a.created_at).toLocaleString()}\n`;
        if (a.quoted_text) {
          fileContent += `Quoted Text: "${a.quoted_text}"\n`;
        }
        fileContent += `Comment: ${a.comment_text}\n`;
        fileContent += `----------------------------------------\n\n`;
      });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(fileContent);
  } catch (error) {
    return next(error);
  }
}

// 6. Create Virtual Reading Room
async function createReadingRoom(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, documentId } = req.body;

    if (!name || !documentId) {
      return res.status(400).json({ success: false, message: "Room name and document ID are required" });
    }

    const [room] = await db("reading_rooms")
      .insert({
        name,
        document_id: String(documentId),
        host_id: userId,
        created_at: db.fn.now()
      })
      .returning("*");

    return res.status(201).json({ success: true, data: room });
  } catch (error) {
    return next(error);
  }
}

// 7. Get Reading Rooms for a document
async function getReadingRooms(req, res, next) {
  try {
    const { docId } = req.params;
    const rooms = await db("reading_rooms")
      .select("reading_rooms.*", "users.name as host_name")
      .leftJoin("users", "reading_rooms.host_id", "users.id")
      .where({ document_id: String(docId) })
      .orderBy("created_at", "desc");

    return res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    return next(error);
  }
}

// 8. Get messages for a reading room
async function getRoomMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const messages = await db("reading_room_messages")
      .select("reading_room_messages.*", "users.name as author_name", "users.email as author_email")
      .leftJoin("users", "reading_room_messages.user_id", "users.id")
      .where({ room_id: roomId })
      .orderBy("created_at", "asc");

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    return next(error);
  }
}

// 9. Post message to a reading room
async function postRoomMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const { messageText } = req.body;

    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    const [msg] = await db("reading_room_messages")
      .insert({
        room_id: roomId,
        user_id: userId,
        message_text: messageText.trim(),
        created_at: db.fn.now()
      })
      .returning("*");

    const authorName = await getUserIdentifier(userId);

    return res.status(201).json({
      success: true,
      data: { ...msg, author_name: authorName }
    });
  } catch (error) {
    return next(error);
  }
}

// 10. Update room presence (heartbeat)
async function updatePresence(req, res, next) {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // PostgreSQL specific UPSERT (ON CONFLICT DO UPDATE)
    await db.raw(`
      INSERT INTO reading_room_presence (room_id, user_id, last_seen_at)
      VALUES (?, ?, NOW())
      ON CONFLICT (room_id, user_id)
      DO UPDATE SET last_seen_at = NOW()
    `, [roomId, userId]);

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

// 11. Get active room presence
async function getPresence(req, res, next) {
  try {
    const { roomId } = req.params;

    // Get users active in the last 15 seconds
    const activePresence = await db("reading_room_presence")
      .select("reading_room_presence.*", "users.name as user_name", "users.email as user_email")
      .leftJoin("users", "reading_room_presence.user_id", "users.id")
      .where({ room_id: roomId })
      .andWhere("last_seen_at", ">=", db.raw("NOW() - INTERVAL '15 seconds'"))
      .orderBy("users.name", "asc");

    return res.status(200).json({ success: true, data: activePresence });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAnnotations,
  createAnnotation,
  deleteAnnotation,
  createReply,
  exportAnnotations,
  createReadingRoom,
  getReadingRooms,
  getRoomMessages,
  postRoomMessage,
  updatePresence,
  getPresence
};
