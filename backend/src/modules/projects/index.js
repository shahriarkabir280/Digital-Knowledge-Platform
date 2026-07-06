const { Router } = require("express");
const { z } = require("zod");
const db = require("../../db");
const requireAuth = require("../../api/middlewares/requireAuth");
const requireAdmin = require("../../api/middlewares/requireAdmin");

const router = Router();

// Zod schemas for input validation
const projectCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  longDescription: z.string().min(10),
  category: z.string(),
  academicYear: z.string(),
  teamMembers: z.array(z.string()).min(1),
  supervisor: z.string().default("TBA"),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional().nullable(),
  repoUrl: z.string().optional().nullable(),
  demoUrl: z.string().optional().nullable(),
  screenshots: z.array(z.string()).default([]),
});

const reviewSchema = z.object({
  state: z.enum(["published", "rejected"]),
  note: z.string().optional().nullable(),
});

// Helper: Get user's name or email from their ID
async function getUserIdentifier(userId) {
  try {
    const user = await db("users").where({ id: userId }).first();
    return user ? (user.name || user.email) : "Unknown User";
  } catch (err) {
    return "Unknown User";
  }
}

// 1. GET / - List all approved/published projects (accessible to anyone)
router.get("/", async (req, res, next) => {
  try {
    const projects = await db("projects")
      .where({ state: "published" })
      .orderBy("created_at", "desc");

    // Map back to camelCase to match the React components' expectations
    const mapped = projects.map(p => ({
      id: String(p.id),
      title: p.title,
      description: p.description,
      longDescription: p.long_description,
      category: p.category,
      academicYear: p.academic_year,
      teamMembers: p.team_members || [],
      supervisor: p.supervisor,
      tags: p.tags || [],
      thumbnail: p.thumbnail,
      resources: {
        reportUrl: "#",
        slidesUrl: "#",
        repoUrl: p.repo_url || "#",
      },
      screenshots: p.screenshots || [],
      demoUrl: p.demo_url,
      comments: p.comments || [],
      learningResources: p.learning_resources || [],
      state: p.state,
      createdAt: p.created_at,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    return next(error);
  }
});

// 2. GET /pending - List all pending projects (admin only)
router.get("/pending", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const projects = await db("projects")
      .where({ state: "pending" })
      .orderBy("created_at", "desc");

    const mapped = projects.map(p => ({
      id: String(p.id),
      title: p.title,
      description: p.description,
      longDescription: p.long_description,
      category: p.category,
      academicYear: p.academic_year,
      teamMembers: p.team_members || [],
      supervisor: p.supervisor,
      tags: p.tags || [],
      thumbnail: p.thumbnail,
      resources: {
        reportUrl: "#",
        slidesUrl: "#",
        repoUrl: p.repo_url || "#",
      },
      screenshots: p.screenshots || [],
      demoUrl: p.demo_url,
      comments: p.comments || [],
      learningResources: p.learning_resources || [],
      state: p.state,
      createdAt: p.created_at,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    return next(error);
  }
});

// 3. POST / - Submit a project (authenticated member/contributor)
router.post("/", requireAuth, async (req, res, next) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("[Zod Project Validation Failed]:", parsed.error.format(), "Received body:", req.body);
    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid project submission data",
      details: parsed.error.issues,
    });
  }

  try {
    const uploaderId = Number(req.auth.sub);
    const val = parsed.data;

    const [project] = await db("projects")
      .insert({
        uploader_id: uploaderId,
        title: val.title,
        description: val.description,
        long_description: val.longDescription,
        category: val.category,
        academic_year: val.academicYear,
        team_members: JSON.stringify(val.teamMembers),
        supervisor: val.supervisor,
        tags: JSON.stringify(val.tags),
        thumbnail: val.thumbnail || null,
        repo_url: val.repoUrl || null,
        demo_url: val.demoUrl || null,
        screenshots: JSON.stringify(val.screenshots),
        state: "pending",
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Send notifications to all admins
    const submitterName = await getUserIdentifier(uploaderId);
    const admins = await db("users").where({ role: "ADMIN" }).select("id");
    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        document_id: null,
        event_type: "project_pending",
        title: "New student project pending approval",
        message: `"${val.title}" submitted by ${submitterName} is pending review.`,
        is_read: false,
        created_at: db.fn.now(),
      }));
      await db("notifications").insert(notifications).catch(err => {
        console.warn("Failed to insert admin notifications:", err.message);
      });
    }

    return res.status(201).json({
      success: true,
      message: "Project submitted successfully and is pending admin review.",
      data: { id: String(project.id), state: project.state },
    });
  } catch (error) {
    return next(error);
  }
});

// 4. PATCH /:id/review - Approve/reject a project submission (admin only)
router.patch("/:id/review", requireAuth, requireAdmin, async (req, res, next) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid project ID" });
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid review parameters",
      details: parsed.error.issues,
    });
  }

  try {
    const { state, note } = parsed.data;
    const project = await db("projects").where({ id: projectId }).first();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await db("projects")
      .where({ id: projectId })
      .update({
        state,
        updated_at: db.fn.now(),
      });

    // Notify the member who uploaded the project
    const decisionMessage = state === "published"
      ? `Your project "${project.title}" has been approved and published.`
      : `Your project "${project.title}" was rejected.` + (note ? ` Note: ${note}` : "");

    await db("notifications")
      .insert({
        user_id: project.uploader_id,
        document_id: null,
        event_type: state === "published" ? "project_approved" : "project_rejected",
        title: state === "published" ? "Project Approved!" : "Project Rejected",
        message: decisionMessage,
        is_read: false,
        created_at: db.fn.now(),
      })
      .catch(err => {
        console.warn("Failed to notify user of project decision:", err.message);
      });

    return res.status(200).json({
      success: true,
      message: `Project ${state === "published" ? "approved" : "rejected"} successfully.`,
    });
  } catch (error) {
    return next(error);
  }
});

// 5. PATCH /:id/comment - Add comment/reply to a project (authenticated users)
router.patch("/:id/comment", requireAuth, async (req, res, next) => {
  const projectId = Number(req.params.id);
  const { commentText, parentCommentId, replyText } = req.body;

  try {
    const project = await db("projects").where({ id: projectId }).first();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    let comments = project.comments || [];
    if (typeof comments === "string") {
      comments = JSON.parse(comments);
    }

    const userId = Number(req.auth.sub);
    const userName = await getUserIdentifier(userId);

    if (parentCommentId) {
      // It's a nested reply
      if (!replyText || !replyText.trim()) {
        return res.status(400).json({ success: false, message: "Reply text is required" });
      }

      const reply = {
        id: `reply-${Date.now()}`,
        user: userName,
        text: replyText.trim(),
        date: new Date().toISOString(),
      };

      comments = comments.map(c => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: [...(c.replies || []), reply],
          };
        }
        return c;
      });
    } else {
      // It's a new comment/question thread
      if (!commentText || !commentText.trim()) {
        return res.status(400).json({ success: false, message: "Comment text is required" });
      }

      const comment = {
        id: `comment-${Date.now()}`,
        user: userName,
        text: commentText.trim(),
        date: new Date().toISOString(),
        replies: [],
      };

      comments = [...comments, comment];
    }

    await db("projects")
      .where({ id: projectId })
      .update({
        comments: JSON.stringify(comments),
        updated_at: db.fn.now(),
      });

    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    return next(error);
  }
});

// 6. PATCH /:id/resource - Add learning resource to a project (authenticated users)
router.patch("/:id/resource", requireAuth, async (req, res, next) => {
  const projectId = Number(req.params.id);
  const { title, url, type } = req.body;

  if (!title || !url || !type) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const project = await db("projects").where({ id: projectId }).first();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    let resources = project.learning_resources || [];
    if (typeof resources === "string") {
      resources = JSON.parse(resources);
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const resource = {
      id: `lr-${Date.now()}`,
      title: title.trim(),
      url: formattedUrl,
      type: type,
    };

    resources = [...resources, resource];

    await db("projects")
      .where({ id: projectId })
      .update({
        learning_resources: JSON.stringify(resources),
        updated_at: db.fn.now(),
      });

    return res.status(200).json({ success: true, data: resources });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
