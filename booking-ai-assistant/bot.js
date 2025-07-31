const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
require("dotenv").config();

class VillageStayBot {
  constructor() {
    console.log("🚀 Initializing VillageStay WhatsApp Bot...");

    // Clean up old sessions if needed
    this.cleanupOldSessions();

    // Initialize WhatsApp client with proper configuration
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "villagestay-bot",
        dataPath: "./.wwebjs_auth",
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
      },
    });

    this.db = null;
    this.mongoClient = null;

    // User sessions for conversation tracking
    this.userSessions = new Map();

    // Bot configuration
    this.config = {
      mongoUri: process.env.MONGO_URI,
      geminiApiKey: process.env.GEMINI_API_KEY,
      botName: process.env.BOT_NAME || "VillageStay Assistant",
      adminPhone: process.env.ADMIN_PHONE,
    };

    this.initializeBot();
    this.connectToMongoDB();
  }

  cleanupOldSessions() {
    try {
      const authPath = "./.wwebjs_auth";
      const cachePath = "./.wwebjs_cache";

      if (fs.existsSync(authPath)) {
        console.log("🧹 Found existing auth session");
      }

      if (fs.existsSync(cachePath)) {
        console.log("🧹 Found existing cache");
      }
    } catch (error) {
      console.log("⚠️ Session cleanup note:", error.message);
    }
  }

  async initializeBot() {
    console.log("📱 Setting up WhatsApp Web client...");

    // QR Code generation
    this.client.on("qr", (qr) => {
      console.log("\n" + "=".repeat(50));
      console.log("📱 WHATSAPP QR CODE - Scan with your phone:");
      console.log("=".repeat(50));
      qrcode.generate(qr, { small: true });
      console.log("=".repeat(50));
      console.log("📱 Steps to connect:");
      console.log("1. Open WhatsApp on your phone");
      console.log("2. Go to Settings > Linked Devices");
      console.log('3. Tap "Link a Device"');
      console.log("4. Scan the QR code above");
      console.log("=".repeat(50) + "\n");
    });

    // Authentication events
    this.client.on("authenticated", () => {
      console.log("✅ WhatsApp authenticated successfully!");
    });

    this.client.on("auth_failure", (msg) => {
      console.error("❌ Authentication failed:", msg);
      console.log("💡 Try running: npm run clean (to clear session data)");
    });

    // Ready event
    this.client.on("ready", () => {
      console.log("🎉 VillageStay WhatsApp Bot is ready and connected!");
      console.log(`📞 Bot Name: ${this.config.botName}`);
      console.log(`📱 Ready to receive messages...`);
      this.setupScheduledTasks();
    });

    // Message handling
    this.client.on("message", async (message) => {
      await this.handleMessage(message);
    });

    // Connection events
    this.client.on("disconnected", (reason) => {
      console.log("📱 Client disconnected:", reason);
      console.log("🔄 Bot will attempt to reconnect...");
    });

    // Loading event
    this.client.on("loading_screen", (percent, message) => {
      console.log("⏳ Loading...", percent, message);
    });

    // Initialize the client
    console.log("🔄 Starting WhatsApp Web client...");
    try {
      await this.client.initialize();
    } catch (error) {
      console.error("❌ Failed to initialize WhatsApp client:", error);
      console.log("💡 Try deleting .wwebjs_auth folder and restart");
      process.exit(1);
    }
  }

  async connectToMongoDB() {
    try {
      console.log("🔄 Connecting to MongoDB...");
      this.mongoClient = new MongoClient(this.config.mongoUri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db("villagestay");
      console.log("✅ Connected to MongoDB");

      // Test the connection
      const collections = await this.db.listCollections().toArray();
      console.log(`📊 Found ${collections.length} collections in database`);
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      console.log("💡 Make sure MongoDB is running on:", this.config.mongoUri);
      process.exit(1);
    }
  }

  async handleMessage(message) {
    try {
      // Skip group messages, status updates, and own messages
      if (message.from.includes("@g.us") || message.isStatus || message.fromMe)
        return;

      const userId = message.from;
      const messageText = message.body.toLowerCase().trim();

      console.log(`📨 Message from ${userId}: ${messageText}`);

      // Get or create user session
      let session = this.userSessions.get(userId) || {
        step: "greeting",
        bookingData: {},
        lastActivity: new Date(),
        userData: null,
      };

      // Update last activity
      session.lastActivity = new Date();

      // Handle different conversation flows
      switch (session.step) {
        case "greeting":
          await this.handleGreeting(message, session);
          break;
        case "new_user_profile":
          await this.handleNewUserProfile(message, session);
          break;
        case "main_menu":
          await this.handleMainMenu(message, session);
          break;
        case "browse_listings":
          await this.handleBrowseListings(message, session);
          break;
        case "listing_details":
          await this.handleListingDetails(message, session);
          break;
        case "booking_flow":
          await this.handleBookingFlow(message, session);
          break;
        case "ai_chat":
          await this.handleAIChat(message, session);
          break;
        case "account_management":
          await this.handleAccountManagement(message, session);
          break;
        case "booking_details":
          await this.handleBookingDetails(message, session);
          break;
        case "profile_completion":
          await this.handleProfileCompletion(message, session);
          break;
        case "password_reset":
          await this.handlePasswordResetFlow(message, session);
          break;
        case "password_change":
          await this.handlePasswordChange(message, session);
          break;
        default:
          await this.handleDefault(message, session);
      }

      // Save session
      this.userSessions.set(userId, session);
    } catch (error) {
      console.error("❌ Error handling message:", error);
      await message.reply(
        'Sorry, something went wrong. Please try again or type "start" to begin.'
      );
    }
  }

  async handleGreeting(message, session) {
    const greetingKeywords = [
      "hi",
      "hello",
      "start",
      "book",
      "help",
      "namaste",
    ];
    const messageText = message.body.toLowerCase();

    if (greetingKeywords.some((keyword) => messageText.includes(keyword))) {
      // Check if user exists in database
      const existingUser = await this.getUserDetailsByWhatsApp(message.from);

      if (!existingUser) {
        // New user - welcome and ask for profile
        const newUserMessage = `🙏 *Welcome to ${this.config.botName}!*

I see you're new here! I'll help you discover authentic rural experiences across India.

To get started, I need a few quick details:

*What's your full name?*`;

        await message.reply(newUserMessage);
        session.step = "new_user_profile";
        session.profileStep = "name";
      } else {
        // Existing user - show main menu
        const welcomeMessage = `🙏 *Welcome back, ${existingUser.full_name}!*

Great to see you again! I'm here to help you discover authentic rural experiences across India.

🏡 *What would you like to do?*

1️⃣ *Browse Listings* - Explore rural homestays & experiences
2️⃣ *My Bookings* - Check your current bookings
3️⃣ *Ask AI Assistant* - Get personalized travel recommendations
4️⃣ *Account Settings* - Manage your account
5️⃣ *Emergency Contact* - Speak with our support team

Just reply with the number or describe what you're looking for!

_Example: "Show me pottery experiences" or "I want a peaceful retreat"_`;

        await message.reply(welcomeMessage);
        session.step = "main_menu";
        session.userData = existingUser;
      }
    } else {
      await message.reply(
        `👋 Hello! I'm the ${this.config.botName}. Type "start" to begin exploring authentic rural experiences!`
      );
    }
  }

  async handleNewUserProfile(message, session) {
    const input = message.body.trim();

    switch (session.profileStep) {
      case "name":
        if (input.length < 2) {
          await message.reply(
            "❌ Please enter your full name (at least 2 characters)"
          );
          return;
        }

        session.profileData = { full_name: input };
        session.profileStep = "email";
        await message.reply(`Nice to meet you, ${input}! 😊

*What's your email address?*
(This will be used for booking confirmations and website login)`);
        break;

      case "email":
        if (!this.isValidEmail(input)) {
          await message.reply("❌ Please enter a valid email address");
          return;
        }

        // Check if email already exists
        const existingUser = await this.db
          .collection("users")
          .findOne({ email: input });
        if (existingUser) {
          await message.reply(
            `❌ An account with email ${input} already exists.\n\nWould you like to link this WhatsApp to that existing account? Reply "yes" to link or provide a different email.`
          );
          session.existingEmail = input;
          session.profileStep = "email_conflict";
          return;
        }

        session.profileData.email = input;
        session.profileStep = "password";
        await message.reply(`📧 Email saved: ${input}

Now, create a secure password for your account:

*Set your password:*
(Minimum 6 characters, use letters and numbers for security)

This password will be used to login on our website.`);
        break;

      case "email_conflict":
        if (input.toLowerCase() === "yes") {
          await this.linkExistingAccountByEmail(
            message,
            session,
            session.existingEmail
          );
          return;
        } else if (this.isValidEmail(input)) {
          // New email provided
          const existingUser = await this.db
            .collection("users")
            .findOne({ email: input });
          if (existingUser) {
            await message.reply(
              `❌ Email ${input} is also registered. Please provide a different email.`
            );
            return;
          }
          session.profileData.email = input;
          session.profileStep = "password";
          await message.reply(`📧 Email saved: ${input}

Now, create a secure password for your account:

*Set your password:*
(Minimum 6 characters, use letters and numbers for security)`);
        } else {
          await message.reply(
            'Please reply "yes" to link existing account or provide a valid email address.'
          );
        }
        break;

      case "password":
        if (input.length < 6) {
          await message.reply(
            "❌ Password must be at least 6 characters long. Please try again."
          );
          return;
        }

        if (
          input.toLowerCase().includes("password") ||
          input === "123456" ||
          input === "qwerty"
        ) {
          await message.reply(
            '❌ Please choose a stronger password. Avoid common passwords like "password" or "123456".'
          );
          return;
        }

        session.profileData.password = input;
        session.profileStep = "location";
        await message.reply(`🔐 Password set successfully!

*Where are you located?* (City/State)
This helps us provide better recommendations.

Type "skip" if you prefer not to share.`);
        break;

      case "location":
        session.profileData.address =
          input.toLowerCase() === "skip" ? "" : input;
        await this.createNewUserAccount(message, session);
        break;
    }
  }

  async createNewUserAccount(message, session) {
    try {
      const whatsappPhone = message.from;
      const phoneNumber = whatsappPhone.replace("@c.us", "");

      // Hash the password properly with bcrypt
      const hashedPassword = await bcrypt.hash(
        session.profileData.password,
        10
      );

      const newUser = {
        email: session.profileData.email,
        password: hashedPassword, // Properly hashed password
        full_name: session.profileData.full_name,
        user_type: "tourist",
        phone: "+" + phoneNumber,
        address: session.profileData.address,
        created_at: new Date(),
        is_verified: false,
        profile_image: null,
        preferred_language: "en",
        created_via: "whatsapp_bot",
        whatsapp_phone: whatsappPhone,
        whatsapp_linked_at: new Date(),
        is_temporary_account: false,
        needs_profile_completion: false,
        password_set_via: "whatsapp",
      };

      const result = await this.db.collection("users").insertOne(newUser);

      const successMessage = `🎉 *Account Created Successfully!*

Welcome to VillageStay, ${session.profileData.full_name}! ✨

👤 *Your Account:*
- Name: ${session.profileData.full_name}
- Email: ${session.profileData.email}
- Phone: +${phoneNumber}
- Password: Set and secured ✅
${
  session.profileData.address
    ? `• Location: ${session.profileData.address}`
    : ""
}

🔗 *Ready to Use:*
- Your account is fully set up
- You can now book rural experiences
- Login to website anytime with your email and password

🌐 *Website Access:*
- Visit: villagestay.com
- Email: ${session.profileData.email}
- Password: (the one you just created)

Now, let's find you an amazing rural experience! 🏡

*What would you like to do?*

1️⃣ *Browse Listings* - Explore rural homestays
2️⃣ *Ask AI Assistant* - Get personalized recommendations
3️⃣ *Popular Experiences* - See what's trending

Reply with a number or tell me what you're looking for!`;

      await message.reply(successMessage);

      session.step = "main_menu";
      session.userData = newUser;
      delete session.profileData; // Clear password from memory
      delete session.profileStep;
    } catch (error) {
      console.error("Account creation error:", error);
      await message.reply(
        "❌ Sorry, failed to create account. Please try again."
      );
    }
  }

  // Update the handlePasswordChange function
  async handlePasswordChange(message, session) {
    const input = message.body.trim();
    const user = await this.getUserDetailsByWhatsApp(message.from);

    switch (session.passwordStep) {
      case "current":
        // Verify current password using bcrypt
        const isValidPassword = await bcrypt.compare(input, user.password);

        if (!isValidPassword) {
          await message.reply(
            '❌ Current password is incorrect. Please try again or type "cancel" to stop.'
          );
          return;
        }

        session.passwordStep = "new";
        await message.reply(`✅ Current password verified!

Now enter your *new password*:
(Minimum 6 characters, use letters and numbers)`);
        break;

      case "new":
        if (input.length < 6) {
          await message.reply(
            "❌ Password must be at least 6 characters long. Please try again."
          );
          return;
        }

        if (input.toLowerCase().includes("password") || input === "123456") {
          await message.reply("❌ Please choose a stronger password.");
          return;
        }

        session.passwordStep = "confirm";
        session.newPassword = input;
        await message.reply(`🔐 Confirm your new password:

*Re-enter your new password:*`);
        break;

      case "confirm":
        if (input !== session.newPassword) {
          await message.reply("❌ Passwords don't match. Please try again.");
          session.passwordStep = "new";
          delete session.newPassword;
          await message.reply("Enter your *new password* again:");
          return;
        }

        // Update password in database with bcrypt
        const hashedNewPassword = await bcrypt.hash(input, 10);

        await this.db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedNewPassword,
              password_updated_at: new Date(),
              updated_at: new Date(),
            },
          }
        );

        const successMessage = `🎉 *Password Changed Successfully!*

Your password has been updated securely.

🔐 *Updated Account Access:*
- Email: ${user.email}
- Password: (your new password)
- Website: villagestay.com

💡 *Security Tips:*
- Don't share your password
- Use this password for website login
- Keep it safe and secure

Type "menu" to return to main menu.`;

        await message.reply(successMessage);

        session.step = "main_menu";
        delete session.newPassword;
        delete session.passwordStep;
        break;
    }
  }

  async handlePasswordReset(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    if (!user) {
      await message.reply(
        "❌ No account found. Please create an account first."
      );
      return;
    }

    const resetMessage = `🔐 *Password Reset*

Hi ${user.full_name}!

Your current account:
📧 Email: ${user.email}

*Choose an option:*

1️⃣ Change password now (via WhatsApp)
2️⃣ Send password reset email
3️⃣ Back to account menu

Reply with a number.`;

    await message.reply(resetMessage);
    session.step = "password_reset";
  }

  async handlePasswordResetFlow(message, session) {
    const choice = message.body.trim();

    if (choice === "1") {
      session.step = "password_change";
      session.passwordStep = "current";

      await message.reply(`🔐 *Change Password*

For security, please enter your *current password*:

(This is the password you use to login to the website)`);
    } else if (choice === "2") {
      await this.sendPasswordResetEmail(message, session);
    } else if (choice === "3") {
      session.step = "account_management";
      await this.handleAccountLinking(message, session);
    } else {
      await message.reply("Please select 1, 2, or 3.");
    }
  }

  async handlePasswordChange(message, session) {
    const input = message.body.trim();
    const user = await this.getUserDetailsByWhatsApp(message.from);

    switch (session.passwordStep) {
      case "current":
        // Verify current password
        const bcrypt = require("bcrypt");
        const isValidPassword = await bcrypt.compare(input, user.password);

        if (!isValidPassword) {
          await message.reply(
            '❌ Current password is incorrect. Please try again or type "cancel" to stop.'
          );
          return;
        }

        session.passwordStep = "new";
        await message.reply(`✅ Current password verified!

Now enter your *new password*:
(Minimum 6 characters, use letters and numbers)`);
        break;

      case "new":
        if (input.length < 6) {
          await message.reply(
            "❌ Password must be at least 6 characters long. Please try again."
          );
          return;
        }

        if (input.toLowerCase().includes("password") || input === "123456") {
          await message.reply("❌ Please choose a stronger password.");
          return;
        }

        session.passwordStep = "confirm";
        session.newPassword = input;
        await message.reply(`🔐 Confirm your new password:

*Re-enter your new password:*`);
        break;

      case "confirm":
        if (input !== session.newPassword) {
          await message.reply("❌ Passwords don't match. Please try again.");
          session.passwordStep = "new";
          delete session.newPassword;
          await message.reply("Enter your *new password* again:");
          return;
        }

        // Update password in database
        const hashedNewPassword = await bcrypt.hash(input, 10);

        await this.db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedNewPassword,
              password_updated_at: new Date(),
              updated_at: new Date(),
            },
          }
        );

        const successMessage = `🎉 *Password Changed Successfully!*

Your password has been updated securely.

🔐 *Updated Account Access:*
- Email: ${user.email}
- Password: (your new password)
- Website: villagestay.com

💡 *Security Tips:*
- Don't share your password
- Use this password for website login
- Keep it safe and secure

Type "menu" to return to main menu.`;

        await message.reply(successMessage);

        session.step = "main_menu";
        delete session.newPassword;
        delete session.passwordStep;
        break;
    }
  }

  async sendPasswordResetEmail(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    // In production, you would actually send an email here
    // For now, we'll provide instructions

    const emailMessage = `📧 *Password Reset Email*

Hi ${user.full_name}!

To reset your password via email:

1️⃣ Go to: villagestay.com
2️⃣ Click "Forgot Password"  
3️⃣ Enter your email: ${user.email}
4️⃣ Check your email for reset link
5️⃣ Follow the instructions in the email

📱 *Or change it here:*
You can also change your password directly through WhatsApp by typing "change password"

💡 *Need help?* Contact support at ${this.config.adminPhone}

Type "menu" to return to main menu.`;

    await message.reply(emailMessage);
    session.step = "main_menu";
  }

  async linkExistingAccountByEmail(message, session, email) {
    try {
      const user = await this.db.collection("users").findOne({ email: email });

      if (!user) {
        await message.reply(
          `❌ No account found with email: ${email}\n\nPlease provide a different email.`
        );
        session.profileStep = "email";
        return;
      }

      const whatsappPhone = message.from;

      // Update user with WhatsApp phone
      await this.db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            whatsapp_phone: whatsappPhone,
            whatsapp_linked_at: new Date(),
            updated_at: new Date(),
          },
        }
      );

      // Update existing WhatsApp bookings to link to this user
      await this.db.collection("bookings").updateMany(
        {
          tourist_phone: whatsappPhone,
          tourist_id: { $exists: false },
        },
        {
          $set: {
            tourist_id: user._id,
            account_linked_at: new Date(),
          },
        }
      );

      const linkMessage = `✅ *Account Successfully Linked!*

Welcome back, ${user.full_name}! 🎉

Your WhatsApp is now linked to your existing VillageStay account:
📧 Email: ${user.email}
📱 Phone: ${user.phone || "Updated from WhatsApp"}

🔗 *Benefits:*
- All your bookings in one place
- Email confirmations
- Website access
- Complete booking history

Any previous WhatsApp bookings have been linked to your account!

*Ready to explore?*

1️⃣ *Browse Listings* - Explore rural homestays
2️⃣ *My Bookings* - Check your bookings
3️⃣ *Ask AI Assistant* - Get recommendations

What would you like to do?`;

      await message.reply(linkMessage);

      session.step = "main_menu";
      session.userData = user;
      delete session.profileData;
      delete session.profileStep;
      delete session.existingEmail;
    } catch (error) {
      console.error("Account linking error:", error);
      await message.reply(
        "❌ Sorry, failed to link account. Please try again."
      );
    }
  }

  async handleMainMenu(message, session) {
    const choice = message.body.trim().toLowerCase();

    if (
      choice === "1" ||
      choice.includes("browse") ||
      choice.includes("listing")
    ) {
      await this.showListings(message, session);
    } else if (choice === "2" || choice.includes("booking")) {
      await this.showUserBookings(message, session);
    } else if (
      choice === "3" ||
      choice.includes("ai") ||
      choice.includes("assistant")
    ) {
      await this.startAIChat(message, session);
    } else if (choice === "4" || choice.includes("account")) {
      await this.handleAccountLinking(message, session);
    } else if (
      choice === "5" ||
      choice.includes("emergency") ||
      choice.includes("contact")
    ) {
      await this.showEmergencyContact(message, session);
    } else if (choice.includes("complete profile")) {
      await this.handleCompleteProfile(message, session);
    } else if (choice.includes("popular")) {
      await this.showPopularExperiences(message, session);
    } else if (
      choice.includes("change password") ||
      choice.includes("reset password")
    ) {
      await this.handlePasswordReset(message, session);
    } else {
      // Try AI search for natural language queries
      await this.handleNaturalLanguageQuery(message, session);
    }
  }
  async showPopularExperiences(message, session) {
    try {
      // Get popular listings (high rating, recent bookings)
      const popularListings = await this.db
        .collection("listings")
        .find({
          is_active: true,
          is_approved: true,
          rating: { $gte: 4.0 },
        })
        .sort({ rating: -1, review_count: -1 })
        .limit(5)
        .toArray();

      if (popularListings.length === 0) {
        await this.showListings(message, session);
        return;
      }

      let popularMessage = `🌟 *Popular Rural Experiences*\n\n`;

      for (let i = 0; i < popularListings.length; i++) {
        const listing = popularListings[i];

        popularMessage += `*${i + 1}. ${listing.title}*\n`;
        popularMessage += `📍 ${listing.location}\n`;
        popularMessage += `💰 ₹${listing.price_per_night}/night\n`;
        popularMessage += `⭐ ${listing.rating}/5 (${listing.review_count} reviews)\n`;
        popularMessage += `🏠 ${listing.property_type.replace("_", " ")}\n\n`;
      }

      popularMessage += `Reply with a number (1-${popularListings.length}) to see details, or:\n`;
      popularMessage += `🔍 Type "browse all" to see more listings\n`;
      popularMessage += `🏠 Type "menu" to return to main menu`;

      await message.reply(popularMessage);

      session.step = "browse_listings";
      session.currentListings = popularListings;
    } catch (error) {
      console.error("Error showing popular experiences:", error);
      await this.showListings(message, session);
    }
  }

  async showListings(message, session, searchQuery = "") {
    try {
      let query = { is_active: true, is_approved: true };

      // If there's a search query, add text search
      if (searchQuery) {
        query.$or = [
          { title: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { location: { $regex: searchQuery, $options: "i" } },
          { amenities: { $in: [new RegExp(searchQuery, "i")] } },
        ];
      }

      const listings = await this.db
        .collection("listings")
        .find(query)
        .limit(6)
        .toArray();

      if (listings.length === 0) {
        await message.reply(
          "😔 No listings found. Try a different search or browse all listings!"
        );
        return;
      }

      let listingsMessage = `🏡 *${
        searchQuery ? "Search Results" : "Featured Rural Experiences"
      }*\n\n`;

      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];

        listingsMessage += `*${i + 1}. ${listing.title}*\n`;
        listingsMessage += `📍 ${listing.location}\n`;
        listingsMessage += `💰 ₹${listing.price_per_night}/night\n`;
        listingsMessage += `🏠 ${listing.property_type.replace("_", " ")}\n`;
        listingsMessage += `⭐ ${listing.rating || 0}/5 (${
          listing.review_count || 0
        } reviews)\n`;
        listingsMessage += `👥 Max ${listing.max_guests} guests\n\n`;
      }

      listingsMessage += `Reply with a number (1-${listings.length}) to see details, or:\n`;
      listingsMessage += `🔍 Type "search [keyword]" to find specific experiences\n`;
      listingsMessage += `🏠 Type "menu" to return to main menu`;

      await message.reply(listingsMessage);

      session.step = "browse_listings";
      session.currentListings = listings;
    } catch (error) {
      console.error("Error showing listings:", error);
      await message.reply(
        "Sorry, I couldn't fetch the listings right now. Please try again."
      );
    }
  }

  async handleBrowseListings(message, session) {
    const input = message.body.trim().toLowerCase();

    if (input.startsWith("search ")) {
      const searchQuery = input.replace("search ", "");
      await this.showListings(message, session, searchQuery);
      return;
    }

    if (input === "browse all") {
      await this.showListings(message, session);
      return;
    }

    if (input === "menu") {
      session.step = "main_menu";
      await this.handleGreeting(message, session);
      return;
    }

    const choice = parseInt(input);

    if (choice >= 1 && choice <= session.currentListings.length) {
      const selectedListing = session.currentListings[choice - 1];
      await this.showListingDetails(message, session, selectedListing);
    } else {
      await message.reply(
        'Please select a valid number from the list or type "menu" to go back.'
      );
    }
  }

  async showListingDetails(message, session, listing) {
    try {
      const host = await this.db
        .collection("users")
        .findOne({ _id: listing.host_id });

      let detailMessage = `🏡 *${listing.title}*\n\n`;
      detailMessage += `📍 *Location:* ${listing.location}\n`;
      detailMessage += `💰 *Price:* ₹${listing.price_per_night} per night\n`;
      detailMessage += `🏠 *Type:* ${listing.property_type.replace(
        "_",
        " "
      )}\n`;
      detailMessage += `👥 *Max Guests:* ${listing.max_guests}\n`;
      detailMessage += `⭐ *Rating:* ${listing.rating || 0}/5 (${
        listing.review_count || 0
      } reviews)\n\n`;

      detailMessage += `📝 *Description:*\n${listing.description.substring(
        0,
        300
      )}${listing.description.length > 300 ? "..." : ""}\n\n`;

      if (listing.amenities && listing.amenities.length > 0) {
        detailMessage += `🎯 *Top Amenities:*\n`;
        listing.amenities.slice(0, 5).forEach((amenity) => {
          detailMessage += `• ${amenity}\n`;
        });
        if (listing.amenities.length > 5) {
          detailMessage += `• And ${listing.amenities.length - 5} more...\n`;
        }
        detailMessage += "\n";
      }

      if (
        listing.sustainability_features &&
        listing.sustainability_features.length > 0
      ) {
        detailMessage += `🌱 *Eco-Friendly Features:*\n`;
        listing.sustainability_features.forEach((feature) => {
          detailMessage += `• ${feature}\n`;
        });
        detailMessage += "\n";
      }

      if (host) {
        detailMessage += `👤 *Host:* ${host.full_name}\n\n`;
      }

      detailMessage += `*What would you like to do?*\n`;
      detailMessage += `1️⃣ Book this experience\n`;
      detailMessage += `2️⃣ Ask questions about this place\n`;
      detailMessage += `3️⃣ See similar listings\n`;
      detailMessage += `4️⃣ Back to listings\n`;
      detailMessage += `🏠 Type "menu" for main menu`;

      await message.reply(detailMessage);

      session.step = "listing_details";
      session.selectedListing = listing;
    } catch (error) {
      console.error("Error showing listing details:", error);
      await message.reply(
        "Sorry, I couldn't load the listing details. Please try again."
      );
    }
  }

  async handleListingDetails(message, session) {
    const choice = message.body.trim().toLowerCase();

    if (choice === "1" || choice.includes("book")) {
      await this.startBookingFlow(message, session);
    } else if (choice === "2" || choice.includes("question")) {
      await this.handleListingQuestions(message, session);
    } else if (choice === "3" || choice.includes("similar")) {
      await this.showSimilarListings(message, session);
    } else if (choice === "4" || choice.includes("back")) {
      await this.showListings(message, session);
    } else if (choice === "menu") {
      session.step = "main_menu";
      await this.handleGreeting(message, session);
    } else {
      await message.reply(
        'Please select 1, 2, 3, 4, or type "menu" to go back.'
      );
    }
  }

  async startBookingFlow(message, session) {
    // Get user's account details
    const user = await this.getUserDetailsByWhatsApp(message.from);

    if (!user) {
      await message.reply(
        '❌ Account not found. Please type "start" to create an account first.'
      );
      return;
    }

    session.step = "booking_flow";
    session.bookingStep = "check_in";
    session.bookingData = {
      listing_id: session.selectedListing._id,
      listing_title: session.selectedListing.title,
      price_per_night: session.selectedListing.price_per_night,
      max_guests: session.selectedListing.max_guests,
      host_id: session.selectedListing.host_id,
      user: user, // Store user details for booking
    };

    const bookingMessage = `📅 *Let's book ${session.selectedListing.title}!*

Hello ${user.full_name}! 👋

Please provide your *check-in date* in DD/MM/YYYY format.

Example: 15/08/2024

_Make sure to choose a date at least 2 days from today._`;

    await message.reply(bookingMessage);
  }

  async handleBookingFlow(message, session) {
    try {
      switch (session.bookingStep) {
        case "check_in":
          await this.handleCheckInDate(message, session);
          break;
        case "check_out":
          await this.handleCheckOutDate(message, session);
          break;
        case "guests":
          await this.handleGuestCount(message, session);
          break;
        case "special_requests":
          await this.handleSpecialRequests(message, session);
          break;
        case "confirmation":
          await this.handleBookingConfirmation(message, session);
          break;
        default:
          await this.startBookingFlow(message, session);
      }
    } catch (error) {
      console.error("Booking flow error:", error);
      await message.reply(
        'Something went wrong with your booking. Let\'s start over. Type "book" to try again.'
      );
    }
  }

  async handleCheckInDate(message, session) {
    const dateInput = message.body.trim();
    const date = moment(dateInput, "DD/MM/YYYY", true);

    if (!date.isValid()) {
      await message.reply(
        "❌ Please enter a valid date in DD/MM/YYYY format (e.g., 15/08/2024)"
      );
      return;
    }

    if (date.isBefore(moment().add(1, "day"))) {
      await message.reply(
        "❌ Check-in date must be at least tomorrow. Please choose a later date."
      );
      return;
    }

    // Check availability
    const isAvailable = await this.checkAvailability(
      session.bookingData.listing_id,
      date.toDate()
    );

    if (!isAvailable) {
      await message.reply(
        "❌ This date is not available. Please choose another date."
      );
      return;
    }

    session.bookingData.check_in = date.toDate();
    session.bookingStep = "check_out";

    await message.reply(`✅ Check-in: ${date.format("DD/MM/YYYY")}

Now, please provide your *check-out date* in DD/MM/YYYY format.`);
  }

  async handleCheckOutDate(message, session) {
    const dateInput = message.body.trim();
    const date = moment(dateInput, "DD/MM/YYYY", true);

    if (!date.isValid()) {
      await message.reply(
        "❌ Please enter a valid date in DD/MM/YYYY format (e.g., 17/08/2024)"
      );
      return;
    }

    const checkInMoment = moment(session.bookingData.check_in);

    if (date.isSameOrBefore(checkInMoment)) {
      await message.reply(
        "❌ Check-out date must be after check-in date. Please choose a later date."
      );
      return;
    }

    const nights = date.diff(checkInMoment, "days");

    session.bookingData.check_out = date.toDate();
    session.bookingData.nights = nights;
    session.bookingStep = "guests";

    await message.reply(`✅ Check-out: ${date.format("DD/MM/YYYY")}
📅 Total nights: ${nights}

How many guests will be staying? (Maximum ${
      session.bookingData.max_guests
    } guests allowed)`);
  }

  async handleGuestCount(message, session) {
    const guestCount = parseInt(message.body.trim());

    if (isNaN(guestCount) || guestCount < 1) {
      await message.reply(
        "❌ Please enter a valid number of guests (minimum 1)"
      );
      return;
    }

    if (guestCount > session.bookingData.max_guests) {
      await message.reply(
        `❌ Maximum ${session.bookingData.max_guests} guests allowed for this property.`
      );
      return;
    }

    session.bookingData.guests = guestCount;
    session.bookingStep = "special_requests";

    await message.reply(`✅ Guests: ${guestCount}

Do you have any special requests or requirements for your stay? 

Type "none" if you don't have any special requests.`);
  }

  async handleSpecialRequests(message, session) {
    const requests = message.body.trim();
    session.bookingData.special_requests = requests === "none" ? "" : requests;

    // Calculate pricing
    const baseAmount =
      session.bookingData.price_per_night * session.bookingData.nights;
    const platformFee = Math.round(baseAmount * 0.05);
    const communityContribution = Math.round(baseAmount * 0.02);
    const totalAmount = baseAmount + platformFee;

    session.bookingData.base_amount = baseAmount;
    session.bookingData.platform_fee = platformFee;
    session.bookingData.community_contribution = communityContribution;
    session.bookingData.total_amount = totalAmount;
    session.bookingData.host_earnings =
      baseAmount - platformFee - communityContribution;

    const user = session.bookingData.user;

    const summaryMessage = `📋 *Booking Summary*

🏡 *Property:* ${session.bookingData.listing_title}
👤 *Guest:* ${user.full_name}
📧 *Email:* ${user.email}
📱 *Phone:* ${user.phone}

📅 *Check-in:* ${moment(session.bookingData.check_in).format("DD/MM/YYYY")}
📅 *Check-out:* ${moment(session.bookingData.check_out).format("DD/MM/YYYY")}
🌙 *Nights:* ${session.bookingData.nights}
👥 *Guests:* ${session.bookingData.guests}

💰 *Pricing Breakdown:*
- Base Amount: ₹${baseAmount}
- Platform Fee: ₹${platformFee}
- *Total Amount: ₹${totalAmount}*

${
  session.bookingData.special_requests
    ? `📝 *Special Requests:* ${session.bookingData.special_requests}`
    : ""
}

*Confirm your booking?*
✅ Type "confirm" to proceed
❌ Type "cancel" to cancel`;

    await message.reply(summaryMessage);
    session.bookingStep = "confirmation";
  }

  async handleBookingConfirmation(message, session) {
    const response = message.body.toLowerCase().trim();

    if (response === "confirm") {
      await this.createBooking(message, session);
    } else if (response === "cancel") {
      await message.reply('❌ Booking cancelled. Type "start" to begin again.');
      session.step = "main_menu";
    } else {
      await message.reply('Please reply with "confirm" or "cancel".');
    }
  }

  async createBooking(message, session) {
    try {
      // Generate booking reference
      const bookingReference =
        "VS" + moment().format("YYYYMMDD") + Math.floor(Math.random() * 9999);

      const whatsappPhone = message.from;
      const user = session.bookingData.user;

      // Create booking document
      const bookingDoc = {
        listing_id: new ObjectId(session.bookingData.listing_id),
        tourist_id: user._id,
        host_id: new ObjectId(session.bookingData.host_id),
        check_in: session.bookingData.check_in,
        check_out: session.bookingData.check_out,
        guests: session.bookingData.guests,
        nights: session.bookingData.nights,
        base_amount: session.bookingData.base_amount,
        platform_fee: session.bookingData.platform_fee,
        community_contribution: session.bookingData.community_contribution,
        host_earnings: session.bookingData.host_earnings,
        total_amount: session.bookingData.total_amount,
        special_requests: session.bookingData.special_requests,
        booking_reference: bookingReference,
        status: "confirmed",
        payment_status: "pending",
        created_at: new Date(),
        updated_at: new Date(),

        // Additional fields
        tourist_phone: whatsappPhone,
        guest_name: user.full_name,
        guest_email: user.email,
        guest_phone: user.phone,
        booking_source: "whatsapp_bot",
      };

      const result = await this.db.collection("bookings").insertOne(bookingDoc);

      const confirmationMessage = `🎉 *Booking Confirmed!*

📋 *Booking Reference:* ${bookingReference}
🆔 *Booking ID:* ${result.insertedId.toString().slice(-8)}

✅ Your booking has been successfully confirmed!

📧 *Next Steps:*
1. You'll receive a confirmation email at ${user.email}
2. The host will contact you within 24 hours
3. Payment can be made directly to the host or through our platform

💡 *Your Account:*
- All booking details saved to your account
- Access online at villagestay.com
- Use email: ${user.email}

*Need help?* Type "help" anytime
*View all bookings?* Type "my bookings"

Thank you for choosing VillageStay! 🙏

Safe travels and enjoy your authentic rural experience! 🌟`;

      await message.reply(confirmationMessage);

      // Notify host
      await this.notifyHost(session.bookingData.host_id, bookingDoc);

      // Reset session
      session.step = "main_menu";
      session.bookingData = {};
    } catch (error) {
      console.error("Error creating booking:", error);
      await message.reply(
        "❌ Sorry, there was an error creating your booking. Please try again or contact support."
      );
    }
  }

  async getUserDetailsByWhatsApp(whatsappPhone) {
    try {
      const phoneNumber = whatsappPhone.replace("@c.us", "");

      // Search for user by phone number (try different formats)
      const phoneSearchPatterns = [
        phoneNumber,
        "+" + phoneNumber,
        phoneNumber.substring(2),
        "+91" + phoneNumber.substring(2),
      ];

      for (const pattern of phoneSearchPatterns) {
        const user = await this.db.collection("users").findOne({
          $or: [
            { phone: pattern },
            { whatsapp_phone: whatsappPhone },
            { phone: { $regex: pattern.replace("+", "\\+"), $options: "i" } },
          ],
        });

        if (user) {
          return user;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting user details:", error);
      return null;
    }
  }

  async showUserBookings(message, session) {
    try {
      const user = await this.getUserDetailsByWhatsApp(message.from);

      if (!user) {
        await message.reply(
          '❌ No account found. Please type "start" to create an account first.'
        );
        return;
      }

      const bookings = await this.db
        .collection("bookings")
        .find({ tourist_id: user._id })
        .sort({ created_at: -1 })
        .limit(10)
        .toArray();

      if (bookings.length === 0) {
        await message.reply(`📋 Hi ${user.full_name}! You don't have any bookings yet.

🏡 Ready to book your first rural experience?
Type "browse" to explore our listings!`);
        return;
      }

      let bookingsMessage = `📋 *Your Bookings* (${user.full_name})\n\n`;

      for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i];
        const listing = await this.db
          .collection("listings")
          .findOne({ _id: booking.listing_id });

        bookingsMessage += `*${i + 1}. ${
          listing ? listing.title : "Property"
        }*\n`;
        bookingsMessage += `📅 ${moment(booking.check_in).format(
          "DD/MM/YY"
        )} - ${moment(booking.check_out).format("DD/MM/YY")}\n`;
        bookingsMessage += `👥 ${booking.guests} guests\n`;
        bookingsMessage += `💰 ₹${booking.total_amount}\n`;
        bookingsMessage += `📋 Ref: ${booking.booking_reference}\n`;
        bookingsMessage += `📊 Status: ${booking.status}\n`;
        bookingsMessage += `💳 Payment: ${booking.payment_status}\n\n`;
      }

      bookingsMessage +=
        'Reply with a number to see booking details or type "menu" to go back.';

      await message.reply(bookingsMessage);
      session.currentBookings = bookings;
      session.step = "booking_details";
    } catch (error) {
      console.error("Error showing bookings:", error);
      await message.reply(
        "Sorry, I couldn't fetch your bookings right now. Please try again."
      );
    }
  }

  async handleBookingDetails(message, session) {
    const input = message.body.trim().toLowerCase();

    if (input === "menu") {
      session.step = "main_menu";
      await this.handleGreeting(message, session);
      return;
    }

    const choice = parseInt(input);

    if (choice >= 1 && choice <= session.currentBookings.length) {
      const selectedBooking = session.currentBookings[choice - 1];
      await this.showDetailedBooking(message, session, selectedBooking);
    } else {
      await message.reply(
        'Please select a valid number from the list or type "menu" to go back.'
      );
    }
  }

  async showDetailedBooking(message, session, booking) {
    try {
      const listing = await this.db
        .collection("listings")
        .findOne({ _id: booking.listing_id });
      const host = await this.db
        .collection("users")
        .findOne({ _id: booking.host_id });

      let detailMessage = `📋 *Booking Details*\n\n`;
      detailMessage += `🆔 *Reference:* ${booking.booking_reference}\n`;
      detailMessage += `🏡 *Property:* ${
        listing ? listing.title : "Property Details Unavailable"
      }\n`;
      detailMessage += `📍 *Location:* ${listing ? listing.location : "N/A"}\n`;
      detailMessage += `👤 *Guest:* ${booking.guest_name}\n\n`;

      detailMessage += `📅 *Check-in:* ${moment(booking.check_in).format(
        "DD/MM/YYYY"
      )}\n`;
      detailMessage += `📅 *Check-out:* ${moment(booking.check_out).format(
        "DD/MM/YYYY"
      )}\n`;
      detailMessage += `🌙 *Nights:* ${booking.nights}\n`;
      detailMessage += `👥 *Guests:* ${booking.guests}\n\n`;

      detailMessage += `💰 *Pricing:*\n`;
      detailMessage += `• Base Amount: ₹${booking.base_amount}\n`;
      detailMessage += `• Platform Fee: ₹${booking.platform_fee}\n`;
      detailMessage += `• *Total: ₹${booking.total_amount}*\n\n`;

      detailMessage += `📊 *Status:* ${booking.status}\n`;
      detailMessage += `💳 *Payment:* ${booking.payment_status}\n`;

      if (booking.special_requests) {
        detailMessage += `📝 *Special Requests:* ${booking.special_requests}\n`;
      }

      if (host) {
        detailMessage += `\n👤 *Host:* ${host.full_name}\n`;
        if (host.phone) {
          detailMessage += `📞 *Host Phone:* ${host.phone}\n`;
        }
      }

      detailMessage += `\n📅 *Booked:* ${moment(booking.created_at).format(
        "DD/MM/YYYY"
      )}\n`;

      detailMessage += `\n💡 *Need changes?* Contact our support team\nType "menu" to return to main menu`;

      await message.reply(detailMessage);
    } catch (error) {
      console.error("Error showing booking details:", error);
      await message.reply(
        "Sorry, I couldn't load the booking details. Please try again."
      );
    }
  }

  async startAIChat(message, session) {
    session.step = "ai_chat";

    const user = await this.getUserDetailsByWhatsApp(message.from);
    const userName = user ? user.full_name.split(" ")[0] : "there";

    const aiWelcome = `🤖 *AI Travel Assistant Activated!*

Hi ${userName}! I can help you with:
🏔️ Finding perfect destinations based on your mood
🎯 Personalized recommendations
🌍 Local culture and customs information
🍽️ Food and activity suggestions
📍 Transportation and travel tips

*What would you like to know?*

Example questions:
- "I want a peaceful mountain retreat"
- "Show me pottery experiences in Rajasthan"
- "What's the best time to visit Kerala villages?"
- "I need a family-friendly farmstay"

Go ahead, ask me anything! 😊`;

    await message.reply(aiWelcome);
  }

  async handleAIChat(message, session) {
    const userQuery = message.body.trim();

    if (
      userQuery.toLowerCase() === "menu" ||
      userQuery.toLowerCase() === "back"
    ) {
      session.step = "main_menu";
      await this.handleGreeting(message, session);
      return;
    }

    // Send typing indicator
    await message.reply("🤔 Let me think about that...");

    try {
      const aiResponse = await this.getGeminiResponse(userQuery, session);
      await message.reply(aiResponse);

      // Suggest related listings if relevant
      const suggestions = await this.getSuggestedListings(userQuery);
      if (suggestions.length > 0) {
        let suggestionsMsg = "\n🏡 *Related Experiences:*\n\n";
        suggestions.slice(0, 3).forEach((listing, index) => {
          suggestionsMsg += `${index + 1}. ${listing.title}\n`;
          suggestionsMsg += `   📍 ${listing.location} - ₹${listing.price_per_night}/night\n\n`;
        });
        suggestionsMsg +=
          'Type "browse" to see all listings or continue asking questions!';
        await message.reply(suggestionsMsg);
      }
    } catch (error) {
      console.error("AI Chat error:", error);
      await message.reply(
        'Sorry, I\'m having trouble processing that right now. Please try rephrasing your question or type "menu" to go back.'
      );
    }
  }

  async handleNaturalLanguageQuery(message, session) {
    const query = message.body.toLowerCase();

    // Check for booking-related queries
    if (query.includes("book") || query.includes("reserve")) {
      await this.showListings(message, session);
      return;
    }

    // Check for specific location/experience queries
    const searchTerms = this.extractSearchTerms(query);
    if (searchTerms.length > 0) {
      await this.showListings(message, session, searchTerms.join(" "));
      return;
    }

    // Default to AI chat for complex queries
    session.step = "ai_chat";
    await this.handleAIChat(message, session);
  }

  async getGeminiResponse(query, session) {
    try {
      const prompt = this.buildPrompt(query, session);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.config.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.candidates && response.data.candidates[0]) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No response from Gemini API");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }

  buildPrompt(query, session) {
    return `You are a helpful AI assistant for VillageStay, a platform that connects travelers with authentic rural experiences in India. 

User Query: "${query}"

Provide a helpful, warm, and informative response about rural tourism in India. Include:
1. Direct answer to their question
2. Specific recommendations when relevant
3. Cultural insights and local customs
4. Practical travel tips
5. Budget-friendly suggestions

Keep responses conversational, informative, and under 500 words. Focus on authentic rural experiences, sustainability, and cultural immersion.

If they ask about specific locations, mention real village names and unique experiences available there.
If they're looking for experiences, suggest activities like pottery making, organic farming, traditional cooking, etc.

Be enthusiastic about rural India's beauty and cultural richness!`;
  }

  async getSuggestedListings(query) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      if (searchTerms.length === 0) return [];

      const searchQuery = {
        is_active: true,
        is_approved: true,
        $or: searchTerms.map((term) => ({
          $or: [
            { title: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { location: { $regex: term, $options: "i" } },
            { amenities: { $in: [new RegExp(term, "i")] } },
          ],
        })),
      };

      return await this.db
        .collection("listings")
        .find(searchQuery)
        .limit(3)
        .toArray();
    } catch (error) {
      console.error("Error getting suggested listings:", error);
      return [];
    }
  }

  extractSearchTerms(query) {
    const commonTerms = [
      "pottery",
      "farming",
      "organic",
      "traditional",
      "village",
      "mountain",
      "river",
      "forest",
      "heritage",
      "rajasthan",
      "kerala",
      "himachal",
      "uttarakhand",
      "gujarat",
      "maharashtra",
      "cooking",
      "yoga",
      "meditation",
    ];
    return commonTerms.filter((term) => query.includes(term));
  }

  async checkAvailability(listingId, date) {
    try {
      const startDate = moment(date).startOf("day").toDate();
      const endDate = moment(date).endOf("day").toDate();

      const existingBooking = await this.db.collection("bookings").findOne({
        listing_id: new ObjectId(listingId),
        status: { $in: ["confirmed", "pending"] },
        $or: [
          {
            check_in: { $lte: startDate },
            check_out: { $gt: startDate },
          },
          {
            check_in: { $lt: endDate },
            check_out: { $gte: endDate },
          },
        ],
      });

      return !existingBooking;
    } catch (error) {
      console.error("Availability check error:", error);
      return true; // Default to available if check fails
    }
  }

  async notifyHost(hostId, bookingData) {
    try {
      console.log(
        `📧 Host notification sent for booking ${bookingData.booking_reference}`
      );
    } catch (error) {
      console.error("Host notification error:", error);
    }
  }

  async showEmergencyContact(message, session) {
    const emergencyMessage = `🆘 *Emergency Support*

*24/7 Emergency Helpline:*
📞 ${this.config.adminPhone}

*For urgent assistance:*
- Medical emergencies
- Safety concerns
- Booking issues
- Lost/stolen items
- Transportation problems

*Support Hours:*
📧 Email support: 9 AM - 9 PM
💬 WhatsApp: 24/7

We're here to help! 🙏

Type "menu" to return to main menu.`;

    await message.reply(emergencyMessage);
  }

  async handleAccountLinking(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    if (!user) {
      await message.reply(
        '❌ No account found. Please type "start" to create an account first.'
      );
      return;
    }

    const accountMessage = `👤 *Account Settings*

Hi ${user.full_name}! 👋

📊 *Your Account:*
- Name: ${user.full_name}
- Email: ${user.email}
- Phone: ${user.phone}
- Password: Set and secured ✅
${user.address ? `• Location: ${user.address}` : ""}

📱 *WhatsApp:* Linked ✅
🗓️ *Member Since:* ${moment(user.created_at).format("MMM YYYY")}

*What would you like to do?*
1️⃣ Update profile information
2️⃣ Change password
3️⃣ View account activity
4️⃣ Website login help
5️⃣ Back to main menu

Reply with a number or type "menu" to go back.`;

    await message.reply(accountMessage);
    session.step = "account_management";
  }

  async handleAccountManagement(message, session) {
    const input = message.body.toLowerCase().trim();

    if (input === "1" || input.includes("update")) {
      await this.handleProfileUpdate(message, session);
    } else if (input === "2" || input.includes("password")) {
      await this.handlePasswordReset(message, session);
    } else if (input === "3" || input.includes("activity")) {
      await this.showAccountActivity(message, session);
    } else if (
      input === "4" ||
      input.includes("website") ||
      input.includes("login")
    ) {
      await this.showWebsiteLoginHelp(message, session);
    } else if (input === "5" || input === "menu") {
      session.step = "main_menu";
      await this.handleGreeting(message, session);
    } else {
      await message.reply(
        'Please select 1, 2, 3, 4, 5, or type "menu" to go back.'
      );
    }
  }

  async showWebsiteLoginHelp(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    const loginHelpMessage = `🌐 *Website Access Help*

To access your account on our website:

🔗 *Website:* villagestay.com

📧 *Your Login Email:* ${user.email}

🔑 *Set Password:*
1. Go to villagestay.com
2. Click "Forgot Password"
3. Enter your email: ${user.email}
4. Check your email for password reset link
5. Create a secure password

✨ *Website Features:*
- Complete booking management
- Detailed booking history
- Profile customization
- Advanced search filters
- Host communication
- Reviews and ratings

💡 *Need help?* Contact support at ${this.config.adminPhone}

Type "menu" to return to main menu.`;

    await message.reply(loginHelpMessage);
  }

  async showAccountActivity(message, session) {
    try {
      const user = await this.getUserDetailsByWhatsApp(message.from);

      const bookingCount = await this.db
        .collection("bookings")
        .countDocuments({ tourist_id: user._id });
      const recentBookings = await this.db
        .collection("bookings")
        .find({ tourist_id: user._id })
        .sort({ created_at: -1 })
        .limit(3)
        .toArray();

      let activityMessage = `📊 *Account Activity*\n\n`;
      activityMessage += `👤 *${user.full_name}*\n`;
      activityMessage += `📅 *Member Since:* ${moment(user.created_at).format(
        "DD MMM YYYY"
      )}\n`;
      activityMessage += `📋 *Total Bookings:* ${bookingCount}\n`;
      activityMessage += `📱 *WhatsApp Linked:* ${moment(
        user.whatsapp_linked_at || user.created_at
      ).format("DD MMM YYYY")}\n\n`;

      if (recentBookings.length > 0) {
        activityMessage += `🔄 *Recent Bookings:*\n`;
        for (const booking of recentBookings) {
          const listing = await this.db
            .collection("listings")
            .findOne({ _id: booking.listing_id });
          activityMessage += `• ${listing?.title || "Property"} - ${moment(
            booking.created_at
          ).format("DD/MM/YY")}\n`;
        }
      } else {
        activityMessage += `🆕 *No bookings yet* - Ready for your first adventure?\n`;
      }

      activityMessage += `\nType "my bookings" to see all bookings\nType "menu" to return to main menu`;

      await message.reply(activityMessage);
    } catch (error) {
      console.error("Account activity error:", error);
      await message.reply("❌ Sorry, couldn't fetch account activity.");
    }
  }

  async handleDefault(message, session) {
    const helpMessage = `🤔 I didn't understand that. Here's what you can do:

📱 *Quick Commands:*
- "start" - Main menu
- "browse" - View listings
- "my bookings" - Your bookings
- "help" - Show this help
- "contact" - Emergency support

Or just tell me what you're looking for in natural language!

Examples:
- "Show me peaceful mountain retreats"
- "I want to learn pottery"
- "Family-friendly farmstays near Delhi"`;

    await message.reply(helpMessage);
    session.step = "main_menu";
  }

  async handleListingQuestions(message, session) {
    session.step = "ai_chat";
    const listingContext = `I'm asking about ${session.selectedListing.title} in ${session.selectedListing.location}. It's a ${session.selectedListing.property_type} that costs ₹${session.selectedListing.price_per_night} per night.`;

    const questionPrompt = `🤖 *Ask me anything about this property!*

${listingContext}

I can help with:
- Local attractions and activities
- Transportation options
- What to pack and bring
- Local customs and culture
- Weather and best time to visit
- Food and dining options

What would you like to know? 😊`;

    await message.reply(questionPrompt);
  }

  async showSimilarListings(message, session) {
    try {
      const currentListing = session.selectedListing;

      const similarListings = await this.db
        .collection("listings")
        .find({
          _id: { $ne: currentListing._id },
          $or: [
            { property_type: currentListing.property_type },
            {
              location: {
                $regex: currentListing.location.split(",")[0],
                $options: "i",
              },
            },
            {
              price_per_night: {
                $gte: currentListing.price_per_night - 500,
                $lte: currentListing.price_per_night + 500,
              },
            },
          ],
          is_active: true,
          is_approved: true,
        })
        .limit(4)
        .toArray();

      if (similarListings.length === 0) {
        await message.reply(
          'No similar listings found. Type "browse" to see all available properties.'
        );
        return;
      }

      session.currentListings = similarListings;
      await this.showListings(message, session);
    } catch (error) {
      console.error("Error showing similar listings:", error);
      await message.reply(
        'Sorry, couldn\'t find similar listings right now. Type "browse" to see all properties.'
      );
    }
  }

  setupScheduledTasks() {
    // Daily reminder task
    cron.schedule("0 9 * * *", () => {
      this.sendDailyReminders();
    });

    // Cleanup old sessions every hour
    cron.schedule("0 * * * *", () => {
      this.cleanupOldUserSessions();
    });

    console.log("✅ Scheduled tasks set up");
  }

  async sendDailyReminders() {
    try {
      const tomorrow = moment().add(1, "day").startOf("day").toDate();
      const dayAfter = moment().add(1, "day").endOf("day").toDate();

      const upcomingBookings = await this.db
        .collection("bookings")
        .find({
          check_in: { $gte: tomorrow, $lte: dayAfter },
          status: "confirmed",
        })
        .toArray();

      for (const booking of upcomingBookings) {
        const reminderMessage = `🔔 *Booking Reminder*

Your village experience starts tomorrow!

🏡 *${booking.guest_name}*, your booking is confirmed for tomorrow.

📋 *Details:*
- Check-in: ${moment(booking.check_in).format("DD/MM/YYYY")}
- Guests: ${booking.guests}
- Reference: ${booking.booking_reference}

💡 *Remember to:*
- Carry valid government ID
- Arrive on time for check-in
- Respect local customs

Safe travels! 🙏`;

        try {
          if (booking.tourist_phone) {
            await this.client.sendMessage(
              booking.tourist_phone,
              reminderMessage
            );
          }
        } catch (error) {
          console.error(
            `Failed to send reminder to ${booking.tourist_phone}:`,
            error
          );
        }
      }

      console.log(`📧 Sent ${upcomingBookings.length} booking reminders`);
    } catch (error) {
      console.error("Daily reminders error:", error);
    }
  }

  cleanupOldUserSessions() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    let cleanedCount = 0;
    for (const [userId, session] of this.userSessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.userSessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
    }
  }

  // Additional utility functions
  async handleCompleteProfile(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    if (!user) {
      await message.reply(
        "❌ No account found. Please create a booking first."
      );
      return;
    }

    if (!user.needs_profile_completion) {
      await message.reply(
        '✅ Your profile is already complete!\n\nType "account" to see details.'
      );
      return;
    }

    const profileMessage = `👤 *Complete Your Profile*

Let's upgrade your account for the full VillageStay experience!

Current details:
📱 Phone: ${user.phone}
👤 Name: ${user.full_name}

Please provide your *Email Address*:
(This will be your login for the website)`;

    await message.reply(profileMessage);
    session.step = "profile_completion";
    session.profileStep = "email";
  }

  async handleProfileCompletion(message, session) {
    const input = message.body.trim();

    switch (session.profileStep) {
      case "email":
        if (!this.isValidEmail(input)) {
          await message.reply("❌ Please enter a valid email address");
          return;
        }

        // Check if email already exists
        const user = await this.getUserDetailsByWhatsApp(message.from);
        const existingUser = await this.db.collection("users").findOne({
          email: input,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          await message.reply(
            `❌ Email ${input} is already registered.\n\nTry a different email or type "link ${input}" to link accounts.`
          );
          return;
        }

        session.profileData = { email: input };
        session.profileStep = "name";
        await message.reply("*Your Full Name:*");
        break;

      case "name":
        if (input.length < 2) {
          await message.reply(
            "❌ Please enter your full name (at least 2 characters)"
          );
          return;
        }

        session.profileData.full_name = input;
        session.profileStep = "location";
        await message.reply(
          '*Your City/Location:* (Optional - helps with recommendations)\n\nType "skip" to skip this.'
        );
        break;

      case "location":
        session.profileData.address = input === "skip" ? "" : input;
        await this.completeUserProfile(message, session);
        break;
    }
  }

  async completeUserProfile(message, session) {
    try {
      const user = await this.getUserDetailsByWhatsApp(message.from);

      if (!user) {
        await message.reply("❌ Error finding your account. Please try again.");
        return;
      }

      // Update user profile
      await this.db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            email: session.profileData.email,
            full_name: session.profileData.full_name,
            address: session.profileData.address,
            is_temporary_account: false,
            needs_profile_completion: false,
            profile_completed_at: new Date(),
            updated_at: new Date(),
          },
        }
      );

      // Update existing bookings with new details
      await this.db.collection("bookings").updateMany(
        { tourist_id: user._id },
        {
          $set: {
            guest_name: session.profileData.full_name,
            guest_email: session.profileData.email,
            updated_at: new Date(),
          },
        }
      );

      const successMessage = `🎉 *Profile Completed Successfully!*

✅ Your account has been upgraded!

👤 *Updated Details:*
- Name: ${session.profileData.full_name}
- Email: ${session.profileData.email}
- Phone: ${user.phone}
${
  session.profileData.address
    ? `• Location: ${session.profileData.address}`
    : ""
}

🔗 *What's New:*
- Email confirmations for bookings
- Website access with login
- Complete booking history
- Personalized recommendations

💡 *Next Steps:*
1. Visit our website: villagestay.com
2. Use "Forgot Password" with your email
3. Set a secure password
4. Access your full dashboard

Type "my bookings" to see your updated bookings!`;

      await message.reply(successMessage);

      session.step = "main_menu";
      delete session.profileData;
      delete session.profileStep;
    } catch (error) {
      console.error("Profile completion error:", error);
      await message.reply(
        "❌ Sorry, failed to complete profile. Please try again."
      );
    }
  }

  async handleProfileUpdate(message, session) {
    const user = await this.getUserDetailsByWhatsApp(message.from);

    const updateMessage = `✏️ *Update Profile Information*

Current details:
👤 Name: ${user.full_name}
📧 Email: ${user.email}
📱 Phone: ${user.phone}
📍 Location: ${user.address || "Not set"}

What would you like to update?
1️⃣ Name
2️⃣ Email  
3️⃣ Location
4️⃣ Back to account menu

Reply with a number.`;

    await message.reply(updateMessage);
    session.step = "profile_update";
  }

  // Utility functions
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}

// Start the bot
console.log("🚀 Starting VillageStay WhatsApp Bot...");
const bot = new VillageStayBot();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down bot...");
  if (bot.mongoClient) {
    await bot.mongoClient.close();
    console.log("✅ MongoDB connection closed");
  }
  if (bot.client) {
    await bot.client.destroy();
    console.log("✅ WhatsApp client destroyed");
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.log("🔄 Restarting bot...");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// Auto-restart mechanism
process.on("exit", (code) => {
  console.log(`Process exited with code: ${code}`);
});

module.exports = VillageStayBot;
