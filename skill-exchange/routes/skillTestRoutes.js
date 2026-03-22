const express  = require("express");
const router   = express.Router();
const https    = require("https");
const { protect } = require("../middleware/auth");
const User     = require("../models/User");

// ── Helper: call Claude API ─────────────────────────
const callClaude = (prompt) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    model:      "claude-opus-4-5",
    max_tokens: 2000,
    messages:   [{ role: "user", content: prompt }],
  });

  const req = https.request({
    hostname: "api.anthropic.com",
    path:     "/v1/messages",
    method:   "POST",
    headers:  {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
  }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return reject(new Error(parsed.error.message));
        resolve(parsed.content?.[0]?.text || "");
      } catch (e) { reject(e); }
    });
  });
  req.on("error", reject);
  req.write(body);
  req.end();
});

/**
 * POST /skill-test/generate
 * Generate 10 AI questions for a skill
 * Body: { skill }
 */
router.post("/skill-test/generate", protect, async (req, res, next) => {
  try {
    const { skill } = req.body;
    if (!skill?.trim()) {
      return res.status(400).json({ success: false, message: "Skill name required." });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ success: false, message: "AI service not configured. Add ANTHROPIC_API_KEY to .env" });
    }

    const prompt = `You are a skill assessment expert. Generate exactly 10 multiple choice questions to test someone's knowledge of "${skill}".

Rules:
- Questions should range from beginner to intermediate level
- Each question has exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Questions should be practical and relevant
- Mix of conceptual and practical questions

Respond with ONLY a valid JSON array, no other text, no markdown, no explanation:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The "correct" field is the 0-based index of the correct option.`;

    const raw = await callClaude(prompt);

    // Parse JSON — strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ success: false, message: "Failed to parse AI response. Please try again." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ success: false, message: "Invalid AI response. Please try again." });
    }

    // Limit to 10
    const finalQuestions = questions.slice(0, 10).map((q, i) => ({
      id:          i + 1,
      question:    q.question,
      options:     q.options,
      correct:     q.correct,
      explanation: q.explanation || "",
    }));

    res.status(200).json({
      success:   true,
      skill,
      questions: finalQuestions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /skill-test/submit
 * Submit answers, get score, update user badge
 * Body: { skill, answers: [0,2,1,...], questions: [...] }
 */
router.post("/skill-test/submit", protect, async (req, res, next) => {
  try {
    const { skill, answers, questions } = req.body;

    if (!skill || !Array.isArray(answers) || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: "skill, answers, and questions are required." });
    }

    let correct = 0;
    const results = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) correct++;
      return {
        question:    q.question,
        chosen:      q.options[answers[i]] ?? "Not answered",
        correct:     q.options[q.correct],
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score      = Math.round((correct / questions.length) * 100);
    const passed     = score >= 60;
    const badge      = score >= 90 ? "expert" : score >= 70 ? "proficient" : score >= 60 ? "beginner" : null;

    // Save verified skill badge on user if passed
    if (passed) {
      const user = await User.findById(req.user._id);
      if (!user.verifiedSkills) user.verifiedSkills = {};
      user.verifiedSkills[skill.toLowerCase()] = {
        badge,
        score,
        verifiedAt: new Date(),
      };
      user.markModified("verifiedSkills");
      await user.save();
    }

    res.status(200).json({
      success: true,
      skill,
      score,
      correct,
      total:   questions.length,
      passed,
      badge,
      results,
      message: passed
        ? `🎉 Passed! You scored ${score}% — ${badge} badge earned for ${skill}!`
        : `❌ Not passed. You scored ${score}%. Need 60% to pass. Try again!`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;