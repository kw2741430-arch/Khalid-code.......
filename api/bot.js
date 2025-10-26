const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// --- المتغيرات السرية (Environment Variables) ---
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// --- التهيئة ---
const bot = new TelegramBot(TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

// استخدام middleware لقراءة JSON
app.use(express.json());

// --- [ ✨✨ الـــحـــل هـــنـــا ✨✨ ] ---
// استبدل app.post('/', ...) بـ app.post('/*', ...)
// علامة (*) معناها "استقبل أي مسار يجيلك طالما هو POST"
// Vercel هيضمن أصلاً إن مفيش حاجة هتوصل للملف ده غير /api/bot
app.post('/*', async (req, res) => {
  try {
    // دلوقتي req.body هتكون مقروءة ومفهومة
    const { message } = req.body;

    // لو مفيش رسالة أو نص
    if (!message || !message.text) {
      return res.status(200).send('OK (No text message)');
    }

    // --- باقي الكود زي ما هو ---

    // استخراج البيانات
    const { text } = message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name;
    const username = message.from.username;

    // 1. حساب عدد الحروف
    const charCount = text.length;

    // 2. تسجيل المستخدم في Supabase (upsert)
    const { error: userError } = await supabase
      .from('users')
      .upsert({ 
        user_id: userId, 
        first_name: firstName, 
        username: username 
      });

    if (userError) throw userError;

    // 3. تسجيل الرسالة في Supabase
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        message_text: text,
        char_count: charCount
      });

    if (messageError) throw messageError;

    // 4. الرد على المستخدم
    const replyMessage = `رسالتك فيها ${charCount} حرف، واتسجلت في قاعدة البيانات! 👍`;
    await bot.sendMessage(chatId, replyMessage);

    // إرسال رد 200 لتيليجرام
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling message:', error.message);
    res.status(200).send('Error processing');
  }
});

// تصدير التطبيق لـ Vercel
module.exports = app;
