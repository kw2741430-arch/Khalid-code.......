// استيراد المكتبات
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// قراءة المتغيرات السرية (هنحطها في Vercel)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// تهيئة عميل Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// تهيئة البوت (بنستخدمه بس عشان نبعت الرسايل)
const bot = new TelegramBot(TOKEN);

// دي الدالة الأساسية اللي Vercel هيشغلها
module.exports = async (request, response) => {
  try {
    // الـ request.body بيحتوي على الرسالة اللي جاية من تيليجرام
    const { message } = request.body;

    // لو مفيش رسالة أو مفيش نص (زي صورة أو ستيكر)
    if (!message || !message.text) {
      return response.status(200).send('OK');
    }

    // استخراج البيانات المهمة من الرسالة
    const { text } = message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name;
    const username = message.from.username;

    // ---- 1. حساب عدد الحروف ----
    const charCount = text.length;

    // ---- 2. تسجيل المستخدم في Supabase ----
    // upsert: لو المستخدم موجود هيعدل بياناته، لو مش موجود هيضيفه
    const { error: userError } = await supabase
      .from('users')
      .upsert({ 
        user_id: userId, 
        first_name: firstName, 
        username: username 
      });

    if (userError) throw userError;

    // ---- 3. تسجيل الرسالة في Supabase ----
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        message_text: text,
        char_count: charCount
      });

    if (messageError) throw messageError;

    // ---- 4. الرد على المستخدم ----
    const replyMessage = `رسالتك فيها ${charCount} حرف، واتسجلت في قاعدة البيانات! 👍`;
    await bot.sendMessage(chatId, replyMessage);

    // إرسال رد 200 لتيليجرام عشان يعرف إننا استلمنا الرسالة
    response.status(200).send('OK');

  } catch (error) {
    console.error('Error handling message:', error.message);
    // إرسال رد 200 برضه عشان تيليجرام ميفضلش يبعت نفس الرسالة تاني
    response.status(200).send('Error processing');
  }
};
