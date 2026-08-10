const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  isValidEmail,
  isValidName,
  isValidPassword,
} = require("../utils/validation");

const issueToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const sendAuthPayload = (res, user, token) => {
  res.status(200).json({
    message: "Authentication successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider || "local",
    },
  });
};

// =====================
// Register User
// =====================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!isValidName(name)) {
      return res.status(400).json({
        message: "Name must be at least 2 characters long",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "A valid email address is required",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const userExists = await User.findOne({ email: email.trim().toLowerCase() });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      provider: "local",
    });

    const token = issueToken(user);

    res.status(201).json({
      message: "User Registered Successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =====================
// Login User
// =====================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        message: "Use Google login for this account",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    const token = issueToken(user);

    sendAuthPayload(res, user, token);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const googleOAuthStart = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(501).json({
      message: "Google OAuth is not configured for this demo backend.",
    });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return res.redirect(authUrl.toString());
};

const googleOAuthCallback = async (req, res) => {
  const { code } = req.query;

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const loginUrl = `${clientUrl}/login`;

  const redirectWithError = (message) => {
    res.redirect(`${loginUrl}#error=${encodeURIComponent(message)}`);
  };

  if (!code) {
    return redirectWithError("OAuth code missing");
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return redirectWithError("Google OAuth credentials are not configured");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return redirectWithError("Google OAuth token exchange failed");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      return redirectWithError("Unable to read Google profile");
    }

    const profile = await profileResponse.json();

    let user = await User.findOne({ email: profile.email });

    if (!user) {
      const generatedPassword = await bcrypt.hash(`${profile.id}-${Date.now()}`, 10);
      user = await User.create({
        name: profile.name || profile.email,
        email: profile.email,
        password: generatedPassword,
        provider: "google",
        googleId: profile.id,
      });
    } else if (!user.googleId) {
      user.provider = "google";
      user.googleId = profile.id;
      await user.save();
    }

    const token = issueToken(user);

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider,
    };

    return res.redirect(
      `${loginUrl}#token=${token}&user=${encodeURIComponent(JSON.stringify(payload))}`
    );
  } catch (error) {
    console.error("Google OAuth error:", error.message);

    return redirectWithError("Google OAuth failed");
  }
};

const getCurrentUser = async (req, res) => {
  res.status(200).json(req.user);
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  googleOAuthStart,
  googleOAuthCallback,
};